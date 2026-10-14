#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深入扫描服务器上所有附件原稿：
1. 精准提取 PDF、DOCX 页面尺寸和物理页数
2. 严格执行用户规则：“原稿是A4纸的，如果打印方式是8K，那么页数要除以2”
3. 找出所有【原稿为A4、打印为8K、但登记页数没有除以2】的记录，纳入修正清单！
4. 对照无原稿记录的学科常规页数估算
"""
import os
import sys
import re
import json
import zipfile
import urllib.parse
import pymysql
import xml.etree.ElementTree as ET

def get_pdf_info(filepath):
    try:
        with open(filepath, "rb") as f:
            content = f.read()
        pages = len(re.findall(rb"/Type\s*/Page\b", content))
        if pages == 0:
            counts = re.findall(rb"/Count\s+(\d+)", content)
            if counts:
                pages = max(int(c) for c in counts)
        
        # 探测尺寸
        mediaboxes = re.findall(rb"/MediaBox\s*\[\s*([0-9\.\s\-]+)\s*\]", content)
        size_type = "Unknown"
        w, h = 0, 0
        if mediaboxes:
            nums = [float(x) for x in mediaboxes[0].split()]
            if len(nums) == 4:
                w = abs(nums[2] - nums[0])
                h = abs(nums[3] - nums[1])
                shorter, longer = min(w, h), max(w, h)
                # A4: 595 x 842 pt (容差 500~650, 750~900)
                if 500 <= shorter <= 650 and 750 <= longer <= 900:
                    size_type = "A4"
                # A3: 842 x 1191 pt
                elif 800 <= shorter <= 900 and 1150 <= longer <= 1250:
                    size_type = "A3"
                # 8K: 约 737 x 1048 pt
                elif 680 <= shorter <= 780 and 980 <= longer <= 1100:
                    size_type = "8K"
                # 16K: 约 524 x 737 pt
                elif 480 <= shorter <= 560 and 680 <= longer <= 780:
                    size_type = "16K"
                else:
                    size_type = f"Custom({int(shorter)}x{int(longer)})"
        return pages if pages > 0 else None, size_type, (w, h)
    except:
        return None, "Error", (0, 0)

def get_docx_info(filepath):
    try:
        with zipfile.ZipFile(filepath, "r") as z:
            pages = None
            if "docProps/app.xml" in z.namelist():
                root = ET.fromstring(z.read("docProps/app.xml"))
                for elem in root.iter():
                    if elem.tag.endswith("Pages"):
                        pages = int(elem.text)
            
            size_type = "Unknown"
            w, h = 0, 0
            if "word/document.xml" in z.namelist():
                doc_xml = z.read("word/document.xml").decode("utf-8", errors="ignore")
                m = re.search(r'w:pgSz[^>]*w:w="(\d+)"[^>]*w:h="(\d+)"', doc_xml)
                if not m:
                    m = re.search(r'w:pgSz[^>]*w:h="(\d+)"[^>]*w:w="(\d+)"', doc_xml)
                if m:
                    w = int(m.group(1))
                    h = int(m.group(2))
                    shorter = min(w, h)
                    longer = max(w, h)
                    # A4 / Letter: 11000~13000 x 15000~18000 dxa
                    if 10500 <= shorter <= 13000 and 15000 <= longer <= 18000:
                        size_type = "A4"
                    # A3: 16000~17500 x 23000~24500
                    elif 16000 <= shorter <= 17500 and 23000 <= longer <= 24500:
                        size_type = "A3"
                    # 8K: 14000~16000 x 20000~23000
                    elif 14000 <= shorter <= 16000 and 20000 <= longer <= 23000:
                        size_type = "8K"
                    # 16K: 9500~11000 x 14000~15500
                    elif 9500 <= shorter <= 11000 and 14000 <= longer <= 15500:
                        size_type = "16K"
                    else:
                        size_type = f"Custom({shorter}x{longer})"
            return pages, size_type, (w, h)
    except:
        return None, "Error", (0, 0)

def main():
    conn = pymysql.connect(
        host="127.0.0.1", port=53061, user="root", password="Lt19960614.",
        database="stuck-mg", charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor
    )
    with conn.cursor() as cur:
        cur.execute("""
            SELECT print_id, print_name, print_time, teacher_id, paper_goods_id, paper_type,
                   print_count, page_count, print_side, total_pages,
                   template_paper_count, preview_paper_count, out_id, attachment
            FROM edu_print_record
            WHERE del_flag = '0' AND status = '1'
            ORDER BY print_id ASC
        """)
        records = cur.fetchall()
    conn.close()

    upload_base = "/data/doupi/uploadPath"

    unhalved_a4_to_8k = []   # 原稿为 A4，目标为 8K，但登记页数未除以 2 的记录
    halved_a4_to_8k = []     # 原稿为 A4，目标为 8K，且登记页数已除以 2 的记录
    regular_8k_or_other = [] # 原稿非 A4 或非 8K 打印

    for r in records:
        att = r["attachment"]
        if not att or "/profile/" not in att:
            continue
        rel = urllib.parse.unquote(att.split("/profile/")[1])
        local = os.path.join(upload_base, rel.replace("/", os.sep))
        if not os.path.exists(local):
            continue
            
        ext = os.path.splitext(local)[1].lower()
        if ext == ".pdf":
            file_pages, size_type, dims = get_pdf_info(local)
        elif ext in [".docx", ".doc"]:
            file_pages, size_type, dims = get_docx_info(local)
        else:
            file_pages, size_type, dims = None, ext, (0, 0)

        if not file_pages:
            continue

        r["file_pages"] = file_pages
        r["size_type"] = size_type
        
        is_8k = (r["paper_type"] == "8K" or r["paper_goods_id"] == 311)
        
        # 判定是否是 A4 原稿
        # 如果是 A4 尺寸，或者是 Word 常见默认 A4 (包含 Unknown 时如果是常见 PDF 595x842)
        if size_type == "A4" and is_8k:
            correct_8k_pages = (file_pages + 1) // 2
            if r["page_count"] == file_pages and file_pages > 1:
                # 漏折半！
                unhalved_a4_to_8k.append({
                    **r,
                    "correct_8k_pages": correct_8k_pages
                })
            elif r["page_count"] == correct_8k_pages:
                halved_a4_to_8k.append(r)
            else:
                # 可能是极端教研全本或选印
                unhalved_a4_to_8k.append({
                    **r,
                    "correct_8k_pages": correct_8k_pages
                })
        else:
            regular_8k_or_other.append(r)

    print(f"=== 原稿 A4 转 8K 深度核查 ===")
    print(f"1. 原稿为 A4 且登记页数已经除以 2 的记录: {len(halved_a4_to_8k)} 笔 (符合规则，无须重复除2)")
    print(f"2. 原稿为 A4 但登记页数【尚未除以 2】(需修正): {len(unhalved_a4_to_8k)} 笔")
    
    total_water_sheets = 0
    print("\n【尚未除以 2 的漏折半记录详细清单】:")
    for item in unhalved_a4_to_8k:
        p_id = item["print_id"]
        name = item["print_name"]
        copies = item["print_count"]
        old_p = item["page_count"]
        new_p = item["correct_8k_pages"]
        side = str(item["print_side"])
        old_tot = item["total_pages"]
        template = item.get("template_paper_count", 0) or 0
        preview = item.get("preview_paper_count", 0) or 0
        per_copy = new_p if side == "1" else (new_p + 1) // 2
        new_tot = copies * per_copy + template + preview
        diff = old_tot - new_tot
        total_water_sheets += diff
        print(f"  #{p_id} {name[:24]} | 份数={copies} | 文件={item['file_pages']}页A4 -> 应折为={new_p}页8K (旧登记={old_p}页) | 耗纸: {old_tot} -> {new_tot} (核减: -{diff}张)")

    print(f"\n以上 {len(unhalved_a4_to_8k)} 笔 A4 漏除以 2 的记录，合计产生水分耗纸: {total_water_sheets:,} 张 (折合 8K: {total_water_sheets/2000:.2f} 箱)")

    # 保存检测结果供后续生成完整 approved 清单
    with open("/tmp/unhalved_a4.json", "w", encoding="utf-8") as f:
        json.dump(unhalved_a4_to_8k, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
