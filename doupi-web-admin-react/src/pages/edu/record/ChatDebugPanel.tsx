import { Alert, Button, Modal, Select, Tabs } from 'antd';
import type { PrefillResult } from './chatPrefill';

export interface ChatDebugEntry {
  id: string; time: string; source: string; types: string[];
  items: {kind:string;type:string}[]; files: {name:string;type:string;size:number}[];
  plain: string; html: string; eventText: string; submittedText?: string;
  status: string; error?: string; result?: PrefillResult; recoveryNotes?:string[];
}
const display = (text: string) => <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'52vh',overflow:'auto',background:'#fafafa',padding:12}}>{text || '（空）'}</pre>;
export default function ChatDebugPanel({open, entries, selected, onSelect, onClose, onClear}: {
  open:boolean; entries:ChatDebugEntry[]; selected:string; onSelect:(id:string)=>void; onClose:()=>void; onClear:()=>void;
}) {
  const entry = entries.find(e=>e.id===selected) || entries[entries.length-1];
  return <Modal title="智能预填调试" open={open} onCancel={onClose} width={1000} style={{top:12,paddingBottom:0}} styles={{body:{maxHeight:'calc(100dvh - 140px)',overflowY:'auto'}}} footer={<Button onClick={onClear}>清空调试记录</Button>}>
    <p>仅保留本页最近 10 次导入。先核对粘贴原文，再核对送往后端的文字和后端结果；HTML 仅以文字展示。</p>
    <Select aria-label="选择调试记录" style={{width:'100%',marginBottom:12}} value={entry?.id} onChange={onSelect}
      options={entries.map(e=>({value:e.id,label:`${e.time} · ${e.source} · ${e.status}`}))} />
    {!entry ? <Alert title="尚未粘贴，请先导入聊天记录" /> : <>
      <Alert type={entry.error?'error':'info'} title={entry.error || entry.status} description={`事件文字 ${entry.eventText.length} 字符；送往后端 ${entry.submittedText?.length ?? 0} 字符；后端消息 ${entry.result?.messages?.length ?? 0} 条；候选 ${entry.result?.taskList?.length ?? 0} 条`} />
      <Tabs items={[
        {key:'event',label:'1. 粘贴收到的内容',children:<>
          {display(JSON.stringify({types:entry.types,items:entry.items,files:entry.files,recovery:entry.recoveryNotes},null,2))}
          <strong>text/plain 原文</strong>{display(entry.plain)}
          <strong>text/html 原文</strong>{display(entry.html)}
          <strong>从事件提取的聊天文字</strong>{display(entry.eventText)}
        </>},
        {key:'request',label:'2. 实际送往后端的文字',children:display(entry.submittedText ?? '')},
        {key:'messages',label:'3. 后端识别的聊天记录',children:display(JSON.stringify(entry.result?.messages ?? [],null,2))},
        {key:'result',label:'4. 后端候选结果',children:display(JSON.stringify(entry.result ?? {},null,2))},
      ]} />
    </>}
  </Modal>;
}
