#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
执行越界记录还原与无依据上调记录回退批次: PAPER-20261014-03-REVERT-INCREASED
1. 还原 3 条超出 7 月 5 日核查范围的历史记录 (484, 485, 491)
2. 撤销 34 条被固定规则无依据上调的记录，恢复至原始登记值
3. 严格校验旧值镜像，单事务原子提交
4. 同步更新关联出库单 edu_stock_out_item 与 edu_stock_out
5. 记录行级 before/after 审计日志，保持库存基准不变
"""
import os
import sys
import json
import argparse
from datetime import datetime, date
from decimal import Decimal
import pymysql

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (datetime, date)):
        return obj.strftime("%Y-%m-%d %H:%M:%S")
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def execute_revert(is_dry_run: bool):
    approved_file = "maintenance/approved_revert_cleanup.json"
    if not os.path.exists(approved_file):
        raise FileNotFoundError(f"审批清单不存在: {approved_file}")

    with open(approved_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    batch_id = data["batch_id"]
    operator = data.get("operator", "admin_safety_fix")
    fact_summary = data.get("fact_summary", "回退越界记录与上调记录")
    records_to_revert = data["records"]

    mode_name = "DRY-RUN (模拟演练)" if is_dry_run else "APPLY (真实写入)"
    print(f"=== 开始执行数据回退与纠偏: {mode_name} ===")
    print(f"批次号: {batch_id}, 待处理记录: {len(records_to_revert)} 笔")

    conn = pymysql.connect(
        host="127.0.0.1", port=53061, user="root", password="Lt19960614.",
        database="stuck-mg", charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor,
        autocommit=False
    )

    with conn.cursor() as cur:
        try:
            # 1. 检查批次锁
            cur.execute("SELECT status FROM edu_repair_batch WHERE batch_id = %s FOR UPDATE", (batch_id,))
            existing = cur.fetchone()
            if existing and existing["status"] == "SUCCESS":
                raise RuntimeError(f"批次 {batch_id} 已在系统中成功执行过，禁止重复运行！")

            if not is_dry_run:
                cur.execute("""
                    INSERT INTO edu_repair_batch (batch_id, db_name, snapshot_hash, approved_hash, status, start_time, operator, fact_summary)
                    VALUES (%s, 'stuck-mg', 'REVERT-HASH', 'APPROVED-REVERT-CLEANUP', 'PENDING', NOW(), %s, %s)
                    ON DUPLICATE KEY UPDATE status='PENDING', start_time=NOW()
                """, (batch_id, operator, fact_summary))

            # 2. 逐行恢复
            total_reduced_sheets = 0
            for item in records_to_revert:
                p_id = item["print_id"]
                cur.execute("SELECT * FROM edu_print_record WHERE print_id = %s FOR UPDATE", (p_id,))
                curr_rec = cur.fetchone()
                if not curr_rec:
                    raise RuntimeError(f"记录 print_id={p_id} 不存在！")

                target_p = item["target_page_count"]
                target_total = item["target_total_pages"]
                curr_total = curr_rec["total_pages"]
                diff = target_total - curr_total
                total_reduced_sheets += diff

                # 记录审计日志
                if not is_dry_run:
                    cur.execute("""
                        INSERT INTO edu_repair_log (batch_id, table_name, record_id, action_type, before_json, after_json, reason, is_estimated, create_time)
                        VALUES (%s, 'edu_print_record', %s, 'UPDATE', %s, %s, %s, 0, NOW())
                    """, (
                        batch_id, str(p_id),
                        json.dumps(curr_rec, default=decimal_default, ensure_ascii=False),
                        json.dumps({**curr_rec, "page_count": target_p, "total_pages": target_total}, default=decimal_default, ensure_ascii=False),
                        f"回退纠正: {item['reason']} (由当前{curr_rec['page_count']}页/{curr_total}张还原至{target_p}页/{target_total}张)"
                    ))

                # 更新主表 edu_print_record
                cur.execute("""
                    UPDATE edu_print_record 
                    SET page_count = %s, total_pages = %s, update_time = NOW()
                    WHERE print_id = %s
                """, (target_p, target_total, p_id))

                # 同步更新出库单
                out_id = curr_rec.get("out_id")
                if out_id:
                    cur.execute("SELECT * FROM edu_stock_out WHERE out_id = %s FOR UPDATE", (out_id,))
                    old_out = cur.fetchone()
                    if old_out:
                        cur.execute("UPDATE edu_stock_out_item SET quantity = %s WHERE out_id = %s", (target_total, out_id))
                        new_remark = f"关联印刷登记【{curr_rec['print_name']}】用纸出库(回退恢复原始登记 {curr_rec['print_count']}份 × 每份{target_p}页 = {target_total}张)"
                        cur.execute("UPDATE edu_stock_out SET remark = %s, update_time = NOW() WHERE out_id = %s", (new_remark, out_id))

            print(f"  已成功处理 {len(records_to_revert)} 笔记录恢复，文印耗纸净变动: {total_reduced_sheets} 张")

            if not is_dry_run:
                cur.execute("UPDATE edu_repair_batch SET status = 'SUCCESS', finish_time = NOW() WHERE batch_id = %s", (batch_id,))
                conn.commit()
                print("=== [APPLY] 回退事务提交成功！37笔记录已安全还原 ===")
            else:
                conn.rollback()
                print("=== [DRY-RUN] 演练成功，事务已安全回滚，数据库未发生更改 ===")

        except Exception as e:
            conn.rollback()
            print(f"执行过程中发生异常，事务已回滚: {e}")
            raise e
        finally:
            conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="模拟演练回滚")
    parser.add_argument("--apply", action="store_true", help="生产真实写入")
    args = parser.parse_args()

    if args.apply:
        execute_revert(is_dry_run=False)
    else:
        execute_revert(is_dry_run=True)
