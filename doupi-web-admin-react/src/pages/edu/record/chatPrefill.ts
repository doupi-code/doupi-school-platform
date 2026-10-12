export interface SourceMessage {
  id: string; sender?: string; time?: string; text: string; type?: string; order?: number;
}
export interface PrintCandidate {
  taskId?: string; sender?: string; printName?: string; originalDocName?: string;
  timeSnippet?: string; time?: string; teacherId?: number | string; teacherName?: string;
  teacherMatched?: boolean; grade?: string; subject?: string; classId?: number | string; className?: string;
  printCount?: number | null; pageCount?: number | null; printSide?: string | null;
  sourcePageCount?: number; sourcePaperType?: string;
  paperType?: string; paperGoodsId?: number | string; paperGoodsName?: string;
  remark?: string; attachment?: string; resultImg?: string; attachmentStatus?: string;
  alreadyRegistered?: boolean; existingPrintId?: number; existingRecordDesc?: string;
  sourceMessageIds?: string[]; fieldEvidence?: Record<string, string[]>; reviewReasons?: string[];
}
export interface PrefillResult extends PrintCandidate {
  taskList: PrintCandidate[]; messages?: SourceMessage[]; rawText?: string;
  firstUnregisteredIndex?: number; documentList?: string[]; success?: boolean; msg?: string;
}
export interface UploadedAttachment {
  name: string; url?: string; status: string; pageCount?: number; sourcePaperType?: string;
}
export function htmlToChatText(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  const doc = template.content;
  doc.querySelectorAll('script,style,iframe,object,embed,noscript').forEach(node => node.remove());
  doc.querySelectorAll('br').forEach(node => node.replaceWith('\n'));
  doc.querySelectorAll('p,div,li,tr,section').forEach(node => node.append('\n'));
  return (doc.textContent || '').replace(/\u00a0/g, ' ').replace(/\n[ \t]+/g, '\n').trim();
}
export function readChatClipboard(cd: DataTransfer) {
  const files = Array.from(cd.files || []);
  if (!files.length) for (const item of Array.from(cd.items || [])) {
    if (item.kind === 'file') { const f = item.getAsFile(); if (f) files.push(f); }
  }
  const read = (type: string) => { try { return cd.getData(type) || ''; } catch { return ''; } };
  const plain = read('text/plain');
  const html = read('text/html');
  const rich = html ? htmlToChatText(html) : '';
  const timestamps = (text: string) => (text.match(/\d{1,2}:\d{2}/g) || []).length;
  // Some clipboard providers offer filenames as plain text and the actual conversation as HTML.
  const text = !plain.trim() || timestamps(rich) > timestamps(plain) ? rich || plain : plain;
  return { text, files, plain, html, types: Array.from(cd.types || []),
    items: Array.from(cd.items || []).map(item=>({kind:item.kind,type:item.type})) };
}
export const isDocument = (f: File) => /\.(docx?|docm|pdf|wps|xlsx?|xlsm|pptx?|pptm|txt|zip|rar|7z)$/i.test(f.name);
// Invoke during the paste gesture, before queued uploads consume user activation.
// Windows may expose CF_HDROP files in the paste event but text only via Clipboard API.
export async function recoverChatClipboard(snapshot: {text:string; files:File[]}, clipboard?: {
  readText?: () => Promise<string>;
  read?: () => Promise<readonly ClipboardItem[]>;
}) {
  const recoveryNotes:string[]=[];
  if (snapshot.text.trim() || !snapshot.files.some(isDocument) || !clipboard) return {...snapshot,recoveryNotes:[snapshot.text.trim()?'事件已包含文字，无需补读':!clipboard?'浏览器未提供 Clipboard API':'无文档文件，不补读剪贴板']};
  try {
    const text = await clipboard.readText?.();
    recoveryNotes.push(`Clipboard.readText: ${text?.length ?? 0} 字符`);
    if (text?.trim()) return {...snapshot, text,recoveryNotes};
  } catch (error) { recoveryNotes.push(`Clipboard.readText 失败: ${error instanceof Error?error.message:String(error)}`); }
  try {
    for (const item of await clipboard.read?.() || []) {
      for (const type of ['text/plain', 'text/html']) {
        if (!item.types.includes(type)) continue;
        const blob = await item.getType(type);
        const value = await blob.text();
        const text = type === 'text/html' ? htmlToChatText(value) : value;
        recoveryNotes.push(`Clipboard.read ${type}: ${text.length} 字符`);
        if (text.trim()) return {...snapshot, text,recoveryNotes};
      }
    }
  } catch (error) { recoveryNotes.push(`Clipboard.read 失败: ${error instanceof Error?error.message:String(error)}`); }
  return {...snapshot,recoveryNotes};
}
export function fileCandidates(files: File[], batch: string): PrintCandidate[] {
  return files.filter(isDocument).map((f, i) => ({
    taskId: `${batch}:file:${i}`, originalDocName: f.name, printName: f.name.replace(/\.[^.]+$/, ''),
    attachmentStatus: 'missing', sourceMessageIds: [],
    reviewReasons: ['未取得聊天文字，请填写未知信息'],
  }));
}
const filenameKey = (s?: string) => (s || '').trim().normalize('NFC');
export function attachmentNameMatches(uploaded: string, original?: string) {
  const key = (s?: string) => filenameKey(s).replace(/\s*(\.[^.]+)$/, '$1');
  return key(uploaded) === key(original) || key(uploaded).replace(/\s*\(\d+\)(\.[^.]+)$/, '$1') === key(original);
}
export function attachFiles(tasks: PrintCandidate[], files: UploadedAttachment[]): PrintCandidate[] {
  return tasks.map(task => {
    const matches = files.filter(f => attachmentNameMatches(f.name, task.originalDocName));
    if (!matches.length) return task;
    if (matches.length !== 1 || tasks.filter(t => filenameKey(t.originalDocName) === filenameKey(task.originalDocName)).length !== 1) {
      return { ...task, attachmentStatus: 'ambiguous', reviewReasons: [...(task.reviewReasons || []), '同名附件无法唯一关联，请手动选择'] };
    }
    const f = matches[0];
    return { ...task, attachment: task.attachment || f.url, attachmentStatus: f.status,
      sourcePageCount:f.pageCount, sourcePaperType:f.sourcePaperType };
  });
}
export function dayKey(time?: string) {
  const match = time?.match(/(\d{4})[年/.-]\s*(\d{1,2})[月/.-]\s*(\d{1,2})/);
  return match ? `${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}` : undefined;
}
export function messagesForDay(messages: SourceMessage[], task: PrintCandidate) {
  const day = dayKey(task.timeSnippet);
  return day ? messages.filter(m => dayKey(m.time) === day) : messages;
}
export function namespaceResult(result: PrefillResult, batch: string): PrefillResult {
  const id = (value: string) => `${batch}:${value}`;
  return { ...result, messages: (result.messages || []).map(m=>({...m,id:id(m.id)})),
    taskList: (result.taskList || []).map((t,i)=>({...t, taskId:id(t.taskId || `task${i}`),
      sourceMessageIds:(t.sourceMessageIds || []).map(id),
      fieldEvidence:Object.fromEntries(Object.entries(t.fieldEvidence || {}).map(([key,values])=>[key,values.map(id)])) })) };
}
export function mergeSessions(previous: PrefillResult | null, incoming: PrefillResult): PrefillResult {
  if (!previous) return incoming;
  return {...previous, taskList:[...previous.taskList,...incoming.taskList],
    messages:[...(previous.messages || []),...(incoming.messages || [])],
    rawText:[previous.rawText,incoming.rawText].filter(Boolean).join('\n\n')};
}
