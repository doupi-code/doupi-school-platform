package com.doupi.edu.service.impl.ocr;

import com.doupi.edu.domain.dto.EduPrintOcrResult;
import com.doupi.edu.domain.dto.EduPrintOcrResult.PrintTaskItem;
import com.doupi.edu.domain.dto.EduPrintOcrResult.SourceMessage;
import java.util.*;
import java.util.regex.*;

/** Deterministic message-instance intent binding. Never invent registration defaults. */
public final class ChatPrefillParser {
    private ChatPrefillParser() {}
    private static final Pattern RANGE = Pattern.compile("(\\d+)\\s*[-—–~至到]\\s*(\\d+)\\s*页");
    public static EduPrintOcrResult parse(String text) {
        return parse(text, ChatMessageNormalizer.normalize(text == null ? "" : text));
    }
    public static EduPrintOcrResult parse(String text, List<SourceMessage> messages) {
        EduPrintOcrResult result = new EduPrintOcrResult();
        result.setRawText(text);
        result.setMessages(messages);
        List<PrintTaskItem> tasks = new ArrayList<>();
        Map<String, BindingContext> contexts = new HashMap<>();
        for (SourceMessage m : messages) {
            String day = m.getTime() == null ? "" : m.getTime().replaceFirst("\\s*(?:上午|下午|晚上)?\\s*\\d{1,2}:\\d{2}.*$", "");
            String key = String.valueOf(m.getSender()) + "|" + day;
            BindingContext binding = contexts.computeIfAbsent(key, ignored -> new BindingContext());
            String body = m.getText();
            if ("file".equals(m.getType())) {
                if (binding.afterDirective) { binding.files.clear(); binding.afterDirective=false; }
                PrintTaskItem task;
                if (binding.pending != null) { task=binding.pending; binding.pending=null; }
                else { task=create(m); tasks.add(task); }
                String name=ChatMessageNormalizer.fileName(body.lines().findFirst().orElse(body));
                if(name.matches("(?:次|[（(]2[）)])\\.docx?") && m.getOrder()>0) {
                    SourceMessage previous=messages.get(m.getOrder()-1);
                    if(previous.getText().length()<=40 && !previous.getText().matches(".*(?:份|打印|老师|谢谢).*")) {
                        name=previous.getText()+name.replaceFirst("^次", "（2）");
                        evidence(task,"printName",previous);
                        task.getReviewReasons().add("文件名由OCR折行推测，请核对");
                    }
                }
                task.setOriginalDocName(name); task.setPrintName(name.replaceFirst("\\.[^.]+$", ""));
                task.setAttachmentStatus("missing");
                evidence(task,"printName",m); binding.files.add(task);
                continue;
            }
            if ("operator".equals(m.getType()) || TurnIntentResolver.isConversationalNoise(body)) continue;
            Long count = TurnIntentResolver.parsePrintCount(RANGE.matcher(body).replaceAll(""));
            String side = body.matches(".*(?:双面|正反面|两面).*") ? "2" : body.contains("单面") ? "1" : null;
            Matcher range = RANGE.matcher(body);
            boolean hasRange = range.find();
            String paper = null;
            Matcher paperMatch=Pattern.compile("(?i)(?<![a-z0-9])(A[34]|8K|16K)(?![a-z0-9])").matcher(body);
            if(paperMatch.find()) paper=paperMatch.group(1).toUpperCase(Locale.ROOT);
            boolean special = body.matches("(?s).*(?:彩色|彩印|黑白|装订|订书|胶装|骑马钉|不要|取消|第[0-9]+页).*");
            Matcher pages = Pattern.compile("(?:每份|共|总共|一共)\\s*(\\d+)\\s*页").matcher(body);
            Long explicitPages = pages.find() ? Long.parseLong(pages.group(1)) : null;
            if (count==null && explicitPages==null && side==null && !hasRange && paper==null && !special && !body.matches("(?s).*(?:打印|帮忙打|帮我打).*")) continue;
            List<PrintTaskItem> targets = new ArrayList<>();
            boolean uncertain=false;
            if (body.matches("(?s).*(?:另外|其余|剩下).*")) {
                for(PrintTaskItem t:binding.files) if(!binding.targets.contains(t)) targets.add(t);
                int wanted=body.matches("(?s).*(?:两个|两份|2个).*" ) ? 2 : body.matches("(?s).*(?:另外个|另一个|另外一个).*" ) ? 1 : targets.size();
                uncertain=targets.size()!=wanted;
            } else if (body.contains("各") || body.contains("这两个") || body.contains("这些")) {
                targets.addAll(binding.files);
                if(body.contains("这两个") && targets.size()!=2) uncertain=true;
            } else if(!binding.files.isEmpty()) {
                // An unqualified instruction after a file group is a group suggestion, not a fact.
                if(binding.files.size()>1 && !body.matches("(?s).*(?:这个|这份|该|也是|又|再).*")) {
                    targets.addAll(binding.files); uncertain=true;
                } else targets.add(binding.files.get(binding.files.size()-1));
            }
            // A new preposed request followed immediately by a file, after a completed request.
            if(count!=null && body.matches("(?s).*(?:打印|打|印).*") && !body.matches("(?s).*(?:改成|改为|改打|改印|不是|还是|加印|追加).*") && m.getOrder()+1<messages.size()
                    && "file".equals(messages.get(m.getOrder()+1).getType())
                    && !targets.isEmpty() && targets.get(0).getPrintCount()!=null) {
                targets.clear(); uncertain=true;
            }
            // Named references beat proximity when the name uniquely identifies a current material.
            List<PrintTaskItem> named=new ArrayList<>();
            for(PrintTaskItem t:binding.files) if(t.getPrintName()!=null && body.contains(t.getPrintName())) named.add(t);
            if(named.size()==1) {targets=named; uncertain=false;}
            if(targets.isEmpty() && binding.pending != null && count == null) targets.add(binding.pending);
            if(targets.isEmpty()) {
                PrintTaskItem task=create(m); tasks.add(task); targets.add(task); binding.pending=task;
                task.getReviewReasons().add("缺少材料名称，请对照聊天填写");
            }
            for(PrintTaskItem task:targets) {
                if(uncertain) task.getReviewReasons().add("指令关联存在歧义，请确认对应材料");
                if(body.contains("昨天") || body.contains("上次")) task.getReviewReasons().add("涉及其他日期的材料，请确认");
                if(count!=null) {task.setPrintCount(count); evidence(task,"printCount",m);}
                if(side!=null && !body.matches("(?s).*第[0-9]+页.*")) {task.setPrintSide(side); evidence(task,"printSide",m);}
                if(explicitPages!=null) {task.setPageCount(explicitPages); evidence(task,"pageCount",m);}
                if(paper!=null) {task.setPaperType(paper); evidence(task,"paperType",m);}
                if(hasRange) {
                    long first=Long.parseLong(range.group(1)), last=Long.parseLong(range.group(2));
                    if(first>0 && last>=first) { task.setPageCount(last-first+1); evidence(task,"pageCount",m); }
                    else task.getReviewReasons().add("页码范围无效，请核对");
                }
                if(hasRange || special || body.contains("格式") || body.contains("替换") || body.contains("改用")) {
                    task.setRemark(task.getRemark()==null ? body : task.getRemark()+"；"+body); evidence(task,"remark",m);
                    if(body.contains("格式") || body.contains("替换") || body.contains("改用")) task.getReviewReasons().add("请确认是否替代之前的材料");
                    if(body.contains("取消") || body.contains("不要打印")) task.getReviewReasons().add("可能已取消打印，请核对后跳过或登记");
                }
                evidence(task,"instruction",m);
            }
            binding.targets=targets; binding.afterDirective=true;
        }
        for(PrintTaskItem task:tasks) {
            if(task.getOriginalDocName()!=null) task.getReviewReasons().remove("缺少材料名称，请对照聊天填写");
            if(task.getPrintCount()==null) task.getReviewReasons().add("份数未知");
            if(task.getPageCount()==null) task.getReviewReasons().add("页数未知");
            if(task.getPrintSide()==null) task.getReviewReasons().add("单双面未知");
        }
        result.setTaskList(tasks); result.setFirstUnregisteredIndex(0);
        if(!tasks.isEmpty()) {
            PrintTaskItem first=tasks.get(0);
            result.setPrintName(first.getPrintName()); result.setPrintCount(first.getPrintCount());
            result.setPageCount(first.getPageCount()); result.setPrintSide(first.getPrintSide());
            result.setPaperType(first.getPaperType()); result.setTimeSnippet(first.getTimeSnippet());
        }
        result.setDocumentList(tasks.stream().map(PrintTaskItem::getOriginalDocName).filter(Objects::nonNull).toList());
        result.setSuccess(!tasks.isEmpty());
        result.setMsg(tasks.isEmpty()?"未发现打印需求或材料":"请对照当天聊天逐条核对，未知信息已留空");
        return result;
    }
    private static class BindingContext {
        final List<PrintTaskItem> files = new ArrayList<>();
        List<PrintTaskItem> targets = new ArrayList<>();
        PrintTaskItem pending;
        boolean afterDirective;
    }
    private static PrintTaskItem create(SourceMessage m) {
        PrintTaskItem task=new PrintTaskItem(); task.setTaskId("task-"+m.getId()); task.setSender(m.getSender());
        task.setTimeSnippet(m.getTime()); task.setSourceMessageIds(new ArrayList<>());
        task.setFieldEvidence(new LinkedHashMap<>()); task.setReviewReasons(new ArrayList<>());
        task.setAttachmentStatus("missing"); return task;
    }
    private static void evidence(PrintTaskItem t,String field,SourceMessage m) {
        if(!t.getSourceMessageIds().contains(m.getId())) t.getSourceMessageIds().add(m.getId());
        t.getFieldEvidence().computeIfAbsent(field,k->new ArrayList<>()).add(m.getId());
    }
}
