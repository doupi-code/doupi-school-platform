#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import sys
import re
import zipfile
import urllib.parse
import pymysql
import xml.etree.ElementTree as ET

conn = pymysql.connect(
    host="127.0.0.1", port=53061, user="root", password="Lt19960614.",
    database="stuck-mg", charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor
)
with conn.cursor() as cur:
    cur.execute("""
        SELECT print_id, print_name, print_count, page_count, print_side, total_pages, attachment, paper_type
        FROM edu_print_record
        WHERE del_flag = '0' AND status = '1' AND attachment IS NOT NULL AND attachment != ''
        ORDER BY print_id ASC
    """)
    rows = cur.fetchall()
conn.close()

upload_base = "/data/doupi/uploadPath"

print("=== 检查非 A4/标准尺寸的 Word 和 PDF 文件 ===")
for r in rows:
    att = r["attachment"]
    if "/profile/" not in att:
        continue
    rel = urllib.parse.unquote(att.split("/profile/")[1])
    local = os.path.join(upload_base, rel.replace("/", os.sep))
    if not os.path.exists(local):
        continue
    ext = os.path.splitext(local)[1].lower()
    
    file_pages = None
    width = None
    height = None
    desc = ""
    
    if ext == ".docx":
        try:
            with zipfile.ZipFile(local, "r") as z:
                if "docProps/app.xml" in z.namelist():
                    root = ET.fromstring(z.read("docProps/app.xml"))
                    for elem in root.iter():
                        if elem.tag.endswith("Pages"):
                            file_pages = int(elem.text)
                if "word/document.xml" in z.namelist():
                    doc_xml = z.read("word/document.xml").decode("utf-8", errors="ignore")
                    m = re.search(r'w:pgSz[^>]*w:w="(\d+)"[^>]*w:h="(\d+)"', doc_xml)
                    if not m:
                        m = re.search(r'w:pgSz[^>]*w:h="(\d+)"[^>]*w:w="(\d+)"', doc_xml)
                    if m:
                        width = int(m.group(1))
                        height = int(m.group(2))
        except Exception as e:
            pass
    elif ext == ".pdf":
        try:
            with open(local, "rb") as f:
                content = f.read()
            pages = len(re.findall(rb"/Type\s*/Page\b", content))
            if pages == 0:
                counts = re.findall(rb"/Count\s+(\d+)", content)
                if counts:
                    pages = max(int(c) for c in counts)
            file_pages = pages if pages > 0 else None
            mediaboxes = re.findall(rb"/MediaBox\s*\[\s*([0-9\.\s\-]+)\s*\]", content)
            if mediaboxes:
                nums = [float(x) for x in mediaboxes[0].split()]
                if len(nums) == 4:
                    width = abs(nums[2] - nums[0])
                    height = abs(nums[3] - nums[1])
        except Exception as e:
            pass

    # 检查是否是 A4/Letter 尺寸但 page_count 没有折半的记录
    # 对于 A4 docx: width ~ 11906, height ~ 16838
    # 对于 Letter docx: width ~ 12240, height ~ 15840
    # 对于 A4 pdf: width ~ 595, height ~ 842
    is_a4_letter = False
    if width and height:
        shorter = min(width, height)
        longer = max(width, height)
        if ext == ".docx":
            if (11000 <= shorter <= 13000 and 15000 <= longer <= 18000):
                is_a4_letter = True
        elif ext == ".pdf":
            if (550 <= shorter <= 650 and 780 <= longer <= 880):
                is_a4_letter = True
                
    if is_a4_letter and r["paper_type"] == "8K" and file_pages:
        # 如果登记页数等于文件页数，且大于1，说明漏除了2！
        if r["page_count"] == file_pages and file_pages > 1:
            print(f"【发现漏折半记录!】ID:{r['print_id']} {r['print_name']} | 文件页数:{file_pages} | 登记页数:{r['page_count']} | 耗纸:{r['total_pages']} | 纸型:{r['paper_type']}")
        elif r["page_count"] != (file_pages + 1) // 2:
            print(f"【其他不匹配】ID:{r['print_id']} {r['print_name']} | 文件页数:{file_pages} | 登记页数:{r['page_count']} | 耗纸:{r['total_pages']}")
