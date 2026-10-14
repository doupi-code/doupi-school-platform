#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import pymysql

conn = pymysql.connect(
    host="127.0.0.1", port=53061, user="root", password="Lt19960614.",
    database="stuck-mg", charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor
)

with conn.cursor() as cur:
    cur.execute("SELECT count(*) as cnt FROM edu_print_record WHERE remark LIKE '%估算%' OR remark LIKE '%修正%'")
    print("edu_print_record 中含 估算/修正 的记录数:", cur.fetchone()["cnt"])

    cur.execute("SELECT count(*) as cnt FROM edu_stock_out WHERE remark LIKE '%估算%' OR remark LIKE '%修正%'")
    print("edu_stock_out 中含 估算/修正 的记录数:", cur.fetchone()["cnt"])

    cur.execute("SELECT print_id, remark FROM edu_print_record WHERE remark LIKE '%估算%' OR remark LIKE '%修正%' LIMIT 10")
    print("\n样例 edu_print_record:")
    for r in cur.fetchall():
        print(f"  #{r['print_id']}: {r['remark']}")

    cur.execute("SELECT out_id, remark FROM edu_stock_out WHERE remark LIKE '%估算%' OR remark LIKE '%修正%' LIMIT 10")
    print("\n样例 edu_stock_out:")
    for r in cur.fetchall():
        print(f"  #{r['out_id']}: {r['remark']}")

conn.close()
