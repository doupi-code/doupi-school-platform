#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
针对无原稿文件的记录，按学科与材料类型应用“常规答案/试卷/讲义页面”进行估算对比
"""
import sys
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
        SELECT print_id, print_name, print_time, teacher_id, paper_goods_id,
               print_count, page_count, print_side, total_pages, attachment
        FROM edu_print_record
        WHERE del_flag = '0' AND status = '1'
        ORDER BY print_id ASC
    """)
    records = cur.fetchall()
conn.close()

# 规则估算函数
def estimate_regular_pages(name: str, current_pages: int, side: str) -> tuple[int, str]:
    name_lower = name.lower()
    
    # 1. 作文纸 / 答题卡
    if "作文" in name or "答题卡" in name or "答题纸" in name:
        return 2, "常规作文纸/答题卡(1张8K双面, 2页)"
    
    # 2. 答案 / 解析
    if any(k in name for k in ["答案", "解析", "参考答案", "详答", "教师版"]):
        if any(k in name for k in ["理综", "文综", "九科", "大联考", "联合考试"]):
            return 4, "大联考/综合卷答案(2张8K双面, 4页)"
        else:
            return 2, "单科周测/月考常规答案(1张8K双面, 2页)"
            
    # 3. 试卷 / 联考卷 / 周测卷
    if any(k in name for k in ["试卷", "试题", "周测", "月考", "调研", "调考", "联考", "模拟"]):
        if any(k in name for k in ["理综", "文综", "全套"]):
            return 6, "综合合卷试卷(3张8K双面, 6页)"
        elif current_pages >= 4:
            return 4, "单科大考试卷(2张8K双面, 4页)"
        else:
            return 2, "单科微测/限时练(1张8K双面, 2页)"
            
    # 4. 作业 / 练习 / 学案 / 训练
    if any(k in name for k in ["作业", "练习", "学案", "训练", "考法", "专题", "提优"]):
        if current_pages >= 4:
            return 4, "大型专题训练学案(2张8K双面, 4页)"
        else:
            return 2, "常规课时作业(1张8K双面, 2页)"

    # 5. 其他日常材料（课表、名单、通知、协议）
    if any(k in name for k in ["课表", "名单", "通知", "协议", "表格"]):
        return 1 if side == "1" else 2, "常规表格通知(1-2页)"

    # 兜底：若原页数较小(<=2)，保持原样；若原页数偏大(>2)，常规估算为2页
    if current_pages <= 2:
        return current_pages, "维持原有微小页数"
    return 2, "常规单科单张材料(2页)"

# 统计分析
total_old_sheets = 0
total_new_sheets = 0
estimated_changes = []

for r in records:
    old_p = r["page_count"]
    copies = r["print_count"]
    side = str(r["print_side"])
    old_total = r["total_pages"]
    attachment = r["attachment"]
    
    total_old_sheets += old_total
    
    # 检查是否有原稿
    has_file = bool(attachment and "/profile/" in attachment)
    
    if has_file:
        # 有原稿文件 -> 不改
        total_new_sheets += old_total
    else:
        # 无原稿文件 -> 按常规估算
        new_p, rule_desc = estimate_regular_pages(r["print_name"] or "", old_p, side)
        per_copy = new_p if side == "1" else (new_p + 1) // 2
        # 模板与样张各1张
        new_total = copies * per_copy + 2
        total_new_sheets += new_total
        
        if new_p != old_p:
            diff = new_total - old_total
            estimated_changes.append({
                "print_id": r["print_id"],
                "name": r["print_name"],
                "copies": copies,
                "old_pages": old_p,
                "new_pages": new_p,
                "side": "双面" if side == "2" else "单面",
                "old_sheets": old_total,
                "new_sheets": new_total,
                "diff": diff,
                "rule": rule_desc
            })

print(f"=== 无原稿记录应用学科常规估算结果对比 ===")
print(f"原始文印登记总耗纸: {total_old_sheets:,} 张 (折合 8K: {total_old_sheets / 2000:.2f} 箱)")
print(f"规范估算后预计总耗纸: {total_new_sheets:,} 张 (折合 8K: {total_new_sheets / 2000:.2f} 箱)")
print(f"核减水分纸张数: {total_old_sheets - total_new_sheets:,} 张 (挤出水分: {(total_old_sheets - total_new_sheets) / 2000:.2f} 箱)")
print(f"受影响需估算调整记录数: {len(estimated_changes)} 笔 (在 503 笔无附件记录中)")

print(f"\n核减耗纸量最大的前 15 笔无原稿记录样例:")
estimated_changes.sort(key=lambda x: x["diff"])
for item in estimated_changes[:15]:
    print(f"  #{item['print_id']} {item['name'][:24]} | 份数={item['copies']} | 页数: {item['old_pages']}页 -> {item['new_pages']}页 | 耗纸: {item['old_sheets']} -> {item['new_sheets']} (省 {abs(item['diff'])} 张) | {item['rule']}")
