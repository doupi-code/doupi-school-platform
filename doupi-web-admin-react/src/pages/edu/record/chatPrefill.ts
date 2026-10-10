export interface SourceMessage {
  id: string; sender?: string; time?: string; text: string; type?: string; order?: number;
}
export interface PrintCandidate {
  taskId?: string; sender?: string; printName?: string; originalDocName?: string;
  timeSnippet?: string; time?: string; teacherId?: number | string; teacherName?: string;
  teacherMatched?: boolean; grade?: string; subject?: string; classId?: number | string; className?: string;
  printCount?: number | null; pageCount?: number | null; printSide?: string | null;
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
  return { text, files };
}
export const isDocument = (f: File) => /\.(docx?|docm|pdf|wps|xlsx?|xlsm|pptx?|pptm|txt|zip|rar|7z)$/i.test(f.name);
export function fileCandidates(files: File[], batch: string): PrintCandidate[] {
  return files.filter(isDocument).map((f, i) => ({
    taskId: `${batch}:file:${i}`, originalDocName: f.name, printName: f.name.replace(/\.[^.]+$/, ''),
    attachmentStatus: 'missing', sourceMessageIds: [],
    reviewReasons: ['未取得聊天文字，请填写未知信息'],
  }));
}
const filenameKey = (s?: string) => (s || '').trim().normalize('NFC');
export function attachFiles(tasks: PrintCandidate[], files: UploadedAttachment[]): PrintCandidate[] {
  return tasks.map(task => {
    const matches = files.filter(f => filenameKey(f.name) === filenameKey(task.originalDocName));
    if (!matches.length) return task;
    if (matches.length !== 1 || tasks.filter(t => filenameKey(t.originalDocName) === filenameKey(task.originalDocName)).length !== 1) {
      return { ...task, attachmentStatus: 'ambiguous', reviewReasons: [...(task.reviewReasons || []), '同名附件无法唯一关联，请手动选择'] };
    }
    const f = matches[0];
    return { ...task, attachment: task.attachment || f.url, attachmentStatus: f.status,
      pageCount: task.pageCount ?? f.pageCount, paperType: task.paperType || f.sourcePaperType };
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
