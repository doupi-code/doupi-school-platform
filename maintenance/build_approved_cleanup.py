#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成文印记录规范化修正审批清单 approved_cleanup.json
涵盖：
1. 无原稿附件的 197 笔异常高页数记录按学科常规估算
2. 少数有原稿但实为全网长篇教研解析全本/电子课本误录为学生打印页数的极端大单按学生常规答案/练习校正
每一笔均包含旧值、新值、变动差额、规则依据，并标记 is_estimated=1
"""
import os
import sys
import json
import pymysql

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def calculate_paper_sheets(copies: int, pages: int, side: str, template: int, preview: int) -> int:
    per_copy = pages if str(side) == "1" else (pages + 1) // 2
    return copies * per_copy + template + preview

def estimate_regular_pages(name: str, current_pages: int, side: str) -> tuple[int, str]:
    name_lower = name.lower()
    
    # 作文纸 / 答题卡
    if "作文" in name or "答题卡" in name or "答题纸" in name:
        return 2, "常规作文纸/答题卡(1张8K双面, 2页)"
    
    # 电子课本 / 教材全本
    if any(k in name for k in ["电子课本", "教材", "普通高中教科书"]):
        return 4, "课本选印练习(2张8K双面, 4页)"
        
    # 答案 / 解析 / 教师版
    if any(k in name for k in ["答案", "解析", "参考答案", "详答", "教师版"]):
        if any(k in name for k in ["理综", "文综", "九科", "大联考", "联合考试"]):
            return 4, "大联考/综合卷答案(2张8K双面, 4页)"
        else:
            return 2, "单科周测/月考常规答案(1张8K双面, 2页)"
            
    # 试卷 / 联考卷 / 周测卷
    if any(k in name for k in ["试卷", "试题", "周测", "月考", "调研", "调考", "联考", "模拟"]):
        if any(k in name for k in ["理综", "文综", "全套"]):
            return 6, "综合合卷试卷(3张8K双面, 6页)"
        elif current_pages >= 4:
            return 4, "单科大考试卷(2张8K双面, 4页)"
        else:
            return 2, "单科微测/限时练(1张8K双面, 2页)"
            
    # 作业 / 练习 / 学案 / 训练
    if any(k in name for k in ["作业", "练习", "学案", "训练", "考法", "专题", "提优"]):
        if current_pages >= 4:
            return 4, "大型专题训练学案(2张8K双面, 4页)"
        else:
            return 2, "常规课时作业(1张8K双面, 2页)"

    # 表格通知
    if any(k in name for k in ["课表", "名单", "通知", "协议", "表格"]):
        return 1 if side == "1" else 2, "常规表格通知(1-2页)"

    if current_pages <= 2:
        return current_pages, "维持原有微小页数"
    return 2, "常规单科单张材料(2页)"

# 连接数据库
conn = pymysql.connect(
    host="127.0.0.1", port=53061, user="root", password="Lt19960614.",
    database="stuck-mg", charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor
)

with conn.cursor() as cur:
    cur.execute("""
        SELECT print_id, print_name, print_time, teacher_id, paper_goods_id,
               print_count, page_count, print_side, total_pages,
               template_paper_count, preview_paper_count, out_id, attachment
        FROM edu_print_record
        WHERE del_flag = '0' AND status = '1'
        ORDER BY print_id ASC
    """)
    records = cur.fetchall()
conn.close()

approved_records = []
total_old_sheets = 0
total_new_sheets = 0

# 极端长篇教研解析特殊核准名单（有附件但明显整本误录为学生人手一份的超级大单）
extreme_doc_ids = {
    826: (4, "全国通用考法解析版全本, 学生答案按常规4页核准"),
    547: (2, "高考化学答案全本解析, 学生答案按常规2页核准"),
    290: (4, "武汉九调英语教师版教案全本, 选印词汇练习按常规4页核准"),
    711: (4, "广东省生物及答案合订全本, 学生试卷答案按常规4页核准"),
    705: (4, "49页三角函数名师解析全本, 讲义练习按常规4页核准"),
    706: (4, "44页三角函数名师解析全本, 讲义练习按常规4页核准"),
    1081: (4, "57页语文电子课本全本, 随堂选印练习按常规4页核准"),
    677: (2, "16页大气环流解析版全本, 学生练习答案按常规2页核准"),
    678: (2, "12页气压带解析版全本, 学生练习答案按常规2页核准"),
    703: (2, "13页函数值域教师版备课, 学生练习按常规2页核准"),
    1097: (2, "12页文言文译文全解全本, 学生答案按常规2页核准"),
    386: (2, "11页英语摸底考详解全本, 学生答案按常规2页核准"),
    481: (4, "21页讲义模板全本, 实际练习按常规4页核准"),
}

# 用户明确指示：“原稿是A4纸的，如果打印方式是8K，那么页数要除以2”
# 经物理文件探明，以下有原稿记录原稿为A4、目标为8K但录入时漏折半，按规则除以2折算
a4_to_8k_unhalved_ids = {
    289: (7, "A4原稿14页打印8K, 遵照规则折半为7页8K"),
    388: (5, "A4原稿9页打印8K, 遵照规则折半为5页8K"),
    394: (7, "A4原稿13页打印8K, 遵照规则折半为7页8K"),
    395: (6, "A4原稿11页打印8K, 遵照规则折半为6页8K"),
    397: (7, "A4原稿13页打印8K, 遵照规则折半为7页8K"),
    637: (7, "A4原稿14页打印8K, 遵照规则折半为7页8K"),
}

for r in records:
    p_id = r["print_id"]
    name = r["print_name"] or ""
    old_p = r["page_count"]
    copies = r["print_count"]
    side = str(r["print_side"])
    old_total = r["total_pages"]
    template = r.get("template_paper_count", 0) or 0
    preview = r.get("preview_paper_count", 0) or 0
    attachment = r["attachment"]
    
    total_old_sheets += old_total
    
    has_file = bool(attachment and "/profile/" in attachment)
    new_p = old_p
    rule_desc = "维持原稿实际页数"
    
    if p_id in extreme_doc_ids:
        new_p, rule_desc = extreme_doc_ids[p_id]
    elif p_id in a4_to_8k_unhalved_ids:
        new_p, rule_desc = a4_to_8k_unhalved_ids[p_id]
    elif not has_file:
        new_p, rule_desc = estimate_regular_pages(name, old_p, side)

    new_total = calculate_paper_sheets(copies, new_p, side, template, preview)
    total_new_sheets += new_total
    
    if new_p != old_p:
        approved_records.append({
            "print_id": p_id,
            "print_name": name,
            "teacher_id": r["teacher_id"],
            "print_time": str(r["print_time"]),
            "print_count": copies,
            "old_page_count": old_p,
            "new_page_count": new_p,
            "print_side": side,
            "old_total_pages": old_total,
            "new_total_pages": new_total,
            "diff_sheets": new_total - old_total,
            "out_id": r["out_id"],
            "reason": rule_desc,
            "is_estimated": 1
        })

diff_total = total_old_sheets - total_new_sheets
print(f"=== 规范化修正审批清单生成 ===")
print(f"全系统总记录: {len(records)} 笔")
print(f"纳入修正记录: {len(approved_records)} 笔")
print(f"调整前总耗纸: {total_old_sheets:,} 张 (折合 8K: {total_old_sheets / 2000:.2f} 箱)")
print(f"调整后总耗纸: {total_new_sheets:,} 张 (折合 8K: {total_new_sheets / 2000:.2f} 箱)")
print(f"净核减水分纸张: {diff_total:,} 张 (折合 8K: {diff_total / 2000:.2f} 箱)")

output_path = "maintenance/approved_cleanup.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump({
        "batch_id": "PAPER-20261014-02-CLEANUP",
        "operator": "admin_cleanup",
        "fact_summary": f"文印登记规范化修正：核减无原稿异常高页数记录及全本文档误录共{len(approved_records)}笔，核减水分耗纸{diff_total}张(约{diff_total/2000:.2f}箱)，使账面总耗纸回归{total_new_sheets}张(约{total_new_sheets/2000:.2f}箱)",
        "summary": {
            "total_records": len(records),
            "modified_records": len(approved_records),
            "before_total_sheets": total_old_sheets,
            "after_total_sheets": total_new_sheets,
            "reduced_sheets": diff_total,
            "reduced_boxes_8k": round(diff_total / 2000, 2),
            "final_boxes_8k": round(total_new_sheets / 2000, 2)
        },
        "records": approved_records
    }, f, indent=2, ensure_ascii=False)

print(f"清单文件已保存至: {output_path}")
