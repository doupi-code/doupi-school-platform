package com.doupi.edu.service.impl.ocr;

import java.util.ArrayList;
import java.util.List;
import com.benjaminwan.ocrlibrary.OcrResult;
import com.benjaminwan.ocrlibrary.Point;
import com.benjaminwan.ocrlibrary.TextBlock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 桌面聊天窗口自适应版面切分器
 * 负责智能检测桌面多栏聊天应用（如PC微信、钉钉等），自适应计算并剥离左侧导航栏与会话列表，
 * 彻底克服写死固定屏幕宽度比例（如31%）在高清屏（1080P/2K/4K）下误切聊天消息的致命缺陷。
 */
public class ChatLayoutSegmenter 
{
    private static final Logger log = LoggerFactory.getLogger(ChatLayoutSegmenter.class);

    public static class SegmentResult 
    {
        public int splitX;
        public List<TextBlock> chatBlocks;
        public TextBlock headerBlock;
    }

    /**
     * 自适应切分出右侧主聊天窗口中的文本块
     */
    public static SegmentResult segment(OcrResult ocrResult, int imgWidth, int imgHeight) 
    {
        SegmentResult res = new SegmentResult();
        res.chatBlocks = new ArrayList<>();
        res.splitX = 0;

        if (ocrResult == null || ocrResult.getTextBlocks() == null || ocrResult.getTextBlocks().isEmpty()) 
        {
            return res;
        }

        List<TextBlock> allBlocks = ocrResult.getTextBlocks();

        // 1. 判断是否可能为电脑桌面版窗口截图（宽度 >= 480 即可，避免因用户将窗口拉窄或截图比例方正而误判）
        boolean isPossibleDesktop = imgWidth >= 480;
        if (!isPossibleDesktop) 
        {
            // 手机单栏竖屏截图或局部窄聊天气泡截图，无需分割，全图直接保留
            res.chatBlocks.addAll(allBlocks);
            return res;
        }

        // 2. 检测是否存在典型的左侧会话栏特征：
        //    特征 A: 左上角搜索栏（支持 "Q 搜索"、"Q 搜素"、"搜索"、"Search"、以 Q 开头等，X < 0.35 * imgWidth）
        //    特征 B: 左侧纵向垂直堆叠的会话时间戳列表（支持 09/30, 9/30, 14:56, 昨天, 星期X，X 在 0.10~0.48 * imgWidth）
        //    特征 C: 左侧会话条目中的语音通话/小程序/未读数标记
        int maxSessionListX = -1;
        boolean hasLeftSearch = false;
        int leftTimestampCount = 0;

        for (TextBlock tb : allBlocks) 
        {
            int minX = getMinX(tb);
            int maxX = getMaxX(tb);
            int minY = getMinY(tb);
            double rx = (double) minX / imgWidth;
            double ry = (double) minY / imgHeight;
            String text = tb.getText() != null ? tb.getText().trim() : "";

            // 搜索框特征
            if (rx <= 0.35 && ry <= 0.20) 
            {
                if (text.contains("搜") || text.matches("(?i)^[qQ].*") || text.toLowerCase().contains("search")) 
                {
                    hasLeftSearch = true;
                    maxSessionListX = Math.max(maxSessionListX, maxX);
                }
            }

            // 左侧会话列表中的时间戳（支持月日 09/30、时分 14:56、昨天、星期X）
            if (rx >= 0.10 && rx <= 0.48 && 
                text.matches("^(?:\\d{1,2}:\\d{2}|\\d{1,2}/\\d{1,2}|\\d{4}/\\d{1,2}/\\d{1,2}|昨天|前天|星期[一二三四五六日天]).*")) 
            {
                leftTimestampCount++;
                maxSessionListX = Math.max(maxSessionListX, maxX);
            }

            // 会话列表中的功能性标记（如 "[语音通话]"、"[小程序]"、"[图片]"、"[999+条]"）
            if (rx <= 0.35 && (text.matches("^\\[?\\d+\\+?条?\\].*") || text.contains("[语音") || text.contains("[小程序]") || text.contains("[图片]"))) 
            {
                maxSessionListX = Math.max(maxSessionListX, maxX);
            }
        }

        boolean isMultiColumn = hasLeftSearch || leftTimestampCount >= 2;
        if (!isMultiColumn) 
        {
            // 未检测到左侧多栏特征，保留全部文本块
            res.chatBlocks.addAll(allBlocks);
            return res;
        }

        // 3. 寻找右侧主聊天窗口顶部的标题块 Header（如 "李心雨老师"、"英语 刘珉"、"普高部-高三-周珲"、"徐老师" 等）
        //    在桌面微信中，主聊天窗口标题位于左侧会话栏右方（X > maxSessionListX），且位于顶部（Y <= 0.15 * imgHeight 或 Y <= 130）
        TextBlock bestHeader = null;
        int minHeaderX = Integer.MAX_VALUE;

        for (TextBlock tb : allBlocks) 
        {
            int minX = getMinX(tb);
            int minY = getMinY(tb);
            double rx = (double) minX / imgWidth;
            String text = tb.getText() != null ? tb.getText().trim() : "";

            if (minY <= Math.max(130, imgHeight * 0.15) && minX > Math.max(180, maxSessionListX - 30)) 
            {
                // 排除窗口最右上角的控制按钮（如最小化、最大化、关闭、置顶钉子、AI工具栏等，通常 X > 0.82 * imgWidth）
                if (rx > 0.82) continue;

                // 排除单个字符/数字等杂音（如右上角可能出现的 "1"、"x"、"-"）
                if (text.length() <= 1) continue;

                // 排除系统时间电量等干扰
                if (text.matches("^(?:\\d{1,2}:\\d{2}|上午|下午|5G|4G|WiFi|wifi|\\d+%).*")) continue;

                if (minX < minHeaderX) 
                {
                    minHeaderX = minX;
                    bestHeader = tb;
                }
            }
        }

        res.headerBlock = bestHeader;

        // 4. 自适应计算精确的分割边界 SplitX
        int computedSplitX;
        if (bestHeader != null) 
        {
            // 主聊天区边界在标题左侧约 20 像素，但必须大于等于会话列表最右边界
            computedSplitX = Math.max(minHeaderX - 25, maxSessionListX > 0 ? maxSessionListX + 5 : 0);
        } 
        else if (maxSessionListX > 0) 
        {
            computedSplitX = maxSessionListX + 15;
        } 
        else 
        {
            computedSplitX = (int) (imgWidth * 0.35);
        }

        res.splitX = computedSplitX;
        log.info("自适应版面切分成功：检测到电脑版多栏窗口，主聊天区起始边界 SplitX = {}（图片总宽度: {}, 会话列表右边界: {}, 标题: {}）", 
            computedSplitX, imgWidth, maxSessionListX, bestHeader != null ? bestHeader.getText() : "无");

        // 5. 提取所有属于主聊天区域的文本块
        for (TextBlock tb : allBlocks) 
        {
            if (getMinX(tb) >= computedSplitX) 
            {
                int minY = getMinY(tb);
                // 排除电脑桌面版窗口最底部的工具栏图标杂音（如输入框下方表情、截图、剪刀、AI等按钮 OCR 出来的单字/数字杂音）
                if (imgHeight >= 500 && minY >= imgHeight * 0.93) 
                {
                    String t = tb.getText() != null ? tb.getText().trim() : "";
                    if (t.length() <= 3 || !t.matches(".*[\\u4e00-\\u9fa5]{2,}.*")) 
                    {
                        continue;
                    }
                }
                res.chatBlocks.add(tb);
            }
        }

        return res;
    }

    public static int getMinX(TextBlock tb) 
    {
        int min = Integer.MAX_VALUE;
        if (tb == null || tb.getBoxPoint() == null) return 0;
        for (Point pt : tb.getBoxPoint()) 
        {
            min = Math.min(min, pt.getX());
        }
        return min;
    }

    public static int getMaxX(TextBlock tb) 
    {
        int max = Integer.MIN_VALUE;
        if (tb == null || tb.getBoxPoint() == null) return 0;
        for (Point pt : tb.getBoxPoint()) 
        {
            max = Math.max(max, pt.getX());
        }
        return max;
    }

    public static int getMinY(TextBlock tb) 
    {
        int min = Integer.MAX_VALUE;
        if (tb == null || tb.getBoxPoint() == null) return 0;
        for (Point pt : tb.getBoxPoint()) 
        {
            min = Math.min(min, pt.getY());
        }
        return min;
    }

    public static int getMaxY(TextBlock tb) 
    {
        int max = Integer.MIN_VALUE;
        if (tb == null || tb.getBoxPoint() == null) return 0;
        for (Point pt : tb.getBoxPoint()) 
        {
            max = Math.max(max, pt.getY());
        }
        return max;
    }
}
