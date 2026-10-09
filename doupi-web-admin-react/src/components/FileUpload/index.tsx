import React, { useRef, useState } from 'react';
import { Button, Input, message, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import {
  PaperClipOutlined,
  UploadOutlined,
  DeleteOutlined,
  ReloadOutlined,
  DownloadOutlined,
  LinkOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileImageOutlined,
  FileZipOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { uploadFile, uploadFileSmart } from '@/api/edu/record';

const { Text } = Typography;

export interface FileUploadProps {
  value?: string;
  fileName?: string;
  onChange?: (url: string, fileName?: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxSizeMB?: number;
  accept?: string;
  style?: React.CSSProperties;
  onUploadSuccess?: (url: string, fileName: string, file: File) => void;
}

// 根据文件拓展名判断文件类型与标签
export const detectFileType = (filename: string = '', mimeType: string = '') => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['doc', 'docx'].includes(ext)) {
    return { type: 'word', label: 'Word 文档', color: 'blue', icon: <FileWordOutlined style={{ fontSize: 24, color: '#1677FF' }} /> };
  }
  if (['pdf'].includes(ext)) {
    return { type: 'pdf', label: 'PDF 文件', color: 'red', icon: <FilePdfOutlined style={{ fontSize: 24, color: '#FF4D4F' }} /> };
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return { type: 'excel', label: 'Excel 表格', color: 'green', icon: <FileExcelOutlined style={{ fontSize: 24, color: '#52C41A' }} /> };
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return { type: 'ppt', label: 'PPT 演示', color: 'orange', icon: <FilePptOutlined style={{ fontSize: 24, color: '#FA8C16' }} /> };
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext) || mimeType.startsWith('image/')) {
    return { type: 'image', label: '图片原稿', color: 'cyan', icon: <FileImageOutlined style={{ fontSize: 24, color: '#13C2C2' }} /> };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { type: 'zip', label: '压缩包', color: 'purple', icon: <FileZipOutlined style={{ fontSize: 24, color: '#722ED1' }} /> };
  }
  if (['txt', 'md'].includes(ext)) {
    return { type: 'text', label: '文本文档', color: 'default', icon: <FileTextOutlined style={{ fontSize: 24, color: '#595959' }} /> };
  }
  return { type: 'other', label: ext ? `${ext.toUpperCase()} 文件` : '文档', color: 'default', icon: <FileTextOutlined style={{ fontSize: 24, color: '#595959' }} /> };
};

