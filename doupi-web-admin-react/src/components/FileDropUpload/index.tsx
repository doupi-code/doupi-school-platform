import React, { useRef, useState } from 'react';
import { Button, message, Space, Spin, Typography } from 'antd';
import {
  InboxOutlined,
  FileImageOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { uploadFile, uploadFileSmart, ocrParse } from '@/api/edu/record';

const { Text } = Typography;

interface FileDropUploadProps {
  value?: string;
  fileName?: string;
  onChange?: (url: string, name?: string) => void;
  onOcrSuccess?: (ocrResult: any) => void;
  enableOcr?: boolean;
  disabled?: boolean;
}

const FileDropUpload: React.FC<FileDropUploadProps> = ({
  value,
  fileName,
  onChange,
  onOcrSuccess,
  enableOcr = false,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleProcessFile = async (file: File) => {
    if (!file) return;

    // 校验文件格式和大小
    const isImage = file.type.startsWith('image/');
    if (!isImage && !file.name.endsWith('.pdf')) {
      message.error('仅支持图片或 PDF 格式文件');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      message.error('文件大小不能超过 20MB');
      return;
    }

    setUploading(true);
    try {
      // 智能秒传上传
      const uploadRes: any = await uploadFileSmart(file);
      const url = uploadRes.url || uploadRes.fileName || '';
      if (uploadRes.deduplicated) {
        message.success('⚡ 检测到相同文件，已直接复用（秒传成功）！');
      } else {
        message.success('文件上传成功！');
      }
      onChange?.(url, file.name);

      // 如果启用了智能 OCR，同时触发后端离线 OCR 解析
      if (enableOcr && isImage) {
        message.loading({ content: '正在智能识别微信截图内容...', key: 'ocr' });
        try {
          const ocrFormData = new FormData();
          ocrFormData.append('file', file);
          const ocrRes: any = await ocrParse(ocrFormData);
          message.success({ content: 'OCR 识别提取成功！已自动填充表单', key: 'ocr' });
          if (ocrRes && ocrRes.data) {
            onOcrSuccess?.(ocrRes.data);
          }
        } catch (ocrErr: any) {
          message.warning({
            content: '图片上传成功，但 OCR 未能识别到完整文印信息，请手动核对',
            key: 'ocr',
          });
        }
      }
    } catch (e: any) {
      message.error(e.message || '上传失败，请重试');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || uploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled || uploading) return;
    if (e.clipboardData && e.clipboardData.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            message.info('检测到剪贴板截图，正在自动上传并识别...');
            handleProcessFile(file);
            break;
          }
        }
      }
    }
  };

  const handleRemove = () => {
    onChange?.('', '');
  };

  return (
    <div style={{ width: '100%' }}>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*,.pdf"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleProcessFile(e.target.files[0]);
          }
        }}
      />

      {!value ? (
        <div
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onPaste={handlePaste}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          style={{
            border: isDragOver ? '2px dashed #1677FF' : '2px dashed #d9d9d9',
            borderRadius: 8,
            backgroundColor: isDragOver ? '#F0F5FF' : '#fafafa',
            padding: '36px 20px',
            textAlign: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
            outline: 'none',
          }}
        >
          {uploading ? (
            <Spin tip="正在处理上传与智能解析中..." />
          ) : (
            <>
              <InboxOutlined style={{ fontSize: 48, color: '#1677FF', marginBottom: 12 }} />
              <div>
                <Text strong style={{ fontSize: 16 }}>
                  点击选择文件，或直接将文件拖拽至此处
                </Text>
              </div>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  支持 <span style={{ color: '#1677FF', fontWeight: 'bold' }}>Ctrl + V 直接粘贴</span> 微信聊天截图（自动触发 OCR 提取）
                </Text>
              </div>
            </>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            border: '1px solid #d9d9d9',
            borderRadius: 8,
            backgroundColor: '#fff',
          }}
        >
          <Space>
            <FileImageOutlined style={{ fontSize: 24, color: '#52c41a' }} />
            <div>
              <Text strong>{fileName || '已上传微信截图附件'}</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ✓ 文件已准备就绪
                </Text>
              </div>
            </div>
          </Space>

          <Space>
            {value && (
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                href={value}
                target="_blank"
              >
                预览原图
              </Button>
            )}
            {!disabled && (
              <>
                <Button
                  type="link"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  重新选择
                </Button>
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleRemove}
                >
                  删除
                </Button>
              </>
            )}
          </Space>
        </div>
      )}
    </div>
  );
};

export default FileDropUpload;
