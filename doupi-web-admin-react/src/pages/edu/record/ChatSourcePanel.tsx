import { useState } from 'react';
import { Alert, Button, Select, Tag } from 'antd';
import type { PrefillResult, PrintCandidate, UploadedAttachment } from './chatPrefill';
import { dayKey, messagesForDay } from './chatPrefill';

export default function ChatSourcePanel({ result, task, files, onAttachment }: {
  result: PrefillResult; task: PrintCandidate; files: UploadedAttachment[];
  onAttachment: (file: UploadedAttachment) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const messages = showAll ? result.messages || [] : task.sourceMessageIds?.length ? messagesForDay(result.messages || [], task) : [];
  const evidence = new Set(task.sourceMessageIds || []);
  const labels: Record<string,string> = { printName:'材料', printCount:'份数', pageCount:'页数', printSide:'单双面', paperType:'纸张', remark:'备注' };
  return <aside style={{width:360, flexShrink:0, position:'sticky',top:0, maxHeight:'70vh',overflowY:'auto',padding:12,background:'#fafafa',border:'1px solid #eee',borderRadius:8}}>
    <strong>{dayKey(task.timeSnippet) || '时间未识别'} · 当天全部聊天</strong>
    <div style={{margin:'8px 0'}}>蓝色为当前任务的依据，其他消息保留供对照。</div>
    {!!task.reviewReasons?.length && <Alert type="warning" title={task.reviewReasons.join('；')} style={{marginBottom:8}} />}
    {task.existingRecordDesc && <Alert type="warning" title={task.existingRecordDesc} description="请核对是否已经登记，本次不会自动跳过。" />}
    {!messages.length && <Alert type="info" title="未取得聊天文字" description={task.originalDocName || '请手动填写未知信息'} />}
    {task.attachmentStatus === 'ambiguous' && <Select style={{width:'100%',margin:'8px 0'}} placeholder="选择当前材料对应的附件"
      options={files.filter(f=>f.url).map((f,i)=>({value:i,label:`${f.name} (${i+1})`}))}
      onChange={i=>onAttachment(files.filter(f=>f.url)[i])} />}
    {messages.map(m=><div key={m.id} style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',padding:10,marginTop:8,borderRadius:6,background:evidence.has(m.id)?'#e6f4ff':'white',border:evidence.has(m.id)?'1px solid #91caff':'1px solid #eee'}}>
      <div style={{fontSize:12,color:'#666'}}>{m.sender || '发送人未识别'} · {m.time || '时间未识别'}</div>
      {m.text}
      <div>{Object.entries(task.fieldEvidence || {}).filter(([key,ids])=>labels[key] && ids.includes(m.id)).map(([key])=><Tag key={key} color="blue">{labels[key]}依据</Tag>)}</div>
    </div>)}
    <Button type="link" onClick={()=>setShowAll(!showAll)}>{showAll?'仅看当天全部聊天':'查看本次全部聊天（含时间未识别消息）'}</Button>
    {showAll && !result.messages?.length && <pre style={{whiteSpace:'pre-wrap'}}>{result.rawText}</pre>}
  </aside>;
}
