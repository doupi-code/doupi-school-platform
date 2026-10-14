export type WechatAccountType = 'official' | 'enterprise' | 'personal' | 'group' | 'unknown';

export interface FileLike {
  name: string;
  webkitRelativePath?: string;
  relativePath?: string;
  size?: number;
  type?: string;
  text: () => Promise<string>;
}

export interface WechatManifestConversation {
  id: string;
  name: string;
  type: string;
  folder: string;
  messageCount: number;
  status: string;
  accountType?: WechatAccountType;
  registeredCount?: number;
  hasRegistered?: boolean;
}

export interface WechatExportDirectorySession {
  version: number;
  status: string;
  exportedAt: string;
  messageCount: number;
  rootFolderName: string;
  conversations: WechatManifestConversation[];
  fileIndex: Map<string, FileLike>;
  classificationWarning?: string;
}

export interface StructuredMessagePayload {
  id: string;
  serverId?: string;
  conversationId: string;
  conversationName: string;
  folder: string;
  senderName: string;
  name?: string;
  from?: string;
  isSender?: boolean;
  type: string;
  timestamp?: number;
  createTime?: number;
  datetime?: string;
  timeStr?: string;
  content: string;
  contentData?: {
    type?: string;
    title?: string;
    content?: string;
    quotedContent?: string;
    quotedSender?: string;
  };
  fileTitle?: string;
  quoteContent?: string;
  exportMediaUrl?: string;
  attachmentRelativePath?: string;
  exportMediaError?: string;
  attachmentMissing?: boolean;
}

export interface StructuredConversationPayload {
  conversationId: string;
  conversationName: string;
  folder: string;
  messages: StructuredMessagePayload[];
}

export interface DamagedConversationNotice {
  conversationId: string;
  conversationName: string;
  reason: string;
}

export interface ReadSelectedConversationsResult {
  conversations: StructuredConversationPayload[];
  attachmentFilesByPath: Map<string, FileLike>;
  emptyConversations: { conversationId: string; conversationName: string }[];
  damagedConversations: DamagedConversationNotice[];
  totalMessagesRead: number;
}

export function normalizeAccountType(value: unknown): WechatAccountType {
  const type = String(value ?? '').toLowerCase();
  if (['official', 'official_account', '公众号'].includes(type)) return 'official';
  if (['enterprise', 'work', 'openim', '企业号', '企业微信'].includes(type)) return 'enterprise';
  if (['group', 'chatroom'].includes(type)) return 'group';
  if (type === 'personal') return 'personal';
  // TraceMemo exports some official accounts as "user". This is not proof of a personal account.
  return 'unknown';
}

const SELECTION_STORAGE_PREFIX = 'doupi_wechat_export_selected_contacts_';

export function normalizeRelativePath(rawPath?: string): string {
  if (!rawPath) return '';
  return rawPath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .trim();
}

/**
 * 构建导出目录文件索引（仅建立相对路径 -> File 引用，不读取消息或附件内容）
 */
export function indexExportDirectoryFiles(files: Iterable<FileLike>): {
  rootFolderName: string;
  manifestFile: FileLike | undefined;
  fileIndex: Map<string, FileLike>;
} {
  const list = Array.from(files || []);
  let manifestRawPath = '';
  let manifestFile: FileLike | undefined;

  for (const file of list) {
    const rel = normalizeRelativePath(file.webkitRelativePath || file.relativePath || file.name);
    if (rel === '导出清单.json' || rel.endsWith('/导出清单.json')) {
      manifestRawPath = rel;
      manifestFile = file;
      break;
    }
  }

  let rootPrefix = '';
  let rootFolderName = '微信导出目录';
  if (manifestRawPath.endsWith('/导出清单.json')) {
    rootPrefix = manifestRawPath.slice(0, -'导出清单.json'.length);
    const parts = rootPrefix.replace(/\/+$/, '').split('/');
    rootFolderName = parts[parts.length - 1] || rootFolderName;
  }

  const fileIndex = new Map<string, FileLike>();
  for (const file of list) {
    const rawRel = normalizeRelativePath(file.webkitRelativePath || file.relativePath || file.name);
    if (!rawRel) continue;
    const stripped = rootPrefix && rawRel.startsWith(rootPrefix)
      ? normalizeRelativePath(rawRel.slice(rootPrefix.length))
      : rawRel;
    if (stripped) {
      fileIndex.set(stripped, file);
    }
  }

  return { rootFolderName, manifestFile, fileIndex };
}

