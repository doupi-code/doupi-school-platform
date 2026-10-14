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

# 查找所有 8K 打印中，登记页数与物理文件页数相等的记录（可能未折半）
candidates = []

for r in rows:
    att = r["attachment"]
    if "/profile/" not in att: continue
    rel = urllib.parse.unquote(att.split("/profile/")[1])
    local = os.path.join(upload_base, rel.replace("/", os.sep))
    if not os.path.exists(local): continue
    ext = os.path.splitext(local)[1].lower()
    
    p = None
    if ext == ".docx":
        try:
            with zipfile.ZipFile(local, "r") as z:
                if "docProps/app.xml" in z.namelist():
                    root = ET.fromstring(z.read("docProps/app.xml"))
                    for elem in root.iter():
                        if elem.tag.endswith("Pages"): p = int(elem.text)
        except: pass
    elif ext == ".pdf":
        try:
            with open(local, "rb") as f: c = f.read()
            p = len(re.findall(rb"/Type\s*/Page\b", c))
            if p == 0:
                counts = re.findall(rb"/Count\s+(\d+)", c)
                if counts: p = max(int(x) for x in counts)
        except: pass

    if p is not None and r["paper_type"] == "8K" and p > 1:
        if r["page_count"] == p:
            candidates.append({**r, "physical_pages": p, "ext": ext})

print(f"=== 8K 打印中，物理页数 > 1 且登记页数 == 物理页数的记录 (共 {len(candidates)} 笔) ===")
for c in candidates:
    print(f"ID:{c['print_id']} {c['print_name']} | 格式:{c['ext']} | 份数:{c['print_count']} | 登记页={c['page_count']} | 物理页={c['physical_pages']} | 耗纸={c['total_pages']}")
