import { useEffect, useState } from 'react';
import { Button, Pagination, Space, Tag } from 'antd';
import type { PrintCandidate } from './chatPrefill';
import { derivePrintFields } from './printRules';

export default function ChatCandidateList({
  tasks,
  selected,
  onSelect,
  onToggleSkip,
  onReprint,
  disabled = false,
  compact = false,
  selectedFields,
}: {
  tasks: PrintCandidate[];
  selected: number;
  onSelect: (index: number) => void;
  onToggleSkip?: (index: number) => void;
  onReprint?: (index: number) => void;
  disabled?: boolean;
  compact?: boolean;
  selectedFields?: Partial<PrintCandidate>;
}) {
  const pageSize = compact ? 4 : 50;
  const [page, setPage] = useState(Math.floor(selected / pageSize) + 1);
  useEffect(() => setPage(Math.floor(selected / pageSize) + 1), [selected, pageSize]);
  const currentPage = Math.max(1, Math.min(page, Math.ceil(tasks.length / pageSize)));
  const start = (currentPage - 1) * pageSize;
  return (
    <>
    {tasks.length > pageSize && <Pagination size="small" simple current={currentPage} pageSize={pageSize}
      total={tasks.length} showSizeChanger={false} onChange={setPage}
      style={{marginBottom:8}} />}
    <div
      style={{
        maxHeight: compact ? 108 : 260,
        overflowY: compact ? 'hidden' : 'auto',
        overflowX: compact ? 'auto' : undefined,
        display: compact ? 'flex' : 'grid',
        gap: 8,
        marginBottom: 12,
      }}
    >
      {tasks.slice(start, start + pageSize).map((originalTask, offset) => {
        const i = start + offset;
        const task = i === selected && selectedFields ? {...originalTask, ...selectedFields} : originalTask;
        const fields = derivePrintFields(task);
        const isLocked = Boolean(disabled || task.alreadyRegistered || task.skipped);
        const contactLabel = task.sourceConversationName || task.sender;
        const attachmentTag = task.attachment ? (
          <Tag color="blue">已有附件</Tag>
        ) : ['ready','matched'].includes(task.attachmentStatus || '') && task.attachmentRelativePath ? (
          <Tag color="cyan">已关联导出附件（保存时上传）</Tag>
        ) : task.attachmentStatus === 'failed' ? (
          <Tag color="error">附件上传失败</Tag>
        ) : task.attachmentStatus === 'missing' && (task.exportMediaError || task.sourceConversationId) ? (
          <Tag color="warning">附件缺失</Tag>
        ) : (
          <Tag>附件未取得</Tag>
        );

        return (
          <div
            key={task.taskId || i}
            style={{
              textAlign: 'left',
              padding: 8,
              flex: compact ? '1 0 230px' : undefined,
              overflow: compact ? 'auto' : undefined,
              border: `1px solid ${i === selected ? '#1677ff' : '#ddd'}`,
              borderRadius: 6,
              background: task.skipped ? '#f5f5f5' : i === selected ? '#e6f4ff' : 'white',
              opacity: task.skipped ? 0.65 : 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
              <div
                role="button"
                tabIndex={isLocked ? -1 : 0}
                aria-disabled={isLocked}
                onClick={() => {
                  if (!isLocked) onSelect(i);
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  cursor: isLocked ? 'default' : 'pointer',
                }}
              >
                <div>
                  <strong>
                    #{i + 1} {task.printName || '材料名称待填写'}
                  </strong>{' '}
                  {contactLabel && <Tag style={{ margin: '0 4px' }}>{contactLabel}</Tag>}
                  <span style={{ fontSize: 12, color: '#666' }}>{task.timeSnippet || '时间未知'}</span>
                </div>
                <div style={{ marginTop: 4 }}>
                  <Tag>{task.printCount == null ? '份数未知' : `${task.printCount}份`}</Tag>
                  {attachmentTag}
                  {task.skipped && <Tag color="default">已跳过／不登记</Tag>}
                  {task.alreadyRegistered && (
                    <Tag color="green">
                      {task.existingPrintId ? `已登记 #${task.existingPrintId}` : '本次已保存'}
                    </Tag>
                  )}
                  {!task.alreadyRegistered && task.reprintConfirmed && task.existingPrintId && (
                    <Tag color="geekblue">已选择重印（原单据 #{task.existingPrintId}）</Tag>
                  )}
                  {!task.alreadyRegistered && !task.reprintConfirmed && task.existingPrintId && (
                    <Tag color="orange">疑似已登记 #{task.existingPrintId}</Tag>
                  )}
                  {task.reviewReasons?.length ? (
                    <span style={{ color: '#ad6800' }}>
                      {task.reviewReasons
                        .filter((reason) => {
                          return (
                            !(reason === '单双面未知' && fields.printSide) &&
                            !(reason === '页数未知' && fields.pageCount) &&
                            !/^纸张.*未知$/.test(reason)
                          );
                        })
                        .join('；')}
                    </span>
                  ) : null}
                </div>
              </div>
              <Space size={4} style={{ flexShrink: 0 }}>
                {task.alreadyRegistered && task.existingPrintId && onReprint && (
                  <Button size="small" type="link" style={{ padding: 0 }} disabled={disabled} onClick={() => onReprint(i)}>
                    选择重印
                  </Button>
                )}
                {!task.alreadyRegistered && onToggleSkip && (
                  <Button size="small" type="link" style={{ padding: 0 }} disabled={disabled} onClick={() => onToggleSkip(i)}>
                    {task.skipped ? '恢复登记' : '跳过／不登记'}
                  </Button>
                )}
              </Space>
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}