/**
 * 第一步：仅读取《导出清单.json》，不读取任何 messages.js 或 HTML，也不上传任何附件
 */
export async function loadWechatExportManifest(files: Iterable<FileLike>): Promise<WechatExportDirectorySession> {
  const { rootFolderName, manifestFile, fileIndex } = indexExportDirectoryFiles(files);
  if (!manifestFile) {
    throw new Error('所选文件夹中未找到「导出清单.json」，请选择完整的微信聊天记录导出目录');
  }

  let parsed: any;
  try {
    const rawJson = await manifestFile.text();
    const cleanJson = rawJson.charCodeAt(0) === 0xfeff ? rawJson.slice(1) : rawJson;
    parsed = JSON.parse(cleanJson);
  } catch (err: any) {
    throw new Error(`解析「导出清单.json」失败：${err?.message || 'JSON 格式无效'}`);
  }

  if (!parsed || !Array.isArray(parsed.conversations)) {
    throw new Error('「导出清单.json」缺少有效的 conversations 会话列表');
  }

  let accountTypes: Record<string, unknown> = {};
  let classificationWarning: string | undefined;
  const classificationFile = fileIndex.get('联系人分类.json');
  if (classificationFile) {
    try {
      const metadata = JSON.parse((await classificationFile.text()).replace(/^\uFEFF/, ''));
      if (metadata.version !== 1 || !metadata.accounts || typeof metadata.accounts !== 'object' || Array.isArray(metadata.accounts))
        throw new Error('无效分类文件');
      accountTypes = metadata.accounts;
    } catch {
      classificationWarning = '联系人分类文件无法读取，未确认类型的账号会保留显示。';
    }
  }

  const conversations: WechatManifestConversation[] = parsed.conversations.map((c: any, idx: number) => ({
    id: String(c?.id || `conv-${idx}`),
    name: String(c?.name ?? c?.id ?? `未命名联系人-${idx + 1}`),
    type: String(c?.type || 'user'),
    accountType: normalizeAccountType(Object.prototype.hasOwnProperty.call(accountTypes, String(c?.id)) ? accountTypes[String(c?.id)] : (c?.accountType ?? c?.type)),
    folder: normalizeRelativePath(String(c?.folder || `联系人/${c?.name || idx}`)),
    messageCount: Math.max(0, Number(c?.messageCount ?? 0)),
    status: String(c?.status || 'completed'),
    registeredCount: 0,
    hasRegistered: false,
  }));

  return {
    version: Number(parsed.version || 1),
    status: String(parsed.status || 'completed'),
    exportedAt: String(parsed.exportedAt || ''),
    messageCount: Number(parsed.messageCount || 0),
    rootFolderName,
    conversations,
    fileIndex,
    classificationWarning,
  };
}

/**
 * 合并后端返回的会话已登记数量（按会话 ID 精确映射）
 */
export function applyRegisteredStatusToManifest(
  target: WechatExportDirectorySession,
  statusMap?: Record<string, number> | null
): WechatExportDirectorySession;
export function applyRegisteredStatusToManifest(
  target: WechatManifestConversation[],
  statusMap?: Record<string, number> | null
): WechatManifestConversation[];
export function applyRegisteredStatusToManifest(
  target: WechatExportDirectorySession | WechatManifestConversation[],
  statusMap?: Record<string, number> | null
): WechatExportDirectorySession | WechatManifestConversation[] {
  if (!statusMap) return target;
  const mapList = (list: WechatManifestConversation[]) =>
    list.map((c) => {
      const count = Number(statusMap[c.id] || 0);
      return {
        ...c,
        registeredCount: count,
        hasRegistered: count > 0,
      };
    });
  if (Array.isArray(target)) {
    return mapList(target);
  }
  return {
    ...target,
    conversations: mapList(target.conversations || []),
  };
}

