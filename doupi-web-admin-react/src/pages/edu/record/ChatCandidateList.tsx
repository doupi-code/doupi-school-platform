import { Tag } from 'antd';
import type { PrintCandidate } from './chatPrefill';

export default function ChatCandidateList({tasks, selected, onSelect, disabled=false}: {
  tasks: PrintCandidate[]; selected:number; onSelect:(index:number)=>void; disabled?:boolean;
}) {
  return <div style={{maxHeight:250,overflowY:'auto',display:'grid',gap:8,marginBottom:12}}>
    {tasks.map((task,i)=><button type="button" disabled={disabled || task.alreadyRegistered} key={task.taskId || i} onClick={()=>onSelect(i)}
      style={{textAlign:'left',padding:10,border:`1px solid ${i===selected?'#1677ff':'#ddd'}`,borderRadius:6,background:i===selected?'#e6f4ff':'white',cursor:'pointer'}}>
      <strong>#{i+1} {task.printName || '材料名称待填写'}</strong> <span>{task.timeSnippet || '时间未知'}</span>
      <div><Tag>{task.printCount == null?'份数未知':`${task.printCount}份`}</Tag>
        <Tag>{task.attachment ? '已有附件' : task.attachmentStatus==='failed'?'附件上传失败':'附件未取得'}</Tag>
        {task.alreadyRegistered && <Tag color="green">本次已保存</Tag>}
        {task.existingPrintId && <Tag color="orange">疑似已登记 #{task.existingPrintId}</Tag>}
        {task.reviewReasons?.length ? <span style={{color:'#ad6800'}}>{task.reviewReasons.join('；')}</span> : null}
      </div>
    </button>)}
  </div>;
}
