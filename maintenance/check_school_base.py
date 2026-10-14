import sys
import pymysql

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

conn = pymysql.connect(
    host="127.0.0.1", port=53061, user="root", password="Lt19960614.",
    database="stuck-mg", charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor
)

with conn.cursor() as cur:
    cur.execute("SHOW TABLES LIKE '%class%'")
    print("Class tables:", cur.fetchall())
    cur.execute("SHOW TABLES LIKE '%student%'")
    print("Student tables:", cur.fetchall())

    # 查班级表结构
    try:
        cur.execute("SELECT * FROM edu_class LIMIT 10")
        for r in cur.fetchall():
            print("班级:", r)
    except Exception as e:
        print("查班级表失败:", e)

    # 查学生总数
    try:
        cur.execute("SELECT count(*) as total_students FROM edu_student WHERE del_flag = '0'")
        print("在籍学生总数:", cur.fetchone())
    except Exception as e:
        print("查学生总数失败:", e)

    # 查文印登记里的班级分布
    cur.execute("""
        SELECT class_name, count(*) as cnt, sum(print_count) as total_copies, sum(total_pages) as total_sheets
        FROM edu_print_record
        WHERE del_flag = '0' AND status = '1'
        GROUP BY class_name
        ORDER BY cnt DESC
        LIMIT 10
    """)
    print("\n文印登记里的班级分布:")
    for r in cur.fetchall():
        print(" ", r)

conn.close()
