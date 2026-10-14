import os
import sys
import re
import zipfile
import urllib.parse
import pymysql
import xml.etree.ElementTree as ET

def get_pdf_pages(p):
    try:
        with open(p, "rb") as f:
            c = f.read()
        pages = len(re.findall(rb"/Type\s*/Page\b", c))
        if pages > 0:
            return pages
        counts = re.findall(rb"/Count\s+(\d+)", c)
        if counts:
            return max(int(x) for x in counts)
        return None
    except:
        return None

def get_docx_pages(p):
    try:
        with zipfile.ZipFile(p, "r") as z:
            if "docProps/app.xml" in z.namelist():
                root = ET.fromstring(z.read("docProps/app.xml"))
                for elem in root.iter():
                    if elem.tag.endswith("Pages"):
                        return int(elem.text)
    except:
        return None

conn = pymysql.connect(
    host="127.0.0.1", port=53061, user="root", password="Lt19960614.",
    database="stuck-mg", charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor
)
with conn.cursor() as cur:
    cur.execute("""
        SELECT print_id, print_name, print_count, page_count, total_pages, attachment 
        FROM edu_print_record 
        WHERE del_flag = '0' AND status = '1' AND attachment IS NOT NULL AND attachment != '' 
        ORDER BY total_pages DESC
    """)
    rows = cur.fetchall()
conn.close()

upload_base = "/data/doupi/uploadPath"
diffs = []
for r in rows:
    att = r["attachment"]
    if "/profile/" in att:
        rel = urllib.parse.unquote(att.split("/profile/")[1])
        local = os.path.join(upload_base, rel.replace("/", os.sep))
        if os.path.exists(local):
            ext = os.path.splitext(local)[1].lower()
            p = get_pdf_pages(local) if ext == ".pdf" else (get_docx_pages(local) if ext == ".docx" else None)
            if p is not None:
                diffs.append((r["print_id"], r["print_name"], r["print_count"], r["page_count"], p, r["total_pages"]))

print("成功读取真实物理页数的文件数:", len(diffs))
match_cnt = sum(1 for d in diffs if d[3] == d[4])
diff_cnt = sum(1 for d in diffs if d[3] != d[4])
print("其中【真实物理页数 == 登记页数】的条数:", match_cnt, "(完全吻合，严格保留原值不改)")
print("其中【真实物理页数 != 登记页数】的条数:", diff_cnt)
print("\n前 15 笔有原稿但页数不符样例 (单号, 名称, 份数, 登记页数, 物理文件页数, 当前耗纸):")
for d in [x for x in diffs if x[3] != x[4]][:15]:
    print(f"  #{d[0]} {d[1][:24]} | 份数={d[2]} | 登记={d[3]}页, 实际文件={d[4]}页 | 耗纸={d[5]}")
