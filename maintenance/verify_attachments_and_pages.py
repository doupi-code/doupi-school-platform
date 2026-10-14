#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
核对全量 908 笔文印记录的附件原稿与实际页数：
1. 原稿存在且页数对得上 -> 不改，确认保留
2. 无原稿文件 -> 识别学科与类型（答案/解析/试卷/讲义/作业），给出学科常规推荐页数
"""
import os
import sys
import re
import zipfile
import xml.etree.ElementTree as ET
import urllib.parse
import pymysql

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def get_pdf_page_count(filepath):
    try:
        with open(filepath, "rb") as f:
            content = f.read()
        # 简单高效的 PDF /Type /Page 匹配
        pages = len(re.findall(rb"/Type\s*/Page\b", content))
        if pages > 0:
            return pages
        # 兜底通过 /Count 匹配
        counts = re.findall(rb"/Count\s+(\d+)", content)
        if counts:
            return max(int(c) for c in counts)
        return None
    except Exception:
        return None

def get_docx_page_count(filepath):
    try:
        with zipfile.ZipFile(filepath, "r") as z:
            if "docProps/app.xml" in z.namelist():
                app_xml = z.read("docProps/app.xml")
                root = ET.fromstring(app_xml)
                for elem in root.iter():
                    if elem.tag.endswith("Pages"):
                        p = int(elem.text)
                        if p > 0:
                            return p
        return None
    except Exception:
        return None

# 连接数据库
conn = pymysql.connect(
    host="127.0.0.1", port=53061, user="root", password="Lt19960614.",
    database="stuck-mg", charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor
)

with conn.cursor() as cur:
    cur.execute("""
        SELECT print_id, print_name, print_time, teacher_id, paper_goods_id,
               print_count, page_count, print_side, total_pages, attachment
        FROM edu_print_record
        WHERE del_flag = '0' AND status = '1'
        ORDER BY print_id ASC
    """)
    records = cur.fetchall()
conn.close()

upload_base = "/data/doupi/uploadPath"

# 统计分类
matched_with_file = []      # 有原稿且页数一致
diff_with_file = []         # 有原稿但页数不一致
no_file_records = []        # 无原稿附件（或文件在磁盘丢失）

for r in records:
    p_id = r["print_id"]
    name = r["print_name"] or ""
    reg_pages = r["page_count"]
    attachment = r["attachment"]
    
    file_found = False
    actual_pages = None
    local_path = None

    if attachment and "/profile/" in attachment:
        # 提取相对路径: /profile/upload/2026/... -> upload/2026/...
        rel_part = attachment.split("/profile/")[1]
        rel_part = urllib.parse.unquote(rel_part)
        local_path = os.path.join(upload_base, rel_part.replace("/", os.sep))
        
        # 在本地检查若无则尝试远程
        if os.path.exists(local_path):
            file_found = True
            ext = os.path.splitext(local_path)[1].lower()
            if ext == ".pdf":
                actual_pages = get_pdf_page_count(local_path)
            elif ext in [".docx", ".doc"]:
                actual_pages = get_docx_page_count(local_path)

    r_info = {
        **r,
        "file_found": file_found,
        "actual_pages": actual_pages,
        "local_path": local_path
    }

    if file_found and actual_pages is not None:
        if actual_pages == reg_pages:
            matched_with_file.append(r_info)
        else:
            diff_with_file.append(r_info)
    else:
        no_file_records.append(r_info)

print(f"=== 全量 908 条文印记录原稿与页数核查基准 ===")
print(f"1. 有原稿文件且页数一致: {len(matched_with_file)} 笔 (严格遵循规则: 绝不修改，保留原值)")
print(f"2. 有原稿文件但页数不符: {len(diff_with_file)} 笔 (原稿真实页数已探明，待核定)")
print(f"3. 无原稿文件(或文件丢失): {len(no_file_records)} 笔 (需按该学科常规答案/试卷页面估算)")
