#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
精确提取需要复核并还原的记录：
1. 超出 7 月 5 日范围的越界历史记录: 484, 485, 491
2. 被上一轮固定规则上调耗纸的 35 条记录 (合计上调 1318 张)
从 edu_repair_log 中读取真实 before_json 镜像，确认准确性
"""
import json
import pymysql

conn = pymysql.connect(
    host="127.0.0.1", port=53061, user="root", password="Lt19960614.",
    database="stuck-mg", charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor
)

# 目标记录集合
target_ids = {
    371, 381, 424, 484, 485, 491, 505, 507, 551, 567, 716, 720, 727, 729, 737,
    909, 911, 913, 914, 916, 917, 922, 950, 952, 1034, 1036, 1038, 1039,
    1048, 1049, 1050, 1051, 1052, 1053, 1054, 1055, 1073
}

with conn.cursor() as cur:
    cur.execute("""
        SELECT id, batch_id, record_id, before_json, after_json, reason, is_estimated, create_time
        FROM edu_repair_log
        WHERE batch_id = 'PAPER-20261014-02-CLEANUP'
          AND record_id IN %s
        ORDER BY CAST(record_id AS UNSIGNED) ASC
    """, (tuple(str(x) for x in target_ids),))
    logs = cur.fetchall()

    # 查当前数据库中这些记录的现状
    cur.execute("""
        SELECT print_id, print_name, print_time, print_count, page_count, print_side, total_pages, out_id
        FROM edu_print_record
        WHERE print_id IN %s
        ORDER BY print_id ASC
    """, (tuple(target_ids),))
    current_records = {r["print_id"]: r for r in cur.fetchall()}

conn.close()

print(f"=== 提取需回退记录日志镜像 ===")
print(f"目标记录数: {len(target_ids)} 笔，成功在审计日志找到: {len(logs)} 笔")

revert_list = []
total_sheets_to_reduce = 0

for l in logs:
    p_id = int(l["record_id"])
    before_obj = json.loads(l["before_json"])
    after_obj = json.loads(l["after_json"])
    curr = current_records.get(p_id)

    old_p = before_obj["page_count"]
    old_tot = before_obj["total_pages"]
    curr_p = curr["page_count"]
    curr_tot = curr["total_pages"]
    
    diff = curr_tot - old_tot
    total_sheets_to_reduce += diff

    is_out_of_range = (p_id in (484, 485, 491))
    reason = "超出7月5日核查范围" if is_out_of_range else "撤销固定规则上调，恢复原始登记"

    revert_list.append({
        "print_id": p_id,
        "print_name": curr["print_name"],
        "print_time": str(curr["print_time"]),
        "print_count": curr["print_count"],
        "print_side": curr["print_side"],
        "current_page_count": curr_p,
        "current_total_pages": curr_tot,
        "target_page_count": old_p,
        "target_total_pages": old_tot,
        "diff_sheets": -diff,
        "out_id": curr["out_id"],
        "category": "越界记录" if is_out_of_range else "上调回退",
        "reason": reason
    })

print(f"\n按类别统计:")
out_of_range_cnt = sum(1 for x in revert_list if x["category"] == "越界记录")
increased_cnt = sum(1 for x in revert_list if x["category"] == "上调回退")
print(f"1. 越界记录 (7月5日之前): {out_of_range_cnt} 笔")
print(f"2. 撤销上调记录: {increased_cnt} 笔")
print(f"3. 回退后将从当前账面减少耗纸: {total_sheets_to_reduce:,} 张 (折合 8K: {total_sheets_to_reduce / 2000:.2f} 箱)")

with open("maintenance/approved_revert_cleanup.json", "w", encoding="utf-8") as f:
    json.dump({
        "batch_id": "PAPER-20261014-03-REVERT-INCREASED",
        "operator": "admin_safety_fix",
        "fact_summary": f"回退3条超出7月5日范围的历史记录以及34条被固定规则错误上调的记录，合计从当前账面核减{total_sheets_to_reduce}张纸，恢复到修改前原始值",
        "records": revert_list
    }, f, ensure_ascii=False, indent=2)

print("回退审批清单已生成: maintenance/approved_revert_cleanup.json")