const FileUpload: React.FC<FileUploadProps> = ({
  value = '',
  fileName = '',
  onChange,
  disabled = false,
  placeholder = '点击上传或拖拽原稿文件',
  maxSizeMB = 50,
  accept = '.doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,image/*',
  style,
  onUploadSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [tempUrl, setTempUrl] = useState('');


  // 处理上传文件
  const handleUpload = async (file: File) => {
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      message.error(`文件大小不能超过 ${maxSizeMB}MB`);
      return;
    }

    const typeInfo = detectFileType(file.name, file.type);

    setUploading(true);
    message.loading({ content: `正在自动解析并上传 ${typeInfo.label}（${file.name}）...`, key: 'uploading-file' });

    try {
      const res: any = await uploadFileSmart(file);
      const url = res.url || res.fileName || '';
      const uploadedName = res.originalFilename || file.name;
      if (!url) {
        throw new Error('未获取到返回的文件链接');
      }
      if (res.deduplicated) {
        message.success({ content: `⚡ 检测到相同文件，已直接复用原文件（秒传成功）！`, key: 'uploading-file' });
      } else {
        message.success({ content: `已自动识别为【${typeInfo.label}】并上传成功！`, key: 'uploading-file' });
      }
      onChange?.(url, uploadedName);
      onUploadSuccess?.(url, uploadedName, file);
    } catch (e: any) {
      message.error({ content: e.message || '文件上传失败，请重试', key: 'uploading-file' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !uploading) setIsDragOver(true);
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
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  // 剪贴板粘贴处理（根据文件后缀自动判断）
  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled || uploading) return;

    // 1. 优先尝试从剪贴板提取文件对象（Windows文件复制/微信文件复制/图片截图）
    let pastedFile: File | null = null;
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      pastedFile = e.clipboardData.files[0];
    } else if (e.clipboardData.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.kind === 'file') {
          pastedFile = item.getAsFile();
          if (pastedFile) break;
        }
      }
    }

    if (pastedFile) {
      e.preventDefault();
      const typeInfo = detectFileType(pastedFile.name, pastedFile.type);
      message.info(`检测到剪贴板粘贴：${typeInfo.label}（${pastedFile.name}）`);
      handleUpload(pastedFile);
      return;
    }

    // 2. 若剪贴板内是纯文本且符合 URL 规范（例如复制了百度网盘、微云或腾讯文档外链）
    const pastedText = e.clipboardData.getData('text')?.trim();
    if (pastedText && (pastedText.startsWith('http://') || pastedText.startsWith('https://') || pastedText.includes('pan.baidu.com'))) {
      e.preventDefault();
      const extractedName = pastedText.split('/').pop()?.split('?')[0] || '网盘/外部文档链接';
      onChange?.(pastedText, extractedName);
      message.success('已自动识别剪贴板中的网盘/文档链接并填入！');
    }
  };

  // 点击快捷粘贴按钮
  const handleClipboardButtonClick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          // 查找是否有文件或图片
          for (const type of item.types) {
            if (type.startsWith('image/') || type.includes('pdf') || type.includes('document') || type.includes('text')) {
              const blob = await item.getType(type);
              const ext = type.split('/')[1] || 'bin';
              const file = new File([blob], `clipboard_${Date.now()}.${ext}`, { type });
              message.info(`已从剪贴板读取文件，正在上传...`);
              await handleUpload(file);
              return;
            }
          }
        }
      }
      message.info('请在区域内直接按下键盘 Ctrl + V 粘贴复制的文件');
      containerRef.current?.focus();
    } catch {
      message.info('请在区域内直接按下键盘 Ctrl + V 粘贴复制的文件');
      containerRef.current?.focus();
    }
  };

  // 确认外部链接输入（网盘/腾讯文档等）
  const handleConfirmUrl = () => {
    if (tempUrl.trim()) {
      const trimmed = tempUrl.trim();
      const extractedName = trimmed.split('/').pop()?.split('?')[0] || '外部网盘文件';
      onChange?.(trimmed, extractedName);
      setShowUrlInput(false);
      setTempUrl('');
    }
  };

  // 删除当前附件
  const handleRemove = () => {
    onChange?.('', '');
  };

  const currentDisplayName = fileName || value.split('/').pop()?.split('?')[0] || '原稿电子文件';
  const currentFileType = detectFileType(currentDisplayName);

  return (
    <div style={{ width: '100%', ...style }}>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept={accept}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUpload(e.target.files[0]);
          }
        }}
      />

      {/* 网盘 / 外部链接输入模式 */}
      {showUrlInput ? (
        <div style={{ padding: '8px 0' }}>
          <Space direction="horizontal" style={{ width: '100%' }}>
            <Input
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="输入百度网盘、腾讯文档或外链URL"
              onPressEnter={handleConfirmUrl}
              style={{ width: 220 }}
            />
            <Button type="primary" size="small" onClick={handleConfirmUrl}>
              确定
            </Button>
            <Button size="small" onClick={() => setShowUrlInput(false)}>
              取消
            </Button>
          </Space>
        </div>
      ) : value ? (
        /* 已上传状态展示卡片（紧凑自适应，防溢出） */
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 8px',
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            backgroundColor: '#FAFAFA',
            boxSizing: 'border-box',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <span style={{ flexShrink: 0 }}>{currentFileType.icon}</span>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12, flexShrink: 0 }} />
                <Tooltip title={currentDisplayName}>
                  <Text strong style={{ fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {currentDisplayName}
                  </Text>
                </Tooltip>
                <Tag color={currentFileType.color} style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px', flexShrink: 0 }}>
                  {currentFileType.label}
                </Tag>
              </div>
              <Text type="secondary" style={{ fontSize: 10, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                就绪，可随时打印
              </Text>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <Tooltip title="下载或在新窗口查看原稿文件">
              <Button
                type="link"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => window.open(value, '_blank')}
                style={{ padding: '0 4px', fontSize: 11 }}
              >
                查看
              </Button>
            </Tooltip>
            {!disabled && (
              <>
                <Tooltip title="重新选择或替换文件">
                  <Button
                    type="link"
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ padding: '0 4px', fontSize: 11 }}
                  >
                    替换
                  </Button>
                </Tooltip>
                <Tooltip title="移除此附件">
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleRemove}
                    style={{ padding: '0 4px', fontSize: 11 }}
                  >
                    删除
                  </Button>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      ) : (
        /* 未上传状态：支持拖拽、点击选择、Ctrl+V 粘贴文件（紧凑自适应，绝不横向溢出） */
        <div
          ref={containerRef}
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onPaste={handlePaste}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          style={{
            border: isDragOver ? '2px dashed #1677FF' : '1px dashed #d9d9d9',
            borderRadius: 6,
            backgroundColor: isDragOver ? '#F0F5FF' : '#FAFAFA',
            padding: '8px 10px',
            textAlign: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.25s',
            outline: 'none',
            boxSizing: 'border-box',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          {uploading ? (
            <div style={{ padding: '4px 0' }}>
              <Spin tip="正在上传..." size="small" />
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 }}>
                <PaperClipOutlined style={{ fontSize: 16, color: '#1677FF', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: '#262626', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {placeholder}
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#8c8c8c', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                支持拖拽或按 <span style={{ color: '#1677FF', fontWeight: 600 }}>Ctrl+V 粘贴</span>
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="small"
                  icon={<UploadOutlined />}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: 11, padding: '0 6px' }}
                >
                  本地文件
                </Button>
                <Button
                  size="small"
                  onClick={handleClipboardButtonClick}
                  style={{ fontSize: 11, padding: '0 6px' }}
                >
                  📋 粘贴
                </Button>
                <Button
                  size="small"
                  type="link"
                  icon={<LinkOutlined />}
                  onClick={() => setShowUrlInput(true)}
                  style={{ fontSize: 11, padding: '0 4px' }}
                >
                  外链
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
