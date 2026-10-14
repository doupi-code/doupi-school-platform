#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import sys
import re
import zipfile
import urllib.parse
import pymysql
import xml.etree.ElementTree as ET

def analyze_pdf(filepath):
    try:
        with open(filepath, "rb") as f:
            content = f.read()
        pages = len(re.findall(rb"/Type\s*/Page\b", content))
        if pages == 0:
            counts = re.findall(rb"/Count\s+(\d+)", content)
            if counts:
                pages = max(int(c) for c in counts)
        mediaboxes = re.findall(rb"/MediaBox\s*\[\s*([0-9\.\s\-]+)\s*\]", content)
        page_size_name = "Unknown"
        if mediaboxes:
            nums = [float(x) for x in mediaboxes[0].split()]
            if len(nums) == 4:
                w = abs(nums[2] - nums[0])
                h = abs(nums[3] - nums[1])
                shorter, longer = min(w, h), max(w, h)
                if 570 <= shorter <= 620 and 820 <= longer <= 865:
                    page_size_name = "A4"
                elif 820 <= shorter <= 865 and 1170 <= longer <= 1210:
                    page_size_name = "A3"
                elif 700 <= shorter <= 780 and 1000 <= longer <= 1080:
                    page_size_name = "8K"
                elif 500 <= shorter <= 560 and 700 <= longer <= 780:
                    page_size_name = "16K"
                else:
                    page_size_name = f"Custom({int(shorter)}x{int(longer)})"
        return pages if pages > 0 else None, page_size_name
    except:
        return None, "Error"

def analyze_docx(filepath):
    try:
        with zipfile.ZipFile(filepath, "r") as z:
            pages = None
            if "docProps/app.xml" in z.namelist():
                root = ET.fromstring(z.read("docProps/app.xml"))
                for elem in root.iter():
                    if elem.tag.endswith("Pages"):
                        pages = int(elem.text)
            page_size_name = "Unknown"
            if "word/document.xml" in z.namelist():
                doc_xml = z.read("word/document.xml").decode("utf-8", errors="ignore")
                m = re.search(r'w:pgSz[^>]*w:w="(\d+)"[^>]*w:h="(\d+)"', doc_xml)
                if not m:
                    m = re.search(r'w:pgSz[^>]*w:h="(\d+)"[^>]*w:w="(\d+)"', doc_xml)
                if m:
                    shorter = min(int(m.group(1)), int(m.group(2)))
                    longer = max(int(m.group(1)), int(m.group(2)))
                    if 11000 <= shorter <= 12500 and 16000 <= longer <= 17500:
                        page_size_name = "A4"
                    elif 16000 <= shorter <= 17500 and 23000 <= longer <= 24500:
                        page_size_name = "A3"
                    elif 14000 <= shorter <= 15500 and 20000 <= longer <= 22000:
                        page_size_name = "8K"
                    elif 9500 <= shorter <= 11000 and 14000 <= longer <= 15500:
                        page_size_name = "16K"
                    else:
                        page_size_name = f"Custom({shorter}x{longer})"
            return pages, page_size_name
    except:
        return None, "Error"

conn = pymysql.connect(
    host="127.0.0.1", port=53061, user="root", password="Lt19960614.",
    database="stuck-mg", charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor
)
with conn.cursor() as cur:
    cur.execute("""
        SELECT print_id, print_name, print_time, teacher_id, paper_goods_id, paper_type,
               print_count, page_count, print_side, total_pages, attachment
        FROM edu_print_record
        WHERE del_flag = '0' AND status = '1'
        ORDER BY print_id ASC
    """)
    records = cur.fetchall()
conn.close()

upload_base = "/data/doupi/uploadPath"

categories = {}

for r in records:
    att = r["attachment"]
    if not att or "/profile/" not in att:
        categories.setdefault("无附件记录", []).append(r)
        continue
    rel = urllib.parse.unquote(att.split("/profile/")[1])
    local = os.path.join(upload_base, rel.replace("/", os.sep))
    if not os.path.exists(local):
        categories.setdefault("附件物理文件不存在", []).append(r)
        continue
    
    ext = os.path.splitext(local)[1].lower()
    if ext == ".pdf":
        p, s = analyze_pdf(local)
    elif ext in [".docx", ".doc"]:
        p, s = analyze_docx(local)
    else:
        p, s = None, ext
    
    r["file_pages"] = p
    r["file_size"] = s
    
    key = f"原稿[{s}] -> 目标[{r['paper_type']}]"
    categories.setdefault(key, []).append(r)

print("=== 全量文印记录原稿与目标规格分布 ===")
for k, v in sorted(categories.items(), key=lambda x: len(x[1]), reverse=True):
    print(f"{k}: {len(v)} 笔")

print("\n--- 详细核查各类别中【登记页数与原稿页数】的比值情况 ---")
for k in ["原稿[A4] -> 目标[8K]", "原稿[8K] -> 目标[8K]", "原稿[A3] -> 目标[8K]", "原稿[A4] -> 目标[16K]", "原稿[16K] -> 目标[16K]"]:
    if k in categories:
        items = categories[k]
        match_eq = sum(1 for x in items if x.get("file_pages") == x["page_count"])
        match_half = sum(1 for x in items if x.get("file_pages") is not None and x["page_count"] == (x["file_pages"] + 1) // 2)
        match_other = len(items) - match_eq - match_half
        print(f"\n{k} (共 {len(items)} 笔):")
        print(f"  - 登记页数 == 物理页数: {match_eq} 笔")
        print(f"  - 登记页数 == 物理页数 / 2: {match_half} 笔")
        print(f"  - 其他情况: {match_other} 笔")
        if match_other > 0:
            print("  样例 (其他情况):")
            for x in [item for item in items if item.get("file_pages") != item["page_count"] and item["page_count"] != (item.get("file_pages", 0) + 1) // 2][:5]:
                print(f"    #{x['print_id']} {x['print_name'][:20]} | 物理页={x.get('file_pages')} | 登记页={x['page_count']} | 耗纸={x['total_pages']}")
