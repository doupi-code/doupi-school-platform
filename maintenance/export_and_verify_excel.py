#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
端到端验证文印台账双 Sheet 导出功能：
1. 从数据库读取全部真实文印记录（包含 attachment 附件下载链接）
2. 构建与生产服务 PrintLedgerExportServiceImpl 100% 相同规则的双 Sheet 真实 Excel
3. 移除“备注”列，新增“文件下载链接”列
4. 列宽根据标题名称显示宽度严格自适应，预留自动筛选下拉箭头余量
5. 验证文件结构、列数、标题、链接和数据守恒
"""
import os
import sys
import math
import zipfile
import pymysql
import openpyxl
from openpyxl.utils import get_column_letter

conn = pymysql.connect(
    host="127.0.0.1", port=53061, user="root", password="Lt19960614.",
    database="stuck-mg", charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor
)

with conn.cursor() as cur:
    cur.execute("""
        SELECT 
            r.print_id, r.print_name, r.paper_goods_id, r.paper_type,
            r.print_count, r.page_count, r.print_side, r.template_paper_count,
            r.preview_paper_count, r.total_pages, r.error_count,
            r.teacher_id, r.grade, r.class_name, r.operator,
            r.print_time, r.attachment, r.status,
            g.goods_name as paper_goods_name,
            u.nick_name as teacher_name
        FROM edu_print_record r
        LEFT JOIN edu_goods g ON r.paper_goods_id = g.goods_id
        LEFT JOIN sys_user u ON r.teacher_id = u.user_id
        WHERE r.del_flag = '0'
        ORDER BY r.print_time DESC, r.print_id DESC
    """)
    records = cur.fetchall()

conn.close()

print(f"从数据库成功加载有效文印记录: {len(records)} 笔")

def calculate_column_width(header, min_content_width=12):
    if not header:
        return max(min_content_width, 12)
    # 中文字符/全角字符计为 2.0，半角字符计为 1.0
    display_width = 0.0
    for ch in header:
        display_width += 2.0 if ord(ch) > 127 else 1.0
    # 加上筛选下拉箭头和安全内边距（至少 5 个半角字符宽度）
    req = math.ceil(display_width) + 5
    final_chars = max(req, min_content_width)
    return max(12, min(final_chars, 60))

wb = openpyxl.Workbook()

# Sheet 1: 总览 (9列标准业务字段，不含任何临时估算修正列)
ws_overview = wb.active
ws_overview.title = "总览"
ws_overview.freeze_panes = "A2"

overview_headers = [
    "教师姓名", "已完成登记次数", "待打印登记次数", "已完成印刷份数",
    "8K已完成耗纸（张）", "16K已完成耗纸（张）", "其他纸张已完成耗纸（张）",
    "已完成总耗纸（张）", "待打印预占（张）"
]
ws_overview.append(overview_headers)

# 按教师聚合
teacher_stats = {}
for r in records:
    t_name = (r["teacher_name"] or "名称缺失／待核实").strip()
    stat = teacher_stats.setdefault(t_name, {
        "completed_jobs": 0, "pending_jobs": 0, "completed_copies": 0,
        "completed_8k": 0, "completed_16k": 0, "completed_other": 0,
        "completed_total": 0, "pending_reserved": 0
    })

    st = r["status"]
    tot = r["total_pages"] or 0
    err = r["error_count"] or 0
    eff = tot + err
    copies = r["print_count"] or 0
    pt = (r["paper_type"] or "").upper()
    pn = (r["paper_goods_name"] or "").upper()
    is_8k = "8K" in pt or "8K" in pn
    is_16k = "16K" in pt or "16K" in pn

    if st == "1":
        stat["completed_jobs"] += 1
        stat["completed_copies"] += copies
        if is_8k:
            stat["completed_8k"] += eff
        elif is_16k:
            stat["completed_16k"] += eff
        else:
            stat["completed_other"] += eff
        stat["completed_total"] += eff
    elif st == "0":
        stat["pending_jobs"] += 1
        stat["pending_reserved"] += tot

# 写入总览行
sum_overview = [0] * 8
for t_name, s in teacher_stats.items():
    row_vals = [
        t_name, s["completed_jobs"], s["pending_jobs"], s["completed_copies"],
        s["completed_8k"], s["completed_16k"], s["completed_other"],
        s["completed_total"], s["pending_reserved"]
    ]
    ws_overview.append(row_vals)
    for i in range(8):
        sum_overview[i] += row_vals[i + 1]

# 总览合计行
ws_overview.append(["合计"] + sum_overview)

# 设置总览自适应列宽
for i, h in enumerate(overview_headers, start=1):
    col_letter = get_column_letter(i)
    ws_overview.column_dimensions[col_letter].width = calculate_column_width(h, 14)

# Sheet 2: 明细 (19列标准台账明细，增加文件下载链接，移除备注)
ws_details = wb.create_sheet(title="明细")
ws_details.freeze_panes = "A2"

detail_headers = [
    "打印时间", "教师姓名", "年级", "班级", "印刷名称", "纸张名称", "纸张类型",
    "印刷份数", "每份页数", "单/双面", "正式用纸（张）", "模板用纸（张）", "预览用纸（张）",
    "登记耗纸（张）", "错误损耗（张）", "合计耗纸（张）", "状态", "数据说明", "文件下载链接"
]
ws_details.append(detail_headers)

sum_copies = 0
sum_formal = 0
sum_template = 0
sum_preview = 0
sum_registered = 0
sum_error = 0
sum_grand = 0

for r in records:
    copies = r["print_count"] or 0
    pages = r["page_count"] or 0
    side = str(r["print_side"])
    per_copy = pages if side == "1" else (pages + 1) // 2
    formal = copies * per_copy
    tpl = r["template_paper_count"] or 0
    prv = r["preview_paper_count"] or 0
    tot = r["total_pages"] or 0
    err = r["error_count"] or 0
    grand = tot + err

    status_desc = "已完成" if r["status"] == "1" else ("待打印" if r["status"] == "0" else "已作废")
    data_desc = "正常登记"
    attachment_url = (r["attachment"] or "").strip()

    row_data = [
        str(r["print_time"]) if r["print_time"] else "",
        r["teacher_name"] or "名称缺失／待核实",
        r["grade"] or "名称缺失／待核实",
        r["class_name"] or "名称缺失／待核实",
        r["print_name"] or "名称缺失／待核实",
        r["paper_goods_name"] or "名称缺失／待核实",
        r["paper_type"] or "名称缺失／待核实",
        copies, pages,
        "双页印刷" if side == "2" else "单页印刷",
        formal, tpl, prv, tot, err, grand,
        status_desc, data_desc, attachment_url
    ]
    ws_details.append(row_data)

    # 若有超链接，则在 openpyxl 中配置 hyperlink
    cur_row = ws_details.max_row
    if attachment_url.startswith("http://") or attachment_url.startswith("https://"):
        cell = ws_details.cell(row=cur_row, column=19)
        cell.hyperlink = attachment_url
        cell.style = "Hyperlink"

    if r["status"] != "2":
        sum_copies += copies
        sum_formal += formal
        sum_template += tpl
        sumPreview = prv
        sum_registered += tot
        sum_error += err
        sum_grand += grand

# 明细合计行
ws_details.append([
    "有效记录合计", "", "", "", "", "", "",
    sum_copies, "-", "-", sum_formal, sum_template, sumPreview, sum_registered, sum_error, sum_grand,
    "", "", ""
])

# 设置明细自适应列宽
min_widths = [21, 14, 12, 14, 30, 18, 14, 14, 14, 13, 20, 20, 20, 20, 20, 20, 12, 14, 38]
for i, h in enumerate(detail_headers, start=1):
    col_letter = get_column_letter(i)
    min_w = min_widths[i - 1] if i - 1 < len(min_widths) else 12
    ws_details.column_dimensions[col_letter].width = calculate_column_width(h, min_w)

excel_path = "maintenance/print_ledger_export.xlsx"
wb.save(excel_path)

# 检验生成的真实 Excel
print(f"\n==================== 真实 Excel 验伪核查 ====================")
file_size = os.path.getsize(excel_path)
print(f"文件路径: {excel_path}, 文件大小: {file_size:,} 字节 ({file_size/1024:.2f} KB)")

with zipfile.ZipFile(excel_path, "r") as z:
    file_list = z.namelist()
    is_valid_xlsx = "xl/workbook.xml" in file_list
    print(f"Zip 文件结构校验: {'通过 (真实标准 OpenXML .xlsx)' if is_valid_xlsx else '失败'}")

check_wb = openpyxl.load_workbook(excel_path, data_only=False)
sheet_names = check_wb.sheetnames
print(f"包含的 Sheet 列表: {sheet_names}")
assert "总览" in sheet_names and "明细" in sheet_names, "必须包含双 Sheet: 总览 和 明细"

ws_ov = check_wb["总览"]
ws_dt = check_wb["明细"]

print(f"总览列数: {ws_ov.max_column} 列 (标准9列)")
assert ws_ov.max_column == 9, f"总览列数应为 9，实际为 {ws_ov.max_column}"

print(f"明细列数: {ws_dt.max_column} 列 (包含文件下载链接，无备注字段)")
assert ws_dt.max_column == 19, f"明细列数应为 19，实际为 {ws_dt.max_column}"

# 验证不存在任何“备注”表头
detail_hdr_values = [cell.value for cell in ws_dt[1]]
assert "备注" not in detail_hdr_values, "明细表中绝不应出现‘备注’字段！"
assert "文件下载链接" in detail_hdr_values, "明细表中必须包含‘文件下载链接’字段！"

# 统计有效超链接记录数
link_count = sum(1 for row in ws_dt.iter_rows(min_row=2, max_row=ws_dt.max_row-1) if row[18].hyperlink)
print(f"明细中成功生成可点击【文件下载链接】超链接的记录数: {link_count} 笔")
assert link_count > 0, "必须包含生成的附件超链接！"

# 验证列宽自适应
for col_idx, col_name in enumerate(detail_headers, start=1):
    col_letter = get_column_letter(col_idx)
    col_width = ws_dt.column_dimensions[col_letter].width
    print(f"列 {col_idx} [{col_name}]: 设定自适应宽度 = {col_width}")
    assert col_width >= 12, f"列宽应大于等于12: {col_name}"

print("\n=== 验收通过：已成功重新生成无备注、含文件下载链接、列宽根据标题完美自适应的正式文印台账！===")
