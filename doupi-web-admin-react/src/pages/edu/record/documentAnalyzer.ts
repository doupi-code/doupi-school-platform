import type { FileLike } from './wechatExportImport';

/** 纸张规格容差（毫米） */
const TOLERANCE_MM = 12.0;

function close(a: number, b: number) {
  return Math.abs(a - b) <= TOLERANCE_MM;
}

export function detectPaperTypeFromMm(wmm: number, hmm: number): string | undefined {
  const l = Math.min(wmm, hmm);
  const s = Math.max(wmm, hmm);
  if (close(s, 297) && close(l, 210)) return 'A4';
  if (close(s, 420) && close(l, 297)) return 'A3';
  if ((close(s, 370) || close(s, 390)) && (close(l, 260) || close(l, 270))) return '8K';
  if ((close(s, 270) || close(s, 260)) && (close(l, 195) || close(l, 184))) return '16K';
  return undefined;
}

export interface FastAnalysisResult {
  parseable: boolean;
  pageCount?: number;
  sourcePaperType?: string;
  source: 'local-docx' | 'local-pdf' | 'server';
  msg?: string;
}

/**
 * 纯前端本地秒级解析 DOCX（免上传服务器，毫秒级读取 docProps/app.xml 中的 Pages 元数据）
 */
export async function fastExtractDocxMetadata(file: FileLike | Blob): Promise<FastAnalysisResult | null> {
  try {
    if (typeof (file as any).arrayBuffer !== 'function') return null;
    const arrayBuffer: ArrayBuffer = await (file as any).arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const len = bytes.length;
    if (len < 30) return null;

    // 寻找 Central Directory End (EOCD): 0x06054b50（从末尾逆向搜索）
    let eocdOffset = -1;
    for (let i = len - 22; i >= Math.max(0, len - 65557); i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset === -1) return null;

    const cdOffset = view.getUint32(eocdOffset + 16, true);
    const cdRecords = view.getUint16(eocdOffset + 10, true);
    let p = cdOffset;
    let appXmlData: { method: number; data: Uint8Array } | null = null;
    let docXmlData: { method: number; data: Uint8Array } | null = null;
    const decoder = new TextDecoder('utf-8');

    for (let i = 0; i < cdRecords && p < len; i++) {
      if (view.getUint32(p, true) !== 0x02014b50) break;
      const method = view.getUint16(p + 10, true);
      const compSize = view.getUint32(p + 20, true);
      const nameLen = view.getUint16(p + 28, true);
      const extraLen = view.getUint16(p + 30, true);
      const commentLen = view.getUint16(p + 32, true);
      const localHeaderOffset = view.getUint32(p + 42, true);
      const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));

      if (name === 'docProps/app.xml' || name === 'word/document.xml') {
        const localNameLen = view.getUint16(localHeaderOffset + 26, true);
        const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
        const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen;
        const compressed = bytes.subarray(dataOffset, dataOffset + compSize);
        if (name === 'docProps/app.xml') appXmlData = { method, data: compressed };
        if (name === 'word/document.xml') docXmlData = { method, data: compressed };
      }
      p += 46 + nameLen + extraLen + commentLen;
    }

    const decompress = async (item: { method: number; data: Uint8Array }) => {
      if (item.method === 0) return decoder.decode(item.data);
      if (item.method === 8 && typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(item.data as any);
        writer.close();
        const res = new Response(ds.readable);
        return await res.text();
      }
      return null;
    };

    let pageCount: number | undefined;
    let sourcePaperType: string | undefined;

    if (appXmlData) {
      const xml = await decompress(appXmlData);
      if (xml) {
        const m = xml.match(/<Pages>(\d+)<\/Pages>/i);
        if (m && Number(m[1]) > 0) {
          pageCount = Number(m[1]);
        }
      }
    }

    if (docXmlData) {
      try {
        const xml = await decompress(docXmlData);
        if (xml) {
          const pgSzMatch = xml.match(/<w:pgSz\b[^>]*\/?>/i);
          if (pgSzMatch) {
            const w = pgSzMatch[0].match(/w:w="(\d+)"/);
            const h = pgSzMatch[0].match(/w:h="(\d+)"/);
            if (w && h) {
              const wmm = (Number(w[1]) * 25.4) / 1440;
              const hmm = (Number(h[1]) * 25.4) / 1440;
              sourcePaperType = detectPaperTypeFromMm(wmm, hmm);
            }
          }
        }
      } catch {
        // 忽略纸张格式提取异常
      }
    }

    if (pageCount && pageCount > 0) {
      return {
        parseable: true,
        pageCount,
        sourcePaperType,
        source: 'local-docx',
        msg: `原稿 ${pageCount} 页（Word 保存的页数，请核对打印预览）`,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 纯前端快速分析文件页数入口（Word 本地秒解，其他回退）
 */
export async function fastAnalyzeFile(file: FileLike | Blob): Promise<FastAnalysisResult | null> {
  const fileName = (file as any).name || '';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (['docx', 'docm'].includes(ext)) {
    const localDocx = await fastExtractDocxMetadata(file);
    if (localDocx) return localDocx;
  }

  return null;
}