export function getContactSelectionStorageKey(userIdentifier?: string | number): string {
  const key = String(userIdentifier ?? 'default_user').trim() || 'default_user';
  return `${SELECTION_STORAGE_PREFIX}${key}`;
}

/**
 * 读取当前系统用户在当前浏览器中保存的联系人会话 ID 选择：
 * - 首次全部未选
 * - 仅按会话 ID 匹配，新联系人默认未选，避免同名联系人串联
 */
export function loadSavedContactSelection(
  userIdentifier: string | number | undefined,
  conversationsOrIds: ReadonlyArray<WechatManifestConversation | string>,
  storage?: Pick<Storage, 'getItem'> | null
): string[] {
  const targetStorage = storage !== undefined ? storage : (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!targetStorage) return [];

  try {
    const raw = targetStorage.getItem(getContactSelectionStorageKey(userIdentifier));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const validIds = new Set(
      (conversationsOrIds || []).map((item) => (typeof item === 'string' ? item : item.id))
    );
    const restored: string[] = [];
    const seen = new Set<string>();
    for (const id of parsed) {
      if (typeof id === 'string' && validIds.has(id) && !seen.has(id)) {
        seen.add(id);
        restored.push(id);
      }
    }
    return restored;
  } catch {
    return [];
  }
}

/**
 * 保存当前系统用户的联系人会话 ID 选择到当前浏览器
 */
export function saveContactSelection(
  userIdentifier: string | number | undefined,
  selectedIds: Iterable<string>,
  storage?: Pick<Storage, 'setItem'> | null
): void {
  const targetStorage = storage !== undefined ? storage : (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!targetStorage) return;
  try {
    const unique = Array.from(new Set(Array.from(selectedIds || []).filter(Boolean)));
    targetStorage.setItem(getContactSelectionStorageKey(userIdentifier), JSON.stringify(unique));
  } catch {
    // 忽略浏览器隐私模式或配额限制错误
  }
}

/**
 * 筛选导出清单中的联系人会话
 */
export function filterManifestConversations(
  conversations: WechatManifestConversation[],
  options: {
    keyword?: string;
    registeredFilter?: 'all' | 'registered' | 'unregistered';
    hideEmpty?: boolean;
    hideBusiness?: boolean;
    selectedIds?: readonly string[];
  } = {}
): WechatManifestConversation[] {
  const kw = (options.keyword || '').trim().toLowerCase();
  const regFilter = options.registeredFilter || 'all';
  const hideEmpty = Boolean(options.hideEmpty);
  const selected = options.selectedIds ? new Set(options.selectedIds) : null;

  return conversations.filter((c) => {
    const kind = c.accountType ?? normalizeAccountType(c.type);
    if (options.hideBusiness && (kind === 'official' || kind === 'enterprise')) return false;
    if (selected && !selected.has(c.id)) return false;
    if (hideEmpty && c.messageCount <= 0) return false;
    if (regFilter === 'registered' && !c.hasRegistered) return false;
    if (regFilter === 'unregistered' && c.hasRegistered) return false;
    if (kw) {
      const nameMatch = (c.name || '').toLowerCase().includes(kw);
      const idMatch = (c.id || '').toLowerCase().includes(kw);
      if (!nameMatch && !idMatch) return false;
    }
    return true;
  });
}

/**
 * 安全提取 messages.js 中的 JSON 字符串，绝不执行脚本或加载 HTML
 */
export function extractJsonFromMessagesJs(rawJs: string): string {
  if (!rawJs) return '';
  let trimmed = rawJs.trim();
  if (trimmed.charCodeAt(0) === 0xfeff) {
    trimmed = trimmed.slice(1).trim();
  }
  const match = trimmed.match(/^(?:window\.)?__WECHAT_EXPORT__\s*=\s*([\s\S]*)$/);
  if (match) {
    trimmed = match[1].trim();
  }
  if (trimmed.endsWith(';')) {
    trimmed = trimmed.slice(0, -1).trim();
  }
  return trimmed;
}

