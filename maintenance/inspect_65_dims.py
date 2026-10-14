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

def get_docx_dim(local):
    try:
        with zipfile.ZipFile(local, "r") as z:
            doc_xml = z.read("word/document.xml").decode("utf-8", errors="ignore")
            m = re.search(r'w:pgSz[^>]*w:w="(\d+)"[^>]*w:h="(\d+)"', doc_xml)
            if not m:
                m = re.search(r'w:pgSz[^>]*w:h="(\d+)"[^>]*w:w="(\d+)"', doc_xml)
            if m:
                w, h = int(m.group(1)), int(m.group(2))
                return min(w, h), max(w, h)
    except:
        pass
    return None, None

def get_pdf_dim(local):
    try:
        with open(local, "rb") as f:
            c = f.read()
        m = re.findall(rb"/MediaBox\s*\[\s*([0-9\.\s\-]+)\s*\]", c)
        if m:
            nums = [float(x) for x in m[0].split()]
            w = abs(nums[2] - nums[0])
            h = abs(nums[3] - nums[1])
            return min(w, h), max(w, h)
    except:
        pass
    return None, None

print("=== 详细检测这 65 笔记录的物理文件尺寸 ===")
for r in rows:
    att = r["attachment"]
    if "/profile/" not in att: continue
    rel = urllib.parse.unquote(att.split("/profile/")[1])
    local = os.path.join(upload_base, rel.replace("/", os.sep))
    if not os.path.exists(local): continue
    ext = os.path.splitext(local)[1].lower()
    
    p = None
    w, h = None, None
    if ext == ".docx":
        try:
            with zipfile.ZipFile(local, "r") as z:
                if "docProps/app.xml" in z.namelist():
                    root = ET.fromstring(z.read("docProps/app.xml"))
                    for elem in root.iter():
                        if elem.tag.endswith("Pages"): p = int(elem.text)
        except: pass
        w, h = get_docx_dim(local)
    elif ext == ".pdf":
        try:
            with open(local, "rb") as f: c = f.read()
            p = len(re.findall(rb"/Type\s*/Page\b", c))
            if p == 0:
                counts = re.findall(rb"/Count\s+(\d+)", c)
                if counts: p = max(int(x) for x in counts)
        except: pass
        w, h = get_pdf_dim(local)

    if p is not None and r["paper_type"] == "8K" and p > 1 and r["page_count"] == p:
        size_name = "Unknown"
        if ext == ".docx" and w and h:
            if 10000 <= w <= 13500 and 15000 <= h <= 18500:
                size_name = "A4/Letter"
            elif 14000 <= w <= 16500 and 20000 <= h <= 23500:
                size_name = "8K"
            elif 16000 <= w <= 18000 and 23000 <= h <= 25500:
                size_name = "A3"
            else:
                size_name = f"Custom({w}x{h})"
        elif ext == ".pdf" and w and h:
            if 500 <= w <= 650 and 750 <= h <= 900:
                size_name = "A4"
            elif 680 <= w <= 780 and 980 <= h <= 1100:
                size_name = "8K"
            elif 800 <= w <= 900 and 1150 <= h <= 1250:
                size_name = "A3"
            else:
                size_name = f"Custom({int(w)}x{int(h)})"

        print(f"ID:{r['print_id']:<4} | 纸型:{size_name:<10} | 原页数:{p:<2} | 份数:{r['print_count']:<3} | 耗纸:{r['total_pages']:<4} | 名称:{r['print_name'][:25]}")
