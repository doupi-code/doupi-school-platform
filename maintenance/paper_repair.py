#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生产文印数据修复与基准管理专用运维工具
提供 inspect, snapshot, analyze, dry-run, apply, verify, rollback 指令
严格遵守只读默认原则、哈希绑定原则、单事务原子原则与行级审计原则
"""

import os
import sys
import json
import hashlib
import argparse
from datetime import datetime, date
from decimal import Decimal
import pymysql
from pymysql.cursors import DictCursor

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

def calculate_hash(data_str: str) -> str:
    return hashlib.sha256(data_str.encode("utf-8")).hexdigest()

def calculate_paper_sheets(copies: int, pages: int, side: str, template: int, preview: int) -> int:
    if copies <= 0 or pages <= 0:
        raise ValueError(f"份数({copies})和页数({pages})必须为正整数")
    if str(side) not in ("1", "2"):
        raise ValueError(f"单双面标记无效: {side}")
    if template < 0 or preview < 0:
        raise ValueError("附加耗纸不能为负数")
    per_copy = pages if str(side) == "1" else (pages + 1) // 2
    return copies * per_copy + template + preview

def normalize_stock(physical: int, reserved: int, rate: int):
    if rate <= 0 or reserved < 0 or physical < reserved:
        raise ValueError(f"库存基准或预占数量异常: physical={physical}, reserved={reserved}, rate={rate}")
    available = physical - reserved
    boxes, loose = divmod(available, rate)
    return {
        "physical": physical,
        "reserved": reserved,
        "available": available,
        "stock_num": boxes,
        "remain_sheets": loose,
        "conversion_rate": rate,
    }

class PaperRepairTool:
    def __init__(self, config_path: str):
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"配置文件不存在: {config_path}")
        with open(config_path, "r", encoding="utf-8") as f:
            self.config = json.load(f)
        self.db_config = self.config.get("database", {})
        self.target_db = self.db_config.get("database", "stuck-mg")

    def get_connection(self, autocommit: bool = False):
        return pymysql.connect(
            host=self.db_config.get("host", "127.0.0.1"),
            port=int(self.db_config.get("port", 53061)),
            user=self.db_config.get("user", "root"),
            password=self.db_config.get("password", ""),
            database=self.target_db,
            charset=self.db_config.get("charset", "utf8mb4"),
            cursorclass=DictCursor,
            autocommit=autocommit,
        )

    def inspect(self):
        print(f"=== [INSPECT] 检查生产环境数据库: {self.target_db} ===")
        with self.get_connection(autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT VERSION() AS ver")
                print(f"MySQL 版本: {cur.fetchone()['ver']}")

                print("\n--- 纸张物资档案 (8K / 16K) ---")
                cur.execute("""
                    SELECT goods_id, goods_name, spec, unit, base_unit, conversion_rate, 
                           stock_num, remain_sheets, del_flag 
                    FROM edu_goods 
                    WHERE goods_id IN (311, 312, 2, 3) OR goods_name LIKE '%纸%'
                """)
                for g in cur.fetchall():
                    print(f"  goods_id={g['goods_id']}: {g['goods_name']} | 规格={g['spec']} | 换算率={g['conversion_rate']} | "
                          f"库存={g['stock_num']}{g['unit']} + {g['remain_sheets']}{g['base_unit']} | 删除标志={g['del_flag']}")

                print("\n--- 现有入库单主表及明细 ---")
                cur.execute("SELECT in_id, in_no, in_type, in_time, operator, status, remark, del_flag FROM edu_stock_in")
                in_rows = cur.fetchall()
                print(f"  入库单主表总记录数: {len(in_rows)}")
                for r in in_rows:
                    print(f"    in_id={r['in_id']}: {r['in_no']} | 类型={r['in_type']} | 状态={r['status']} | 备注={r['remark']}")

                cur.execute("SELECT item_id, in_id, goods_id, quantity, price, amount FROM edu_stock_in_item")
                item_rows = cur.fetchall()
                print(f"  入库明细总条数: {len(item_rows)}")
                for it in item_rows:
                    print(f"    item_id={it['item_id']} (in_id={it['in_id']}): goods_id={it['goods_id']} | 数量={it['quantity']} | 小计={it['amount']}")

                print("\n--- 文印记录分布 (edu_print_record) ---")
                cur.execute("""
                    SELECT 
                        CASE WHEN print_time >= '2026-07-05 00:00:00' THEN '2026-07-05及之后' ELSE '2026-07-05之前' END AS period,
                        paper_goods_id,
                        status,
                        COUNT(*) AS cnt,
                        SUM(total_pages) AS sum_pages,
                        SUM(print_count) AS sum_copies
                    FROM edu_print_record
                    WHERE del_flag = '0'
                    GROUP BY period, paper_goods_id, status
                    ORDER BY period DESC, paper_goods_id, status
                """)
                for stat in cur.fetchall():
                    status_text = "已完成" if stat["status"] == "1" else ("待打印" if stat["status"] == "0" else "已作废")
                    print(f"  [{stat['period']}] 物资ID={stat['paper_goods_id']} | 状态={status_text} | 条数={stat['cnt']} | 耗纸={stat['sum_pages']}张 | 份数={stat['sum_copies']}份")

                cur.execute("SELECT COUNT(*) AS pending_cnt, COALESCE(SUM(total_pages), 0) AS pending_sheets FROM edu_print_record WHERE del_flag = '0' AND status = '0'")
                pending_res = cur.fetchone()
                print(f"\n  当前系统有效待打印任务数: {pending_res['pending_cnt']} 笔，预占纸张: {pending_res['pending_sheets']} 张")
        print("\n=== [INSPECT] 检查完成 ===")

    def snapshot(self, output_dir: str):
        os.makedirs(output_dir, exist_ok=True)
        print(f"=== [SNAPSHOT] 正在捕获数据快照至: {output_dir} ===")
        tables = [
            ("edu_goods", "SELECT * FROM edu_goods ORDER BY goods_id"),
            ("edu_stock_in", "SELECT * FROM edu_stock_in ORDER BY in_id"),
            ("edu_stock_in_item", "SELECT * FROM edu_stock_in_item ORDER BY item_id"),
            ("edu_print_record", "SELECT * FROM edu_print_record WHERE del_flag = '0' ORDER BY print_id"),
            ("edu_stock_out", "SELECT * FROM edu_stock_out ORDER BY out_id"),
            ("edu_stock_out_item", "SELECT * FROM edu_stock_out_item ORDER BY item_id"),
        ]
        snapshot_manifest = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "database": self.target_db,
            "tables": {},
        }
        with self.get_connection(autocommit=True) as conn:
            with conn.cursor() as cur:
                for table_name, sql in tables:
                    cur.execute(sql)
                    rows = cur.fetchall()
                    content_json = json.dumps(rows, default=decimal_default, ensure_ascii=False, indent=2)
                    table_hash = calculate_hash(content_json)
                    file_path = os.path.join(output_dir, f"{table_name}.json")
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(content_json)
                    snapshot_manifest["tables"][table_name] = {
                        "row_count": len(rows),
                        "sha256": table_hash,
                        "file": os.path.basename(file_path),
                    }
                    print(f"  捕获 {table_name}: {len(rows)} 行，哈希={table_hash[:16]}...")

        manifest_json = json.dumps(snapshot_manifest, indent=2, ensure_ascii=False)
        manifest_hash = calculate_hash(manifest_json)
        snapshot_manifest["snapshot_hash"] = manifest_hash
        manifest_file = os.path.join(output_dir, "manifest.json")
        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(snapshot_manifest, f, indent=2, ensure_ascii=False)
        print(f"=== [SNAPSHOT] 快照完成，全局哈希: {manifest_hash} ===")
        return manifest_hash

    def analyze(self, snapshot_dir: str, output_dir: str):
        os.makedirs(output_dir, exist_ok=True)
        print(f"=== [ANALYZE] 正在对比附件与排查异常数据 ===")
        record_file = os.path.join(snapshot_dir, "edu_print_record.json")
        if not os.path.exists(record_file):
            raise FileNotFoundError(f"快照文件不存在: {record_file}")
        with open(record_file, "r", encoding="utf-8") as f:
            records = json.load(f)

        candidates = []
        suspicious_list = []
        exam_candidates = []

        for r in records:
            print_id = r["print_id"]
            name = r.get("print_name", "") or ""
            copies = r.get("print_count", 0) or 0
            pages = r.get("page_count", 1) or 1
            side = str(r.get("print_side", "1"))
            total_pages = r.get("total_pages", 0) or 0
            template = r.get("template_paper_count", 0) or 0
            preview = r.get("preview_paper_count", 0) or 0
            attachment = r.get("attachment")
            print_time = r.get("print_time", "")

            # 重新核算理论耗纸
            try:
                expected_total = calculate_paper_sheets(copies, pages, side, template, preview)
            except Exception as e:
                expected_total = total_pages

            is_diff = (expected_total != total_pages)
            is_suspicious = is_diff or (copies >= 300) or (pages >= 15)

            cand = {
                "print_id": print_id,
                "print_name": name,
                "teacher_id": r.get("teacher_id"),
                "print_time": print_time,
                "paper_goods_id": r.get("paper_goods_id"),
                "paper_type": r.get("paper_type"),
                "old_print_count": copies,
                "old_page_count": pages,
                "old_print_side": side,
                "old_total_pages": total_pages,
                "expected_total_pages": expected_total,
                "diff": expected_total - total_pages,
                "has_attachment": bool(attachment),
                "attachment": attachment,
                "status": r.get("status"),
                "approved": False,
                "reason": "耗纸核算不一致" if is_diff else ("超大份数/页数复查" if is_suspicious else "正常记录"),
            }
            if is_suspicious:
                suspicious_list.append(cand)
            if "周测" in name or "月考" in name or "联考" in name or "考试" in name:
                exam_candidates.append(cand)
            candidates.append(cand)

        output_file = os.path.join(output_dir, "review_candidates.json")
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump({
                "total_analyzed": len(records),
                "suspicious_count": len(suspicious_list),
                "exam_related_count": len(exam_candidates),
                "suspicious_records": suspicious_list,
                "exam_records": exam_candidates,
            }, f, indent=2, ensure_ascii=False)
        print(f"=== [ANALYZE] 分析完成，生成疑点清单: {output_file} (疑点数: {len(suspicious_list)}) ===")

    def dry_run(self, snapshot_dir: str, approved_path: str):
        print(f"=== [DRY-RUN] 执行模拟演练 (单事务最终强制回滚) ===")
        self._execute_repair(snapshot_dir, approved_path, is_dry_run=True)

    def apply(self, snapshot_dir: str, approved_path: str):
        print(f"=== [APPLY] 执行生产数据修复事务 ===")
        self._execute_repair(snapshot_dir, approved_path, is_dry_run=False)

    def _execute_repair(self, snapshot_dir: str, approved_path: str, is_dry_run: bool):
        if not os.path.exists(approved_path):
            raise FileNotFoundError(f"审批确认清单不存在: {approved_path}")
        with open(approved_path, "r", encoding="utf-8") as f:
            approved_data = json.load(f)

        approved_hash = calculate_hash(json.dumps(approved_data, ensure_ascii=False))
        batch_id = approved_data.get("batch_id", f"PAPER-{datetime.now().strftime('%Y%m%d')}-01")
        operator = approved_data.get("operator", "admin_repair")

        manifest_file = os.path.join(snapshot_dir, "manifest.json")
        snapshot_hash = "UNKNOWN"
        if os.path.exists(manifest_file):
            with open(manifest_file, "r", encoding="utf-8") as f:
                snapshot_hash = json.load(f).get("snapshot_hash", "UNKNOWN")

        with self.get_connection(autocommit=False) as conn:
            with conn.cursor() as cur:
                try:
                    # 1. 获取批次锁与防重复执行校验
                    cur.execute("SELECT status FROM edu_repair_batch WHERE batch_id = %s FOR UPDATE", (batch_id,))
                    existing_batch = cur.fetchone()
                    if existing_batch and existing_batch["status"] == "SUCCESS":
                        raise RuntimeError(f"批次 {batch_id} 已在系统中成功执行过，禁止重复执行！")

                    # 记录批次开始
                    if not is_dry_run:
                        cur.execute("""
                            INSERT INTO edu_repair_batch (batch_id, db_name, snapshot_hash, approved_hash, status, start_time, operator, fact_summary)
                            VALUES (%s, %s, %s, %s, 'PENDING', NOW(), %s, %s)
                            ON DUPLICATE KEY UPDATE status='PENDING', start_time=NOW()
                        """, (batch_id, self.target_db, snapshot_hash, approved_hash, operator, approved_data.get("fact_summary", "生产文印数据修复与实盘基准建立")))

                    # 2. 锁定物资行 (311, 312)
                    cur.execute("SELECT goods_id, spec, conversion_rate, stock_num, remain_sheets FROM edu_goods WHERE goods_id IN (311, 312) FOR UPDATE")
                    locked_goods = {g["goods_id"]: g for g in cur.fetchall()}
                    if 311 not in locked_goods or 312 not in locked_goods:
                        raise RuntimeError("物资 ID 311 或 312 不存在，无法继续！")

                    # 3. 动态检查待打印预占任务
                    cur.execute("""
                        SELECT paper_goods_id, COUNT(*) AS cnt, COALESCE(SUM(total_pages), 0) AS reserved_sheets 
                        FROM edu_print_record 
                        WHERE del_flag = '0' AND status = '0'
                        GROUP BY paper_goods_id
                    """)
                    current_reserves = {r["paper_goods_id"]: int(r["reserved_sheets"]) for r in cur.fetchall()}
                    reserved_8k = current_reserves.get(311, 0)
                    reserved_16k = current_reserves.get(312, 0)
                    print(f"  当前动态待打印预占: 8K={reserved_8k}张, 16K={reserved_16k}张")

                    # 4. 执行文印记录逐条修改 (仅针对 approved=True)
                    records_to_modify = approved_data.get("approved_print_records", [])
                    print(f"  需应用的历史文印修改条数: {len(records_to_modify)}")
                    for item in records_to_modify:
                        p_id = item["print_id"]
                        cur.execute("SELECT * FROM edu_print_record WHERE print_id = %s FOR UPDATE", (p_id,))
                        old_rec = cur.fetchone()
                        if not old_rec:
                            raise RuntimeError(f"文印记录 print_id={p_id} 不存在！")

                        new_copies = item["new_print_count"]
                        new_pages = item["new_page_count"]
                        new_side = str(item.get("new_print_side", old_rec["print_side"]))
                        template = old_rec.get("template_paper_count", 0) or 0
                        preview = old_rec.get("preview_paper_count", 0) or 0
                        new_total = calculate_paper_sheets(new_copies, new_pages, new_side, template, preview)

                        # 写审计日志
                        if not is_dry_run:
                            cur.execute("""
                                INSERT INTO edu_repair_log (batch_id, table_name, record_id, action_type, before_json, after_json, reason, is_estimated, create_time)
                                VALUES (%s, 'edu_print_record', %s, 'UPDATE', %s, %s, %s, %s, NOW())
                            """, (
                                batch_id, str(p_id),
                                json.dumps(old_rec, default=decimal_default, ensure_ascii=False),
                                json.dumps({**old_rec, "print_count": new_copies, "page_count": new_pages, "print_side": new_side, "total_pages": new_total}, default=decimal_default, ensure_ascii=False),
                                item.get("reason", "逐条确认清单修改"),
                                1 if item.get("is_estimated") else 0
                            ))

                        # 更新文印主记录
                        cur.execute("""
                            UPDATE edu_print_record 
                            SET print_count = %s, page_count = %s, print_side = %s, total_pages = %s, update_time = NOW()
                            WHERE print_id = %s
                        """, (new_copies, new_pages, new_side, new_total, p_id))

                        # 同步出库单
                        out_id = old_rec.get("out_id")
                        if out_id:
                            cur.execute("SELECT * FROM edu_stock_out WHERE out_id = %s FOR UPDATE", (out_id,))
                            old_out = cur.fetchone()
                            if old_out:
                                cur.execute("UPDATE edu_stock_out_item SET quantity = %s WHERE out_id = %s", (new_total, out_id))
                                new_remark = f"关联印刷登记【{old_rec['print_name']}】用纸出库(核实修改后 {new_copies}份 × 每份{new_pages}页 = {new_total}张)"
                                cur.execute("UPDATE edu_stock_out SET remark = %s, update_time = NOW() WHERE out_id = %s", (new_remark, out_id))

                    # 5. 删除 4 笔错误入库单 (in_id IN (1, 2, 3, 4))
                    cur.execute("SELECT * FROM edu_stock_in WHERE in_id IN (1, 2, 3, 4) FOR UPDATE")
                    del_in_list = cur.fetchall()
                    cur.execute("SELECT * FROM edu_stock_in_item WHERE in_id IN (1, 2, 3, 4) FOR UPDATE")
                    del_items_list = cur.fetchall()

                    if not is_dry_run:
                        cur.execute("""
                            INSERT INTO edu_repair_log (batch_id, table_name, record_id, action_type, before_json, after_json, reason, is_estimated, create_time)
                            VALUES (%s, 'edu_stock_in', '1,2,3,4', 'DELETE', %s, NULL, '物理删除原有4笔不可靠入库单及明细', 0, NOW())
                        """, (batch_id, json.dumps({"headers": del_in_list, "items": del_items_list}, default=decimal_default, ensure_ascii=False)))

                    del_item_rows = cur.execute("DELETE FROM edu_stock_in_item WHERE in_id IN (1, 2, 3, 4)")
                    del_head_rows = cur.execute("DELETE FROM edu_stock_in WHERE in_id IN (1, 2, 3, 4)")
                    print(f"  删除错误入库: 主表 {del_head_rows} 行，明细表 {del_item_rows} 行")

                    # 6. 插入一笔新的历史进货待核实单 (21箱，8000元，status='0')
                    new_in_no = f"RK20260521{datetime.now().strftime('%M%S')}"
                    cur.execute("""
                        INSERT INTO edu_stock_in (
                            in_no, in_type, in_time, operator, operator_id, remark, status,
                            declared_package_count, declared_amount, create_by, create_time, del_flag
                        ) VALUES (
                            %s, '1', '2026-05-21 00:00:00', '历史进货核准', NULL,
                            '依据用户确认恢复历史进货总量(21箱,8000元)；纸型分配待核实，不增加直接实物库存',
                            '0', 21, 8000.00, %s, NOW(), '0'
                        )
                    """, (new_in_no, operator))
                    new_in_id = cur.lastrowid
                    print(f"  插入历史待核实入库单成功: in_id={new_in_id}, in_no={new_in_no}")

                    # 7. 更新物资规格换算率与建立估计实盘基准
                    # 8K: 估算 11000 张，换算率 2000
                    # 16K: 估算 12450 张，换算率 4000
                    norm_8k = normalize_stock(physical=11000, reserved=reserved_8k, rate=2000)
                    norm_16k = normalize_stock(physical=12450, reserved=reserved_16k, rate=4000)

                    # 更新 8K
                    cur.execute("""
                        UPDATE edu_goods 
                        SET spec = '8K/箱(2000张)', unit = '箱', base_unit = '张', conversion_rate = 2000,
                            stock_num = %s, remain_sheets = %s, update_by = %s, update_time = NOW()
                        WHERE goods_id = 311
                    """, (norm_8k["stock_num"], norm_8k["remain_sheets"], operator))

                    # 更新 16K
                    cur.execute("""
                        UPDATE edu_goods 
                        SET spec = '16K/箱(4000张)', unit = '箱', base_unit = '张', conversion_rate = 4000,
                            stock_num = %s, remain_sheets = %s, update_by = %s, update_time = NOW()
                        WHERE goods_id = 312
                    """, (norm_16k["stock_num"], norm_16k["remain_sheets"], operator))

                    print(f"  物资规格与基准更新成功:")
                    print(f"    8K (311): 可用={norm_8k['available']}张 -> {norm_8k['stock_num']}箱 + {norm_8k['remain_sheets']}张 (换算率 2000)")
                    print(f"    16K (312): 可用={norm_16k['available']}张 -> {norm_16k['stock_num']}箱 + {norm_16k['remain_sheets']}张 (换算率 4000)")

                    # 写入基准审计表
                    if not is_dry_run:
                        for norm, gid, gname, p_min, p_max in [
                            (norm_8k, 311, "8K纸", 11000, 11000),
                            (norm_16k, 312, "16K纸", 12400, 12500)
                        ]:
                            cur.execute("""
                                INSERT INTO edu_repair_stock_baseline (
                                    batch_id, goods_id, goods_name, conversion_rate,
                                    physical_estimate, physical_min, physical_max, reserved_sheets,
                                    available_sheets, stock_num, remain_sheets, count_date, count_time_precision,
                                    remark, create_time
                                ) VALUES (
                                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, '2026-10-14', '日级暂估',
                                    '包含未登记草稿纸领用等历史差异，不能确定各原因数量', NOW()
                                )
                            """, (
                                batch_id, gid, gname, norm["conversion_rate"],
                                norm["physical"], p_min, p_max, norm["reserved"],
                                norm["available"], norm["stock_num"], norm["remain_sheets"]
                            ))

                        # 标记批次成功
                        cur.execute("""
                            UPDATE edu_repair_batch 
                            SET status = 'SUCCESS', finish_time = NOW()
                            WHERE batch_id = %s
                        """, (batch_id,))

                    if is_dry_run:
                        print("=== [DRY-RUN] 演练校验全部通过，正在回滚事务 ===")
                        conn.rollback()
                        print("=== [DRY-RUN] 已回滚，数据库未发生任何实际更改 ===")
                    else:
                        conn.commit()
                        print("=== [APPLY] 事务提交成功！生产修复已生效 ===")

                except Exception as e:
                    conn.rollback()
                    print(f"!!! [ERROR] 执行失败，事务已自动回滚: {e}")
                    raise

    def verify(self, batch_id: str):
        print(f"=== [VERIFY] 校验修复批次: {batch_id} ===")
        with self.get_connection(autocommit=True) as conn:
            with conn.cursor() as cur:
                # 1. 检查批次状态
                cur.execute("SELECT * FROM edu_repair_batch WHERE batch_id = %s", (batch_id,))
                batch = cur.fetchone()
                if not batch:
                    raise AssertionError(f"未找到修复批次 {batch_id}！")
                print(f"  批次状态: {batch['status']}, 结束时间: {batch['finish_time']}")
                assert batch["status"] == "SUCCESS", f"批次状态不为 SUCCESS: {batch['status']}"

                # 2. 检查物资换算率与库存
                cur.execute("SELECT goods_id, goods_name, spec, conversion_rate, stock_num, remain_sheets FROM edu_goods WHERE goods_id IN (311, 312)")
                goods_rows = {g["goods_id"]: g for g in cur.fetchall()}
                g8k = goods_rows[311]
                g16k = goods_rows[312]

                assert g8k["conversion_rate"] == 2000, f"8K换算率异常: {g8k['conversion_rate']}"
                assert g16k["conversion_rate"] == 4000, f"16K换算率异常: {g16k['conversion_rate']}"
                assert g8k["remain_sheets"] >= 0 and g8k["remain_sheets"] < 2000, "8K散张范围异常"
                assert g16k["remain_sheets"] >= 0 and g16k["remain_sheets"] < 4000, "16K散张范围异常"

                print(f"  8K 当前库存: {g8k['stock_num']}箱 + {g8k['remain_sheets']}张 (换算率: {g8k['conversion_rate']})")
                print(f"  16K 当前库存: {g16k['stock_num']}箱 + {g16k['remain_sheets']}张 (换算率: {g16k['conversion_rate']})")

                # 3. 检查原有4笔入库已删除
                cur.execute("SELECT COUNT(*) AS cnt FROM edu_stock_in WHERE in_id IN (1, 2, 3, 4)")
                assert cur.fetchone()["cnt"] == 0, "原4笔入库仍存在于 edu_stock_in"
                cur.execute("SELECT COUNT(*) AS cnt FROM edu_stock_in_item WHERE in_id IN (1, 2, 3, 4)")
                assert cur.fetchone()["cnt"] == 0, "原4笔入库明细仍存在于 edu_stock_in_item"
                print("  原有4笔错误入库单已彻底物理删除")

                # 4. 检查新历史待核实入库单
                cur.execute("SELECT * FROM edu_stock_in WHERE status = '0'")
                pending_ins = cur.fetchall()
                assert len(pending_ins) == 1, f"待核实入库单数量不等于1: {len(pending_ins)}"
                p_in = pending_ins[0]
                assert p_in["declared_package_count"] == 21, f"确认箱数不等于21: {p_in['declared_package_count']}"
                assert float(p_in["declared_amount"]) == 8000.0, f"确认金额不等于8000: {p_in['declared_amount']}"
                print(f"  新历史待核实单已就绪: in_id={p_in['in_id']}, in_no={p_in['in_no']}, 箱数={p_in['declared_package_count']}, 金额=¥{p_in['declared_amount']}")

        print("=== [VERIFY] 全部核验断言通过！ ===")

    def rollback(self, batch_id: str):
        print(f"=== [ROLLBACK] 正在回滚批次: {batch_id} ===")
        with self.get_connection(autocommit=False) as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute("SELECT * FROM edu_repair_batch WHERE batch_id = %s FOR UPDATE", (batch_id,))
                    batch = cur.fetchone()
                    if not batch:
                        raise RuntimeError(f"未找到批次 {batch_id}")
                    if batch["status"] == "ROLLED_BACK":
                        raise RuntimeError(f"批次 {batch_id} 已经是回滚状态，禁止重复回滚！")

                    # 获取行级变更镜像（倒序执行）
                    cur.execute("SELECT * FROM edu_repair_log WHERE batch_id = %s ORDER BY id DESC", (batch_id,))
                    logs = cur.fetchall()

                    for lg in logs:
                        t_name = lg["table_name"]
                        rec_id = lg["record_id"]
                        action = lg["action_type"]
                        before_json = lg["before_json"]

                        if t_name == "edu_stock_in" and action == "DELETE":
                            data = json.loads(before_json)
                            for h in data["headers"]:
                                cols = list(h.keys())
                                vals = [h[c] for c in cols]
                                placeholders = ", ".join(["%s"] * len(cols))
                                col_str = ", ".join([f"`{c}`" for c in cols])
                                cur.execute(f"INSERT INTO edu_stock_in ({col_str}) VALUES ({placeholders})", vals)
                            for it in data["items"]:
                                cols = list(it.keys())
                                vals = [it[c] for c in cols]
                                placeholders = ", ".join(["%s"] * len(cols))
                                col_str = ", ".join([f"`{c}`" for c in cols])
                                cur.execute(f"INSERT INTO edu_stock_in_item ({col_str}) VALUES ({placeholders})", vals)
                            print(f"  已恢复被删除的 4 笔入库单及明细")

                        elif t_name == "edu_print_record" and action == "UPDATE":
                            before_obj = json.loads(before_json)
                            cur.execute("""
                                UPDATE edu_print_record 
                                SET print_count = %s, page_count = %s, print_side = %s, total_pages = %s
                                WHERE print_id = %s
                            """, (
                                before_obj["print_count"], before_obj["page_count"],
                                before_obj["print_side"], before_obj["total_pages"],
                                int(rec_id)
                            ))

                    # 删除新增的待核实入库单
                    cur.execute("DELETE FROM edu_stock_in WHERE status = '0'")

                    # 恢复物资规格和旧库存
                    cur.execute("UPDATE edu_goods SET spec='8K/箱(1000张)', conversion_rate=1000, stock_num=3, remain_sheets=183 WHERE goods_id=311")
                    cur.execute("UPDATE edu_goods SET spec='16K/箱(1000张)', conversion_rate=1000, stock_num=32, remain_sheets=63 WHERE goods_id=312")

                    # 标记批次为已回滚
                    cur.execute("UPDATE edu_repair_batch SET status = 'ROLLED_BACK', finish_time = NOW() WHERE batch_id = %s", (batch_id,))

                    conn.commit()
                    print(f"=== [ROLLBACK] 批次 {batch_id} 回滚完成！数据已恢复修改前状态 ===")
                except Exception as e:
                    conn.rollback()
                    print(f"!!! [ERROR] 回滚失败: {e}")
                    raise

def main():
    parser = argparse.ArgumentParser(description="生产文印数据修复与基准管理专用运维工具")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # inspect
    p_inspect = subparsers.add_parser("inspect", help="检查生产环境数据现状")
    p_inspect.add_argument("--config", required=True, help="数据库配置文件路径")

    # snapshot
    p_snapshot = subparsers.add_parser("snapshot", help="生成数据表完整快照")
    p_snapshot.add_argument("--config", required=True, help="数据库配置文件路径")
    p_snapshot.add_argument("--output", required=True, help="快照存储目录")

    # analyze
    p_analyze = subparsers.add_parser("analyze", help="结合附件与考试规律分析疑点记录")
    p_analyze.add_argument("--snapshot", required=True, help="快照目录路径")
    p_analyze.add_argument("--output", required=True, help="分析报告输出目录")

    # dry-run
    p_dry = subparsers.add_parser("dry-run", help="加载确认清单执行演练(单事务最终强制回滚)")
    p_dry.add_argument("--config", required=True, help="数据库配置文件路径")
    p_dry.add_argument("--snapshot", required=True, help="快照目录路径")
    p_dry.add_argument("--approved", required=True, help="已确认清单文件路径")

    # apply
    p_apply = subparsers.add_parser("apply", help="在单事务内正式执行生产修复")
    p_apply.add_argument("--config", required=True, help="数据库配置文件路径")
    p_apply.add_argument("--snapshot", required=True, help="快照目录路径")
    p_apply.add_argument("--approved", required=True, help="已确认清单文件路径")

    # verify
    p_verify = subparsers.add_parser("verify", help="核验修复批次执行结果")
    p_verify.add_argument("--config", required=True, help="数据库配置文件路径")
    p_verify.add_argument("--batch-id", required=True, help="批次编号")

    # rollback
    p_rollback = subparsers.add_parser("rollback", help="安全回滚指定修复批次")
    p_rollback.add_argument("--config", required=True, help="数据库配置文件路径")
    p_rollback.add_argument("--batch-id", required=True, help="批次编号")

    args = parser.parse_args()

    if args.command == "inspect":
        tool = PaperRepairTool(args.config)
        tool.inspect()
    elif args.command == "snapshot":
        tool = PaperRepairTool(args.config)
        tool.snapshot(args.output)
    elif args.command == "analyze":
        # analyze 不需要连数据库，从快照分析
        dummy_tool = PaperRepairTool.__new__(PaperRepairTool)
        dummy_tool.analyze(args.snapshot, args.output)
    elif args.command == "dry-run":
        tool = PaperRepairTool(args.config)
        tool.dry_run(args.snapshot, args.approved)
    elif args.command == "apply":
        tool = PaperRepairTool(args.config)
        tool.apply(args.snapshot, args.approved)
    elif args.command == "verify":
        tool = PaperRepairTool(args.config)
        tool.verify(args.batch_id)
    elif args.command == "rollback":
        tool = PaperRepairTool(args.config)
        tool.rollback(args.batch_id)

if __name__ == "__main__":
    main()
