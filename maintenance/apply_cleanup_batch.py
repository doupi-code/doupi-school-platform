#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
执行文印记录规范化修正批次 PAPER-20261014-02-CLEANUP
支持 --dry-run (强制回滚) 和 --apply (真实提交)
单事务原子执行，记录行级 before/after 审计日志，同步出库单
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

def execute_cleanup(is_dry_run: bool):
    approved_file = "maintenance/approved_cleanup.json"
    if not os.path.exists(approved_file):
        raise FileNotFoundError(f"审批清单不存在: {approved_file}")
    
    with open(approved_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    batch_id = data["batch_id"]
    operator = data.get("operator", "admin_cleanup")
    fact_summary = data.get("fact_summary", "文印记录规范化核减修正")
    records_to_modify = data["records"]

    mode_name = "DRY-RUN (模拟演练)" if is_dry_run else "APPLY (真实写入)"
    print(f"=== 开始执行文印记录规范化修正: {mode_name} ===")
    print(f"批次号: {batch_id}, 待修正记录数: {len(records_to_modify)} 笔")

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
                    VALUES (%s, 'stuck-mg', 'CLEANUP-HASH', 'APPROVED-CLEANUP', 'PENDING', NOW(), %s, %s)
                    ON DUPLICATE KEY UPDATE status='PENDING', start_time=NOW()
                """, (batch_id, operator, fact_summary))

            # 2. 逐行更新文印记录与出库单
            total_reduced_sheets = 0
            for item in records_to_modify:
                p_id = item["print_id"]
                cur.execute("SELECT * FROM edu_print_record WHERE print_id = %s FOR UPDATE", (p_id,))
                old_rec = cur.fetchone()
                if not old_rec:
                    raise RuntimeError(f"记录 print_id={p_id} 不存在！")

                new_pages = item["new_page_count"]
                new_total = item["new_total_pages"]
                old_total = old_rec["total_pages"]
                diff = new_total - old_total
                total_reduced_sheets += abs(diff)

                # 写审计日志
                if not is_dry_run:
                    cur.execute("""
                        INSERT INTO edu_repair_log (batch_id, table_name, record_id, action_type, before_json, after_json, reason, is_estimated, create_time)
                        VALUES (%s, 'edu_print_record', %s, 'UPDATE', %s, %s, %s, %s, NOW())
                    """, (
                        batch_id, str(p_id),
                        json.dumps(old_rec, default=decimal_default, ensure_ascii=False),
                        json.dumps({**old_rec, "page_count": new_pages, "total_pages": new_total}, default=decimal_default, ensure_ascii=False),
                        item["reason"], item.get("is_estimated", 1)
                    ))

                # 更新主表
                cur.execute("""
                    UPDATE edu_print_record 
                    SET page_count = %s, total_pages = %s, update_time = NOW()
                    WHERE print_id = %s
                """, (new_pages, new_total, p_id))

                # 同步出库单
                out_id = old_rec.get("out_id")
                if out_id:
                    cur.execute("SELECT * FROM edu_stock_out WHERE out_id = %s FOR UPDATE", (out_id,))
                    old_out = cur.fetchone()
                    if old_out:
                        cur.execute("UPDATE edu_stock_out_item SET quantity = %s WHERE out_id = %s", (new_total, out_id))
                        new_remark = f"关联印刷登记【{old_rec['print_name']}】用纸出库(规范估算后 {old_rec['print_count']}份 × 每份{new_pages}页 = {new_total}张)"
                        cur.execute("UPDATE edu_stock_out SET remark = %s, update_time = NOW() WHERE out_id = %s", (new_remark, out_id))

            print(f"  已成功处理 {len(records_to_modify)} 笔记录，合计核减耗纸: {total_reduced_sheets:,} 张 (折合 8K: {total_reduced_sheets/2000:.2f} 箱)")

            if not is_dry_run:
                # 标记批次完成
                cur.execute("UPDATE edu_repair_batch SET status = 'SUCCESS', finish_time = NOW() WHERE batch_id = %s", (batch_id,))
                conn.commit()
                print("=== [APPLY] 事务提交成功！文印规范化修正已持久化生效 ===")
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
        execute_cleanup(is_dry_run=False)
    else:
        execute_cleanup(is_dry_run=True)
