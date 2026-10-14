import {memo,useEffect,useMemo,useRef} from 'react';
import {Button} from 'antd';
import type {PrefillResult,PrintCandidate} from './chatPrefill';
import {dayKey,messagesForDay} from './chatPrefill';
function ChatSourcePanel({result,task,onOpenFile}:{result:PrefillResult;task:PrintCandidate;onOpenFile?:()=>void}) {
  const panel=useRef<HTMLElement>(null);
  const day=dayKey(task.timeSnippet);
  const messages=useMemo(()=>messagesForDay(result.messages || [],task),[result.messages,task.sourceConversationId,day]);
  const related=new Set(task.sourceMessageIds || []);
  const locate=()=>{
    const container=panel.current;
    const first=container?.querySelector<HTMLElement>('[data-current-message="true"]');
    if(container && first) container.scrollTo({top:container.scrollTop+first.getBoundingClientRect().top-container.getBoundingClientRect().top-75,behavior:'smooth'});
  };
  useEffect(()=>{locate();},[task.taskId]);
  return <aside ref={panel} style={{width:360,flexShrink:0,position:'sticky',top:0,maxHeight:'65vh',overflowY:'auto',padding:12,background:'#fafafa',border:'1px solid #eee',borderRadius:8}}>
    <div style={{position:'sticky',top:-12,background:'#fafafa',padding:'8px 0',zIndex:1}}>
      <strong>{task.sourceConversationName ? `${task.sourceConversationName} · ` : ''}{day ? `${day} · 当天全部聊天` : '日期暂未确定 · 本次聊天原文'}</strong>
      <Button size="small" disabled={!messages.some(m=>related.has(m.id))} onClick={locate} style={{marginTop:6}}>定位当前记录</Button>
    </div>
    {messages.map(m=><div key={m.id} data-current-message={related.has(m.id)} style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',padding:10,marginTop:8,borderRadius:6,background:related.has(m.id)?'#e6f4ff':'white',border:related.has(m.id)?'2px solid #1677ff':'1px solid #eee'}}>
      <div style={{fontSize:12,color:'#666'}}>{m.sender} {m.time}</div>
      <div>{m.text}</div>
      {related.has(m.id) && m.text.includes('[文件]') && onOpenFile && (
        <Button size="small" type="link" style={{padding:0,marginTop:4}} onClick={onOpenFile}>
          📄 快速打开原稿附件
        </Button>
      )}
    </div>)}
    {!messages.length && <pre style={{whiteSpace:'pre-wrap'}}>{day?'本次导入中没有该日期的聊天原文。':result.rawText || '本次仅取得附件，没有聊天原文。'}</pre>}
  </aside>;
}

export default memo(ChatSourcePanel);
