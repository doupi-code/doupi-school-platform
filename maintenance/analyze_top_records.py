#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深入分析文印耗纸前 50 笔超大异常记录，识别全本解析版/课本误录、大页数、大份数及重复记录
"""
import sys
import json
import pymysql

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

conn = pymysql.connect(
    host="127.0.0.1", port=53061, user="root", password="Lt19960614.",
    database="stuck-mg", charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor
)

with conn.cursor() as cur:
    cur.execute("""
        SELECT 
            r.print_id, r.print_name, r.print_time, r.teacher_id, 
            COALESCE(u.nick_name, r.teacher_id) as teacher_name,
            r.class_name, r.paper_goods_id,
            CASE WHEN r.paper_goods_id = 311 THEN '8K' ELSE '16K' END as paper_type,
            r.print_count, r.page_count, r.print_side, r.total_pages,
            r.attachment
        FROM edu_print_record r
        LEFT JOIN sys_user u ON r.teacher_id = u.user_id
        WHERE r.del_flag = '0' AND r.status = '1'
        ORDER BY r.total_pages DESC
        LIMIT 50
    """)
    top50 = cur.fetchall()

    cur.execute("SELECT SUM(total_pages) as all_sheets FROM edu_print_record WHERE del_flag = '0' AND status = '1'")
    all_sheets = cur.fetchone()["all_sheets"]

conn.close()

total_sheets_top50 = sum(r["total_pages"] for r in top50)
print(f"Top 50 耗纸总张数: {total_sheets_top50} 张, 折合 8K: {total_sheets_top50 / 2000:.2f} 箱")
print(f"全系统总耗纸: {all_sheets} 张, Top 50 占比: {total_sheets_top50 / all_sheets * 100:.2f}%\n")

classified = []
for idx, r in enumerate(top50, 1):
    name = r["print_name"] or ""
    copies = r["print_count"]
    pages = r["page_count"]
    side = "双面" if str(r["print_side"]) == "2" else "单面"
    sheets = r["total_pages"]
    t_name = r["teacher_name"]
    time_str = str(r["print_time"])

    # 识别分类
    is_solution = any(k in name for k in ["解析", "教师版", "答案", "全解", "详解"])
    is_textbook = any(k in name for k in ["电子课本", "教材", "普通高中教科书", "必修", "选修"])
    is_rar = any(k in name for k in [".rar", ".zip", "压缩包"])
    is_large_page = pages >= 10
    is_large_copies = copies >= 200

    issue_type = []
    if is_solution:
        issue_type.append("解析/答案整本印")
    if is_textbook:
        issue_type.append("电子教材整本印")
    if is_rar:
        issue_type.append("压缩包虚填页数")
    if is_large_page and not is_solution and not is_textbook:
        issue_type.append("讲义超大页数(>=10页)")
    if is_large_copies:
        issue_type.append("超大份数(>=200份)")
    if not issue_type:
        issue_type.append("常规练习但份数偏多")

    classified.append({
        "rank": idx,
        "print_id": r["print_id"],
        "name": name,
        "teacher": t_name,
        "time": time_str,
        "paper_type": r["paper_type"],
        "copies": copies,
        "pages": pages,
        "side": side,
        "sheets": sheets,
        "boxes_8k": round(sheets / 2000, 2),
        "issues": "、".join(issue_type),
        "attachment": r["attachment"]
    })

# 输出格式化 Markdown 表格
print("| 排名 | 单号 ID | 材料名称 | 教师 | 份数 | 页数 | 面 | 耗纸(张) | 折合箱(8K) | 疑似虚高主因 |")
print("|---|---|---|---|---:|---:|:---:|---:|---:|---|")
for c in classified:
    short_name = (c["name"][:26] + "..") if len(c["name"]) > 28 else c["name"]
    print(f"| {c['rank']} | #{c['print_id']} | {short_name} | {c['teacher']} | {c['copies']} | {c['pages']} | {c['side']} | {c['sheets']} | {c['boxes_8k']} | {c['issues']} |")

with open("maintenance/top50_analysis.json", "w", encoding="utf-8") as f:
    json.dump({
        "total_sheets_top50": int(total_sheets_top50),
        "all_sheets": int(all_sheets),
        "ratio": round(total_sheets_top50 / all_sheets * 100, 2),
        "records": classified
    }, f, indent=2, ensure_ascii=False)
