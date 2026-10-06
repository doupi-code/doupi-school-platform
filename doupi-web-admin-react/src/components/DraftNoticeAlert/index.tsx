import React from 'react';
import { Alert, Button, Popconfirm } from 'antd';
import { HistoryOutlined, ReloadOutlined, ClearOutlined } from '@ant-design/icons';

export interface DraftNoticeAlertProps {
  visible: boolean;
  timeText?: string;
  onDiscard: () => void;
  loading?: boolean;
  style?: React.CSSProperties;
  isEdit?: boolean;
  discardText?: string;
}

export const DraftNoticeAlert: React.FC<DraftNoticeAlertProps> = ({
  visible,
  timeText,
  onDiscard,
  loading = false,
  style,
  isEdit = false,
  discardText,
}) => {
  if (!visible) return null;

  // 根据是否为数据库已有记录动态区分文案与提示
  const buttonText = discardText || (isEdit ? '丢弃草稿，恢复数据库数据' : '丢弃草稿，清空表单');
  const confirmTitle = isEdit ? '确认丢弃未保存的修改？' : '确认丢弃未保存的内容？';
  const confirmDesc = isEdit
    ? '丢弃后将清除本地草稿，并重新刷新为数据库原本的数据。'
    : '丢弃后将清除本地草稿，并将表单刷新到未填写的初始空白状态。';

  return (
    <Alert
      type="warning"
      showIcon
      icon={<HistoryOutlined style={{ color: '#fa8c16', fontSize: 16 }} />}
      style={{
        marginBottom: 16,
        borderRadius: 6,
        border: '1px solid #ffe58f',
        backgroundColor: '#fffbe6',
        ...style,
      }}
      message={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 13, color: '#595959' }}>
            <span style={{ fontWeight: 600, color: '#d46b08' }}>
              已自动载入未保存的本地草稿
            </span>
            {timeText && (
              <span style={{ marginLeft: 6, color: '#8c8c8c' }}>
                （保存时间：{timeText}）
              </span>
            )}
            <span style={{ marginLeft: 8, color: '#595959' }}>
              即使误关弹窗或刷新页面内容也不会丢失。
            </span>
          </div>
          <Popconfirm
            title={confirmTitle}
            description={confirmDesc}
            okText="确定丢弃"
            cancelText="保留草稿"
            okButtonProps={{ danger: true }}
            onConfirm={onDiscard}
          >
            <Button
              size="small"
              danger
              icon={isEdit ? <ReloadOutlined /> : <ClearOutlined />}
              loading={loading}
              style={{ fontWeight: 500 }}
            >
              {buttonText}
            </Button>
          </Popconfirm>
        </div>
      }
    />
  );
};

export default DraftNoticeAlert;
