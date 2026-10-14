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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: compact ? 4 : 8 }}>
        {compact && (
          <span style={{ fontSize: 11, color: '#595959', fontWeight: 600 }}>
            待登记候选任务（共 {tasks.length} 条，当前第 {selected + 1} 条）:
          </span>
        )}
        {tasks.length > pageSize && (
          <Pagination
            size="small"
            simple
            current={currentPage}
            pageSize={pageSize}
            total={tasks.length}
            showSizeChanger={false}
            onChange={setPage}
            style={{ margin: 0, lineHeight: '20px', marginLeft: 'auto' }}
          />
        )}
      </div>
      <div
        style={{
          maxHeight: compact ? 72 : 260,
          overflowY: compact ? 'hidden' : 'auto',
          overflowX: compact ? 'auto' : undefined,
          display: compact ? 'flex' : 'grid',
          gap: 6,
          marginBottom: compact ? 6 : 12,
        }}
      >
        {tasks.slice(start, start + pageSize).map((originalTask, offset) => {
          const i = start + offset;
          const task = i === selected && selectedFields ? {...originalTask, ...selectedFields} : originalTask;
          const fields = derivePrintFields(task);
          const isLocked = Boolean(disabled || task.alreadyRegistered || task.skipped);
          const contactLabel = task.sourceConversationName || task.sender;
          const attachmentTag = task.attachment ? (
            <Tag color="blue" style={{ margin: 0, padding: '0 4px', fontSize: 11 }}>已有附件</Tag>
          ) : ['ready','matched'].includes(task.attachmentStatus || '') && task.attachmentRelativePath ? (
            <Tag color="cyan" style={{ margin: 0, padding: '0 4px', fontSize: 11 }}>已关联导出附件</Tag>
          ) : task.attachmentStatus === 'failed' ? (
            <Tag color="error" style={{ margin: 0, padding: '0 4px', fontSize: 11 }}>附件上传失败</Tag>
          ) : task.attachmentStatus === 'missing' && (task.exportMediaError || task.sourceConversationId) ? (
            <Tag color="warning" style={{ margin: 0, padding: '0 4px', fontSize: 11 }}>附件缺失</Tag>
          ) : (
            <Tag style={{ margin: 0, padding: '0 4px', fontSize: 11 }}>附件未取得</Tag>
          );

          return (
            <div
              key={task.taskId || i}
              style={{
                textAlign: 'left',
                padding: compact ? '4px 8px' : 8,
                flex: compact ? '1 0 210px' : undefined,
                overflow: compact ? 'hidden' : undefined,
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
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <strong style={{ fontSize: compact ? 12 : 13 }}>
                      #{i + 1} {task.printName || '材料名称待填写'}
                    </strong>{' '}
                    {contactLabel && <Tag style={{ margin: '0 2px', padding: '0 3px', fontSize: 10 }}>{contactLabel}</Tag>}
                    <span style={{ fontSize: 11, color: '#666' }}>{task.timeSnippet || '时间未知'}</span>
                  </div>
                  <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <Tag style={{ margin: 0, padding: '0 4px', fontSize: 11 }}>{task.printCount == null ? '份数未知' : `${task.printCount}份`}</Tag>
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
