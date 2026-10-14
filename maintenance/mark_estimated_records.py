#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
在 edu_print_record 中对已核准生效的估算修正记录同步标注 remark '[估算修正]'
仅针对 PAPER-20261014-02-CLEANUP 批次中生效（且未被后续回退）的估算记录
"""
import pymysql

conn = pymysql.connect(
    host="127.0.0.1", port=53061, user="root", password="Lt19960614.",
    database="stuck-mg", charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor,
    autocommit=False
)

with conn.cursor() as cur:
    # 查出第二轮被估算修改、且第三轮未回退的记录 ID
    cur.execute("""
        SELECT DISTINCT l1.record_id
        FROM edu_repair_log l1
        WHERE l1.batch_id = 'PAPER-20261014-02-CLEANUP'
          AND l1.is_estimated = 1
          AND l1.record_id NOT IN (
              SELECT record_id FROM edu_repair_log WHERE batch_id = 'PAPER-20261014-03-REVERT-INCREASED'
          )
    """)
    rows = cur.fetchall()
    estimated_ids = [int(r["record_id"]) for r in rows]
    print(f"当前生效的真实估算记录总数: {len(estimated_ids)} 笔")

    updated_cnt = 0
    for p_id in estimated_ids:
        cur.execute("SELECT remark FROM edu_print_record WHERE print_id = %s", (p_id,))
        row = cur.fetchone()
        old_remark = row["remark"] or ""
        if "估算修正" not in old_remark:
            new_remark = (old_remark + " [估算修正]").strip()
            cur.execute("UPDATE edu_print_record SET remark = %s WHERE print_id = %s", (new_remark, p_id))
            updated_cnt += 1

    conn.commit()
    print(f"已在 edu_print_record 中为 {updated_cnt} 笔记录的 remark 同步标注 '[估算修正]'")

conn.close()