function parseMessageDateStr(datetime?: string, createTime?: number): string | null {
  if (datetime) {
    const m = String(datetime).trim().match(/^(\d{4})[年/.-]\s*(\d{1,2})[月/.-]\s*(\d{1,2})/);
    if (m) {
      return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    }
  }
  if (createTime && createTime > 0) {
    const ms = createTime > 10_000_000_000 ? createTime : createTime * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${mo}-${day}`;
    }
  }
  return null;
}

function parseMessageEpochSeconds(datetime?: string, createTime?: number): number | null {
  if (typeof createTime === 'number' && createTime > 0) {
    return createTime > 10_000_000_000 ? Math.floor(createTime / 1000) : createTime;
  }
  if (datetime) {
    const m = String(datetime)
      .trim()
      .match(/^(\d{4})[年/.-]\s*(\d{1,2})[月/.-]\s*(\d{1,2})(?:[日号])?(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (m) {
      const dt = new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        m[4] ? Number(m[4]) : 0,
        m[5] ? Number(m[5]) : 0,
        m[6] ? Number(m[6]) : 0
      );
      if (!Number.isNaN(dt.getTime())) {
        return Math.floor(dt.getTime() / 1000);
      }
    }
  }
  return null;
}

/**
 * 第二步：点击“开始识别”后才按需读取选中会话的 data/messages.js，
 * 各会话独立解析、按时间及原始顺序排列，并通过 exportMediaUrl 精确匹配目录内附件
 */
export async function readSelectedConversationsMessages(
  session: WechatExportDirectorySession,
  selectedIds: Iterable<string>,
  options: {
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<ReadSelectedConversationsResult> {
  const idSet = new Set(Array.from(selectedIds || []).filter(Boolean));
  const selectedConvs = session.conversations.filter((c) => idSet.has(c.id));

  const conversations: StructuredConversationPayload[] = [];
  const attachmentFilesByPath = new Map<string, FileLike>();
  const emptyConversations: { conversationId: string; conversationName: string }[] = [];
  const damagedConversations: DamagedConversationNotice[] = [];
  let totalMessagesRead = 0;

  const startDate = options.startDate?.trim() || undefined;
  const endDate = options.endDate?.trim() || undefined;

  for (const conv of selectedConvs) {
    const convFolder = normalizeRelativePath(conv.folder);
    const messagesJsPath = `${convFolder}/data/messages.js`;
    const messagesFile = session.fileIndex.get(messagesJsPath);

    if (!messagesFile) {
      if (conv.messageCount <= 0) {
        emptyConversations.push({ conversationId: conv.id, conversationName: conv.name });
      } else {
        damagedConversations.push({
          conversationId: conv.id,
          conversationName: conv.name,
          reason: `未找到消息文件 ${messagesJsPath}`,
        });
      }
      continue;
    }

    let rawData: any;
    try {
      const rawJs = await messagesFile.text();
      const jsonText = extractJsonFromMessagesJs(rawJs);
      rawData = JSON.parse(jsonText);
    } catch (err: any) {
      damagedConversations.push({
        conversationId: conv.id,
        conversationName: conv.name,
        reason: `消息文件损坏或格式异常：${err?.message || 'JSON 解析失败'}`,
      });
      continue;
    }

    const rawMessages: any[] = Array.isArray(rawData?.messages) ? rawData.messages : [];
    if (rawMessages.length === 0) {
      emptyConversations.push({ conversationId: conv.id, conversationName: conv.name });
      continue;
    }

    // 过滤日期范围并记录原始顺序，按时间及原始顺序稳定排列
    const indexed: {
      originalIndex: number;
      sortEpoch: number;
      raw: any;
    }[] = [];

    for (let i = 0; i < rawMessages.length; i++) {
      const m = rawMessages[i];
      if (!m || typeof m !== 'object') continue;
      const dtStr = m.datetime || m.timeStr;
      const createTime = typeof m.createTime === 'number' ? m.createTime : (typeof m.timestamp === 'number' ? m.timestamp : undefined);
      const dateOnly = parseMessageDateStr(dtStr, createTime);
      if (startDate && dateOnly && dateOnly < startDate) continue;
      if (endDate && dateOnly && dateOnly > endDate) continue;
      const epoch = parseMessageEpochSeconds(dtStr, createTime);
      indexed.push({
        originalIndex: i,
        sortEpoch: epoch ?? Number.MAX_SAFE_INTEGER,
        raw: m,
      });
    }

    if (indexed.length === 0) {
      emptyConversations.push({ conversationId: conv.id, conversationName: conv.name });
      continue;
    }

    indexed.sort((a, b) => {
      if (a.sortEpoch !== b.sortEpoch) return a.sortEpoch - b.sortEpoch;
      return a.originalIndex - b.originalIndex;
    });

    const structuredMessages: StructuredMessagePayload[] = [];
    for (const entry of indexed) {
      const m = entry.raw;
      const rawType = String(m.type || '普通文本').trim();
      const isFile = rawType === '文件' || rawType.toLowerCase() === 'file';
      const isQuote = rawType === '引用消息' || rawType.toLowerCase() === 'quote';

      const fileTitle = isFile
        ? String(m.contentData?.title || m.fileTitle || m.exportMediaName || m.content || '').trim()
        : undefined;
      const quoteContent = isQuote
        ? String(m.content || m.quoteContent || m.contentData?.content || m.contentData?.title || '').trim()
        : undefined;

      const mediaUrl = m.exportMediaUrl ? normalizeRelativePath(String(m.exportMediaUrl)) : undefined;
      let attachmentRelativePath: string | undefined;
      let attachmentMissing = false;
      let exportMediaError: string | undefined = m.exportMediaError ? String(m.exportMediaError) : undefined;

      if (isFile) {
        if (mediaUrl) {
          attachmentRelativePath = convFolder ? `${convFolder}/${mediaUrl}` : mediaUrl;
          const matchedFile = session.fileIndex.get(attachmentRelativePath);
          if (matchedFile && !exportMediaError) {
            attachmentFilesByPath.set(attachmentRelativePath, matchedFile);
            attachmentMissing = false;
          } else {
            attachmentMissing = true;
            if (!exportMediaError) {
              exportMediaError = `导出目录中缺失附件文件：${attachmentRelativePath}`;
            }
          }
        } else {
          attachmentMissing = true;
          if (!exportMediaError) {
            exportMediaError = `导出记录未包含附件路径：${fileTitle || '未命名文件'}`;
          }
        }
      }

      const isSender = Boolean(m.isSender) || m.from === 'assistant';
      const senderName = String(m.senderName || m.name || (isSender ? '我' : conv.name)).trim();

      structuredMessages.push({
        id: String(m.id ?? `idx-${entry.originalIndex + 1}`),
        serverId: m.serverId ? String(m.serverId) : undefined,
        conversationId: conv.id,
        conversationName: conv.name,
        folder: convFolder,
        senderName,
        name: senderName,
        from: m.from ? String(m.from) : undefined,
        isSender,
        type: rawType,
        timestamp: typeof m.createTime === 'number' ? m.createTime : m.timestamp,
        createTime: typeof m.createTime === 'number' ? m.createTime : undefined,
        datetime: m.datetime ? String(m.datetime) : (m.timeStr ? String(m.timeStr) : undefined),
        timeStr: m.datetime ? String(m.datetime) : (m.timeStr ? String(m.timeStr) : undefined),
        content: String(m.content ?? ''),
        contentData: m.contentData
          ? {
              type: m.contentData.type,
              title: m.contentData.title,
              content: m.contentData.content,
              quotedContent: m.contentData.quotedContent,
              quotedSender: m.contentData.quotedSender,
            }
          : undefined,
        fileTitle,
        quoteContent,
        exportMediaUrl: mediaUrl,
        attachmentRelativePath,
        exportMediaError,
        attachmentMissing: isFile ? attachmentMissing : undefined,
      });
    }

    totalMessagesRead += structuredMessages.length;
    conversations.push({
      conversationId: conv.id,
      conversationName: conv.name,
      folder: convFolder,
      messages: structuredMessages,
    });
  }

  return {
    conversations,
    attachmentFilesByPath,
    emptyConversations,
    damagedConversations,
    totalMessagesRead,
  };
}
