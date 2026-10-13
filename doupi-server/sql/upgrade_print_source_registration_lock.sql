-- Run before deploying the source-registration concurrency fix.
-- Safe to run after upgrade_print_record_extra_paper_and_wechat_source.sql,
-- including installations that already applied that earlier migration.
-- Keep these guard rows: removing them during active imports would break serialization.
CREATE TABLE IF NOT EXISTS `edu_print_source_lock` (
  `source_conversation_id` varchar(64) NOT NULL,
  PRIMARY KEY (`source_conversation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
  COMMENT='微信来源登记事务锁；由数据库持有到提交或回滚';
