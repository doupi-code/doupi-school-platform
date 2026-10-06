import React, { useRef, useState } from 'react';
import { Button, Image, Input, message, Space, Spin, Tooltip, Typography } from 'antd';
import {
  CameraOutlined,
  DeleteOutlined,
  EyeOutlined,
  LinkOutlined,
  ReloadOutlined,
  UploadOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { uploadFile } from '@/api/edu/record';

const { Text } = Typography;

export interface ImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxSizeMB?: number;
  allowUrlInput?: boolean;
  style?: React.CSSProperties;
  onUploadSuccess?: (url: string, file: File) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value = '',
  onChange,
  disabled = false,
  placeholder = '点击上传或将图片拖拽至此',
  maxSizeMB = 10,
  allowUrlInput = true,
  style,
  onUploadSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  // 处理上传图片
  const handleUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      message.error('请选择有效的图片文件（JPG、PNG、WEBP 等）');
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      message.error(`图片大小不能超过 ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res: any = await uploadFile(formData);
      const url = res.url || res.fileName || '';
      if (!url) {
        throw new Error('未获取到返回的图片链接');
      }
      message.success('图片上传成功！');
      onChange?.(url);
      onUploadSuccess?.(url, file);
    } catch (e: any) {
      message.error(e.message || '图片上传失败，请重试');
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

    if (!pastedFile) return;

    const ext = pastedFile.name.split('.').pop()?.toLowerCase() || '';
    const isDoc = ['doc', 'docx', 'pdf', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar', '7z'].includes(ext);
    const isImg = pastedFile.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext);

    if (isImg) {
      e.preventDefault();
      message.info(`检测到剪贴板图片（.${ext}），正在上传留样...`);
      handleUpload(pastedFile);
    } else if (isDoc) {
      e.preventDefault();
      message.warning(`检测到您粘贴的是【.${ext}】文档（${pastedFile.name}），原稿文档请粘贴在左侧【原稿电子文件 / 附件】区域`);
    }
  };

  // 点击快捷粘贴按钮
  const handleClipboardButtonClick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imgType = item.types.find((t) => t.startsWith('image/'));
          if (imgType) {
            const blob = await item.getType(imgType);
            const file = new File([blob], `screenshot_${Date.now()}.png`, { type: imgType });
            message.info('已从剪贴板读取截图，正在上传...');
            await handleUpload(file);
            return;
          }
        }
      }
      message.info('请直接按下键盘 Ctrl + V 粘贴截图');
      containerRef.current?.focus();
    } catch {
      message.info('请直接按下键盘 Ctrl + V 粘贴截图');
      containerRef.current?.focus();
    }
  };

  // 确认外链输入
  const handleConfirmUrl = () => {
    if (tempUrl.trim()) {
      onChange?.(tempUrl.trim());
      setShowUrlInput(false);
      setTempUrl('');
    }
  };

  // 删除当前图片
  const handleRemove = () => {
    onChange?.('');
  };

  return (
    <div style={{ width: '100%', ...style }}>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUpload(e.target.files[0]);
          }
        }}
      />

      {/* URL 手工输入模式 */}
      {showUrlInput ? (
        <div style={{ padding: '8px 0' }}>
          <Space direction="horizontal" style={{ width: '100%' }}>
            <Input
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="请输入或粘贴外部图片网络 URL (http://...)"
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
        /* 已上传状态展示卡片 */
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            backgroundColor: '#FAFAFA',
          }}
        >
          <Space>
            <Image
              src={value}
              width={54}
              height={54}
              style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid #e8e8e8' }}
              fallback="https://via.placeholder.com/54?text=Image"
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 13 }} />
                <Text strong style={{ fontSize: 13 }}>留样图片已上传</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', maxWidth: 160 }} ellipsis>
                {value.split('/').pop() || '留样照片'}
              </Text>
            </div>
          </Space>

          <Space size="small">
            {!disabled && (
              <>
                <Tooltip title="重新选择或替换图片">
                  <Button
                    type="link"
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    替换
                  </Button>
                </Tooltip>
                <Tooltip title="移除此图片">
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleRemove}
                  >
                    删除
                  </Button>
                </Tooltip>
              </>
            )}
          </Space>
        </div>
      ) : (
        /* 未上传状态：拖拽、点击上传、Ctrl+V 粘贴区域 */
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
            padding: '12px 14px',
            textAlign: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.25s',
            outline: 'none',
          }}
        >
          {uploading ? (
            <div style={{ padding: '8px 0' }}>
              <Spin tip="正在上传留样图片..." />
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                <CameraOutlined style={{ fontSize: 20, color: '#1677FF' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#262626' }}>
                  {placeholder}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 6 }}>
                支持本地选择、直接拖拽，或聚焦后按 <span style={{ color: '#1677FF', fontWeight: 600 }}>Ctrl+V 粘贴微信截图</span>
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'center', gap: 8 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="small"
                  icon={<UploadOutlined />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  本地图片
                </Button>
                <Button
                  size="small"
                  onClick={handleClipboardButtonClick}
                >
                  📋 粘贴截图
                </Button>
                {allowUrlInput && (
                  <Button
                    size="small"
                    type="link"
                    icon={<LinkOutlined />}
                    onClick={() => setShowUrlInput(true)}
                  >
                    外链URL
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
