# 数据库结构资料

更新：2026-11-06。

- [正式库结构基线](baseline/production-2026-11-05.sql)：66张表，11月6日只读复核；不含业务数据。
- [完整目标结构](target/schema.sql)：131张表，保留线上结构并纳入65张规划表；仅供空库设计审阅。
- [字段、索引与约束差异](../docs/engineering/05-数据库结构差异.md)：模块归属、处理结论与数据前提。
- [历史SQL清单](history/manifest.json)：11份脚本原路径、现路径及SHA256，不能按顺序全部执行。

没有增量迁移脚本，没有执行线上DDL/DML或导出业务数据。后端已有sql目录保留历史兼容，最新结构事实以baseline为准，未来设计以target为准。模块第四节与target同步维护。在项目根目录运行只读检查：`python scripts/check-project-docs.py`。
