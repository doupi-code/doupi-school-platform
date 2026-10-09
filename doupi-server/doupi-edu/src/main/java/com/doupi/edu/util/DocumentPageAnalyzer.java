package com.doupi.edu.util;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamReader;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;

import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.XWPFDocument;

import org.springframework.web.multipart.MultipartFile;

import com.doupi.edu.domain.dto.DocumentAnalysisResult;

/**
 * 文档文件（PDF/Word/Excel）页数与纸张规格解析工具。
 * 仅用于文印登记自动换算总耗纸数：
 * - PDF：取真实页数 + 首页纸张规格；
 * - docx/docm：取 Word 保存的页数元数据 + 页面纸张规格（从 document.xml 解析 pgSz）；
 * - xlsx/xlsm/xls：sheet 数即页数（无纸张概念）；
 * - doc（老二进制）：无法可靠读取，回退手动填写。
 */
public final class DocumentPageAnalyzer
{
    private DocumentPageAnalyzer()
    {
    }

    /** 纸张规格识别容差（毫米） */
    private static final double TOLERANCE_MM = 12.0;

    public static DocumentAnalysisResult analyze(MultipartFile file)
    {
        if (file == null || file.isEmpty())
        {
            return DocumentAnalysisResult.fail("文件为空");
        }

        String name = file.getOriginalFilename();
        String ext = extension(name);

        try
        {
            switch (ext)
            {
                case "pdf":
                    return analyzePdf(file.getBytes());
                case "docx":
                case "docm":
                    return analyzeDocx(file.getBytes());
                case "xlsx":
                case "xlsm":
                    return analyzeXlsx(file.getInputStream());
                case "xls":
                    return analyzeXls(file.getInputStream());
                case "doc":
                    return DocumentAnalysisResult.fail(".doc 老格式无法可靠读取页数，请手动填写");
                default:
                    return DocumentAnalysisResult.fail("不支持的文件格式：" + name);
            }
        }
        catch (Exception e)
        {
            return DocumentAnalysisResult.fail("解析失败：" + e.getMessage());
        }
    }

    private static DocumentAnalysisResult analyzePdf(byte[] data) throws Exception
    {
        try (PDDocument pdf = Loader.loadPDF(data))
        {
            DocumentAnalysisResult r = new DocumentAnalysisResult();
            r.setParseable(true);
            r.setPageCount(pdf.getNumberOfPages());

            if (pdf.getNumberOfPages() > 0)
            {
                PDPage first = pdf.getPage(0);
                PDRectangle box = first.getMediaBox();
                r.setSourcePaperType(detectPaperType(box.getWidth() * 25.4 / 72.0, box.getHeight() * 25.4 / 72.0));
            }
            r.setMsg("已识别 PDF 页数");
            return r;
        }
    }

