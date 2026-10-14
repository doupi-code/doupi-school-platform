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
        
        # 获取页数
        pages = len(re.findall(rb"/Type\s*/Page\b", content))
        if pages == 0:
            counts = re.findall(rb"/Count\s+(\d+)", content)
            if counts:
                pages = max(int(c) for c in counts)
        
        # 探测 MediaBox: /MediaBox [ 0 0 595.32 841.92 ]
        mediaboxes = re.findall(rb"/MediaBox\s*\[\s*([0-9\.\s\-]+)\s*\]", content)
        page_size_name = "Unknown"
        if mediaboxes:
            nums = [float(x) for x in mediaboxes[0].split()]
            if len(nums) == 4:
                w = abs(nums[2] - nums[0])
                h = abs(nums[3] - nums[1])
                shorter, longer = min(w, h), max(w, h)
                # A4: 595 x 842 pt
                if 570 <= shorter <= 620 and 820 <= longer <= 865:
                    page_size_name = "A4"
                # A3: 842 x 1191 pt
                elif 820 <= shorter <= 865 and 1170 <= longer <= 1210:
                    page_size_name = "A3"
                # 8K: 约 737 x 1048 pt (260 x 370 mm)
                elif 700 <= shorter <= 780 and 1000 <= longer <= 1080:
                    page_size_name = "8K"
                # 16K: 约 524 x 737 pt (185 x 260 mm)
                elif 500 <= shorter <= 560 and 700 <= longer <= 780:
                    page_size_name = "16K"
                else:
                    page_size_name = f"Custom({int(shorter)}x{int(longer)})"

        return pages if pages > 0 else None, page_size_name
    except Exception as e:
        return None, "Error"

def analyze_docx(filepath):
    try:
        with zipfile.ZipFile(filepath, "r") as z:
            pages = None
            if "docProps/app.xml" in z.namelist():
                app_xml = z.read("docProps/app.xml")
                root = ET.fromstring(app_xml)
                for elem in root.iter():
                    if elem.tag.endswith("Pages"):
                        pages = int(elem.text)
            
            page_size_name = "Unknown"
            if "word/document.xml" in z.namelist():
                doc_xml = z.read("word/document.xml").decode("utf-8", errors="ignore")
                # <w:pgSz w:w="11906" w:h="16838"/> (dxa, 1mm = 56.7 dxa)
                m = re.search(r'w:pgSz[^>]*w:w="(\d+)"[^>]*w:h="(\d+)"', doc_xml)
                if not m:
                    m = re.search(r'w:pgSz[^>]*w:h="(\d+)"[^>]*w:w="(\d+)"', doc_xml)
                if m:
                    w = int(m.group(1))
                    h = int(m.group(2))
                    shorter, longer = min(w, h), max(w, h)
                    # A4: 11906 x 16838
                    if 11000 <= shorter <= 12500 and 16000 <= longer <= 17500:
                        page_size_name = "A4"
                    # A3: 16838 x 23811
                    elif 16000 <= shorter <= 17500 and 23000 <= longer <= 24500:
                        page_size_name = "A3"
                    # 8K: 约 14740 x 20976
                    elif 14000 <= shorter <= 15500 and 20000 <= longer <= 22000:
                        page_size_name = "8K"
                    # 16K: 约 10488 x 14740
                    elif 9500 <= shorter <= 11000 and 14000 <= longer <= 15500:
                        page_size_name = "16K"
                    else:
                        page_size_name = f"Custom({shorter}x{longer})"
            return pages, page_size_name
    except Exception as e:
        return None, "Error"

def main():
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
    
    # 统计分类
    a4_for_8k_list = []
    other_cases = []
    
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
            pages, size = analyze_pdf(local)
        elif ext in [".docx", ".doc"]:
            pages, size = analyze_docx(local)
        else:
            pages, size = None, ext

        if pages is None:
            continue
            
        r["file_pages"] = pages
        r["file_size"] = size
        
        is_target_8k = (r["paper_type"] == "8K" or r["paper_goods_id"] == 311)
        if size == "A4" and is_target_8k:
            a4_for_8k_list.append(r)
        else:
            other_cases.append(r)

    print(f"=== 原稿纸型与打印规格分析报告 ===")
    print(f"共成功探测物理文件: {len(a4_for_8k_list) + len(other_cases)} 个")
    print(f"其中【原稿是 A4 且目标打印为 8K】的文件数: {len(a4_for_8k_list)} 个")
    print(f"其他文件数(8K原稿、16K打印等): {len(other_cases)} 个")
    
    # 针对 a4_for_8k_list 进行深入分类：
    # 1. 登记的 page_count 与 物理 A4 页数的关系
    same_as_a4 = []      # 登记页数 == A4 页数 (说明登记人员直接照抄了 A4 页数，没有除以 2！)
    half_of_a4 = []      # 登记页数 == ceil(A4 页数 / 2) (说明登记人员录入时已经除以了 2)
    other_relation = []  # 其它情况
    
    for r in a4_for_8k_list:
        reg_p = r["page_count"]
        f_p = r["file_pages"]
        half_p = (f_p + 1) // 2
        if reg_p == f_p:
            same_as_a4.append(r)
        elif reg_p == half_p:
            half_of_a4.append(r)
        else:
            other_relation.append(r)
            
    print(f"\n--- 【原稿 A4 打印 8K】登记页数特征 ---")
    print(f"1. 登记页数 == A4 文件页数 (直接抄录A4页数，尚未折半): {len(same_as_a4)} 笔")
    print(f"2. 登记页数 == A4 文件页数 / 2 (录入时已经折半为8K页数): {len(half_of_a4)} 笔")
    print(f"3. 登记页数与 A4 文件页数呈其它关系(如选印/极端教研解析): {len(other_relation)} 笔")
    
    print("\n样例展示 1 (登记页数 == A4 文件页数，导致耗纸翻倍的典型记录):")
    for r in same_as_a4[:10]:
        print(f"  #{r['print_id']} {r['print_name'][:20]} | 份数={r['print_count']} | A4原稿={r['file_pages']}页 | 登记page_count={r['page_count']} | 当前耗纸={r['total_pages']} | 印刷方式={r['print_side']}")

    print("\n样例展示 2 (录入时登记页数已经除以2的记录):")
    for r in half_of_a4[:10]:
        print(f"  #{r['print_id']} {r['print_name'][:20]} | 份数={r['print_count']} | A4原稿={r['file_pages']}页 | 登记page_count={r['page_count']} | 当前耗纸={r['total_pages']} | 印刷方式={r['print_side']}")

    print("\n样例展示 3 (其它关系的记录):")
    for r in other_relation[:10]:
        print(f"  #{r['print_id']} {r['print_name'][:20]} | 份数={r['print_count']} | A4原稿={r['file_pages']}页 | 登记page_count={r['page_count']} | 当前耗纸={r['total_pages']} | 印刷方式={r['print_side']}")

if __name__ == "__main__":
    main()
