#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
在数据库中全面清理所有的“估算”、“修正”等临时提示：
1. edu_print_record.remark: 移除 '[估算修正]'、'估算数据' 等提示，保留教师原始正常备注
2. edu_stock_out.remark: 规范化为标准出库备注 '关联印刷登记【xxx】用纸出库'
现在这些数据全部作为学校的正式文印登记数据！
"""
import re
import pymysql

conn = pymysql.connect(
    host="127.0.0.1", port=53061, user="root", password="Lt19960614.",
    database="stuck-mg", charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor,
    autocommit=False
)

with conn.cursor() as cur:
    # 1. 清理 edu_print_record 的 remark
    cur.execute("""
        SELECT print_id, remark 
        FROM edu_print_record 
        WHERE remark LIKE '%估算%' OR remark LIKE '%修正%'
    """)
    records = cur.fetchall()
    print(f"待清理 remark 的 edu_print_record 记录数: {len(records)} 笔")

    cleaned_print_cnt = 0
    for r in records:
        pid = r["print_id"]
        rem = r["remark"] or ""
        # 移除 '[估算修正]'、'[估算]'、'估算修正'、'估算数据' 等
        new_rem = rem
        new_rem = new_rem.replace("[估算修正]", "")
        new_rem = new_rem.replace("估算修正", "")
        new_rem = new_rem.replace("，估算数据", "")
        new_rem = new_rem.replace("估算数据", "")
        new_rem = new_rem.strip()
        new_rem = re.sub(r"\s+", " ", new_rem)

        if new_rem != rem:
            cur.execute("UPDATE edu_print_record SET remark = %s WHERE print_id = %s", (new_rem if new_rem else None, pid))
            cleaned_print_cnt += 1

    print(f"已清理 edu_print_record 中的 remark: {cleaned_print_cnt} 笔")

    # 2. 清理 edu_stock_out 的 remark
    cur.execute("""
        SELECT out_id, remark 
        FROM edu_stock_out 
        WHERE remark LIKE '%规范估算后%' OR remark LIKE '%回退恢复原始登记%'
    """)
    stock_outs = cur.fetchall()
    print(f"待清理 remark 的 edu_stock_out 记录数: {len(stock_outs)} 笔")

    cleaned_out_cnt = 0
    for s in stock_outs:
        oid = s["out_id"]
        rem = s["remark"] or ""
        # 提取 '关联印刷登记【xxx】用纸出库'
        m = re.search(r"(关联印刷登记【.*?】用纸出库)", rem)
        if m:
            clean_rem = m.group(1)
        else:
            clean_rem = rem
        cur.execute("UPDATE edu_stock_out SET remark = %s WHERE out_id = %s", (clean_rem, oid))
        cleaned_out_cnt += 1

    print(f"已清理 edu_stock_out 中的 remark: {cleaned_out_cnt} 笔")

    conn.commit()
    print("=== [DONE] 数据库中所有“估算/修正”临时提示已全部彻底清除！===")

conn.close()