    private static DocumentAnalysisResult analyzeDocx(byte[] data) throws Exception
    {
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(data)))
        {
            DocumentAnalysisResult r = new DocumentAnalysisResult();
            r.setParseable(true);

            // 页数：Word 保存时写入的元数据（可能缺失/滞后，缺失时前端回退手动）
            int pages = 0;
            try
            {
                pages = doc.getProperties().getExtendedProperties().getUnderlyingProperties().getPages();
            }
            catch (Exception ignore)
            {
                pages = 0;
            }
            r.setPageCount(pages > 0 ? pages : null);

            // 纸张规格：从 word/document.xml 解析 <w:pgSz w:w="..." w:h="..."/>（twips → mm）
            int[] twips = parseDocxPgSz(data);
            if (twips != null)
            {
                r.setSourcePaperType(detectPaperType(twips[0] * 25.4 / 1440.0, twips[1] * 25.4 / 1440.0));
            }
            r.setMsg(r.getPageCount() != null ? "已识别 Word 页数" : "未能识别页数，请手动填写");
            return r;
        }
    }

    private static DocumentAnalysisResult analyzeXlsx(InputStream in) throws Exception
    {
        try (XSSFWorkbook wb = new XSSFWorkbook(in))
        {
            DocumentAnalysisResult r = new DocumentAnalysisResult();
            r.setParseable(true);
            r.setPageCount(wb.getNumberOfSheets());
            r.setMsg("已按工作表数量识别页数");
            return r;
        }
    }

    private static DocumentAnalysisResult analyzeXls(InputStream in) throws Exception
    {
        try (HSSFWorkbook wb = new HSSFWorkbook(in))
        {
            DocumentAnalysisResult r = new DocumentAnalysisResult();
            r.setParseable(true);
            r.setPageCount(wb.getNumberOfSheets());
            r.setMsg("已按工作表数量识别页数");
            return r;
        }
    }

    /** 从 docx 压缩包中读取 word/document.xml 并解析 pgSz 的宽高（twips） */
    private static int[] parseDocxPgSz(byte[] zipData)
    {
        String xml = readZipEntry(zipData, "word/document.xml");
        if (xml == null)
        {
            return null;
        }
        try
        {
            XMLInputFactory factory = XMLInputFactory.newInstance();
            XMLStreamReader reader = factory.createXMLStreamReader(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
            while (reader.hasNext())
            {
                if (reader.isStartElement() && "pgSz".equals(reader.getLocalName()))
                {
                    int w = 0;
                    int h = 0;
                    for (int i = 0; i < reader.getAttributeCount(); i++)
                    {
                        String local = reader.getAttributeLocalName(i);
                        String value = reader.getAttributeValue(i);
                        if ("w".equals(local))
                        {
                            w = toInt(value);
                        }
                        else if ("h".equals(local))
                        {
                            h = toInt(value);
                        }
                    }
                    reader.close();
                    return (w > 0 && h > 0) ? new int[] { w, h } : null;
                }
                reader.next();
            }
            reader.close();
        }
        catch (Exception ignore)
        {
            // 忽略解析异常，返回 null 表示无法识别纸张规格
        }
        return null;
    }

    private static String readZipEntry(byte[] zipData, String entryName)
    {
        try (ZipInputStream zin = new ZipInputStream(new ByteArrayInputStream(zipData)))
        {
            ZipEntry e;
            while ((e = zin.getNextEntry()) != null)
            {
                if (entryName.equals(e.getName()))
                {
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    byte[] buf = new byte[8192];
                    int n;
                    while ((n = zin.read(buf)) != -1)
                    {
                        out.write(buf, 0, n);
                    }
                    return out.toString(StandardCharsets.UTF_8.name());
                }
            }
        }
        catch (Exception ignore)
        {
            // 忽略
        }
        return null;
    }

    private static int toInt(String value)
    {
        try
        {
            return Integer.parseInt(value.trim());
        }
        catch (Exception e)
        {
            return 0;
        }
    }

    private static String extension(String name)
    {
        if (name == null)
        {
            return "";
        }
        int i = name.lastIndexOf('.');
        return i >= 0 ? name.substring(i + 1).toLowerCase() : "";
    }

    /**
     * 根据页面宽高（毫米）识别纸张规格（A4/A3/8K/16K），识别不到返回 null。
     */
    private static String detectPaperType(double wmm, double hmm)
    {
        double l = Math.min(wmm, hmm);
        double s = Math.max(wmm, hmm);

        if (close(s, 297) && close(l, 210))
        {
            return "A4";
        }
        if (close(s, 420) && close(l, 297))
        {
            return "A3";
        }
        if ((close(s, 370) || close(s, 390)) && (close(l, 260) || close(l, 270)))
        {
            return "8K";
        }
        if ((close(s, 270) || close(s, 260)) && (close(l, 195) || close(l, 184)))
        {
            return "16K";
        }
        return null;
    }

    private static boolean close(double a, double b)
    {
        return Math.abs(a - b) <= TOLERANCE_MM;
    }
}