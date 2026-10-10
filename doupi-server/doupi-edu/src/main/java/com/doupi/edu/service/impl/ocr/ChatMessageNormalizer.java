package com.doupi.edu.service.impl.ocr;

import com.doupi.edu.domain.dto.EduPrintOcrResult.SourceMessage;
import java.util.*;
import java.util.regex.Pattern;

/** Text ingestion only: preserve message bodies; timestamps and senders are metadata. */
public final class ChatMessageNormalizer {
    private ChatMessageNormalizer() {}
    private static final Pattern TIME = Pattern.compile("^(?:\\d{4}[年/.-]\\s*\\d{1,2}[月/.-]\\s*\\d{1,2}[日号]?|\\d{1,2}月\\d{1,2}日|今天|昨天|前天|星期[一二三四五六日天])?\\s*(?:上午|下午|晚上)?\\s*\\d{1,2}:\\d{2}\\s*$");
    private static final Pattern FILE = Pattern.compile("(?i)^.+\\.(?:docx?|docm|pdf|wps|xlsx?|xlsm|pptx?|pptm|txt|zip|rar|7z)\\s*$");
    public static boolean isFile(String text) { return text.startsWith("[文件]") || text.startsWith("【文件】") || FILE.matcher(text).matches(); }
    public static String fileName(String text) { return text.replaceFirst("^(?:\\[文件\\]|【文件】|文件[:：]|附件[:：])\\s*", "").trim(); }

    public static List<SourceMessage> normalize(String text) {
        List<SourceMessage> result = new ArrayList<>();
        String[] lines = text.replace("\r\n", "\n").replace('\r', '\n').split("\n");
        String sender = null, time = null;
        StringBuilder body = new StringBuilder();
        boolean structured = false;
        for (int i=0; i<lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;
            int next = i+1;
            while (next<lines.length && lines[next].isBlank()) next++;
            if (next<lines.length && TIME.matcher(lines[next].trim()).matches() && !isFile(line) && !TurnIntentResolver.isConversationalNoise(line)
                    && !line.matches(".*(?:份|打印|帮忙|单面|双面).*")) {
                add(result, body.toString(), sender, time);
                body.setLength(0);
                sender = line; time = lines[next].trim(); i = next; structured = true;
            } else if (TIME.matcher(line).matches()) {
                add(result, body.toString(), sender, time); body.setLength(0); time = line;
            } else if (structured) {
                if (!body.isEmpty()) body.append('\n');
                body.append(line);
            } else {
                // OCR / manually pasted text without sender-time envelopes.
                add(result, line, sender, time);
            }
        }
        add(result, body.toString(), sender, time);
        return result;
    }

    private static void add(List<SourceMessage> out, String body, String sender, String time) {
        if (body.isBlank()) return;
        if (body.contains("\n")) {
            // Plain copies can omit repeated envelopes. Do not let a file swallow following instructions.
            String previousFile = null;
            for (String line : body.split("\n")) {
                if (previousFile != null && (line.trim().equals(previousFile) || line.matches("(?i)^[0-9.]+\\s*(?:KB|MB|GB|K|M)$"))) continue;
                add(out, line, sender, time);
                previousFile = isFile(line) ? fileName(line) : null;
            }
            return;
        }

        // A copied card may repeat its filename below [文件]; retain raw body, classify first line.
        SourceMessage m = new SourceMessage();
        m.setOrder(out.size()); m.setId("m" + out.size()); m.setSender(sender); m.setTime(time);
        m.setText(body); m.setType(isFile(body.lines().findFirst().orElse("")) ? "file" : "text"); out.add(m);
    }
}
