-- MINI-02: incremental migration for MySQL 8.4.

-- Review and back up before execution. DDL auto-commits; apply before enabling the login endpoint.

ALTER TABLE sys_user ADD COLUMN auth_version BIGINT NOT NULL DEFAULT 0 COMMENT '新增，停用/角色变更使旧会话失效';

CREATE TRIGGER trg_mini02_account_auth_version BEFORE UPDATE ON sys_user FOR EACH ROW
SET NEW.auth_version = GREATEST(NEW.auth_version, OLD.auth_version + IF(
    NOT (NEW.status <=> OLD.status) OR NOT (NEW.del_flag <=> OLD.del_flag)
    OR NOT (NEW.dept_id <=> OLD.dept_id) OR NOT (NEW.password <=> OLD.password), 1, 0));

CREATE TRIGGER trg_mini02_role_insert AFTER INSERT ON sys_user_role FOR EACH ROW
UPDATE sys_user SET auth_version=auth_version+1 WHERE user_id=NEW.user_id;

CREATE TRIGGER trg_mini02_role_delete AFTER DELETE ON sys_user_role FOR EACH ROW
UPDATE sys_user SET auth_version=auth_version+1 WHERE user_id=OLD.user_id;

CREATE TRIGGER trg_mini02_role_update AFTER UPDATE ON sys_user_role FOR EACH ROW
UPDATE sys_user SET auth_version=auth_version+1
WHERE user_id IN (OLD.user_id, NEW.user_id)
  AND (OLD.user_id <> NEW.user_id OR OLD.role_id <> NEW.role_id);

CREATE TABLE `sys_external_identity` (
  `identity_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '外部渠道身份',
  `provider` VARCHAR(16) NOT NULL COMMENT '如WECHAT，受控渠道类型',
  `app_id` VARCHAR(64) NOT NULL COMMENT '渠道应用标识，避免跨小程序subject冲突',
  `subject_id` VARCHAR(128) NOT NULL COMMENT '经渠道服务端认证的主体，非任意客户端字符串',
  `user_id` BIGINT NULL COMMENT '已核实绑定的学校员工，访客保持NULL',
  `link_status` VARCHAR(16) NOT NULL COMMENT 'VISITOR/PENDING/VERIFIED/REVOKED',
  `verified_by` BIGINT NULL COMMENT '学校核实操作人',
  `verified_at` DATETIME(3) NULL COMMENT '核实时间',
  `created_at` DATETIME(3) NOT NULL COMMENT '建立时间',
  PRIMARY KEY (`identity_id`),
  UNIQUE `uk_external_subject` (
    `provider`,
    `app_id`,
    `subject_id`
  ),
  INDEX `idx_external_user` (`user_id`, `link_status`),
  CONSTRAINT `fk_ref_087` FOREIGN KEY (`verified_by`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_099` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='sys_external_identity';

/* Target schema definition. The complete schema is at database/target/schema.sql. */
/* This file adds six channel tables. Existing technical-design tables are not recreated. */
CREATE TABLE channel_idempotency (
  command_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '渠道命令主键',
  scope_key VARCHAR(128) NOT NULL COMMENT '服务端主体范围IDENTITY或STAFF，不接受body操作者',
  action_code VARCHAR(64) NOT NULL COMMENT '固定动作代码，目标ID只进入payload摘要',
  idempotency_key VARCHAR(64) NOT NULL COMMENT '客户端同一命令重试键',
  payload_hash CHAR(64) NOT NULL COMMENT '规范载荷SHA256，包含路径目标ID',
  http_status SMALLINT NULL COMMENT '成功归档HTTP状态，事务提交前填充',
  result_json JSON NULL COMMENT '可重放业务结果，不含token和查询明文凭证',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC占键时间',
  PRIMARY KEY (command_id),
  UNIQUE uk_channel_command (
    scope_key,
    action_code,
    idempotency_key
  ) COMMENT '同主体同动作同键只执行一次',
  INDEX idx_channel_created (created_at, command_id)   COMMENT '审计查询和归档，不自动删除有效业务重试记录',
  CONSTRAINT ck_channel_result CHECK ((
    http_status IS NULL AND result_json IS NULL
  )
  OR (
    http_status BETWEEN 200 AND 299 AND NOT result_json IS NULL
  ))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='无office_request根的渠道动作幂等，与业务同事务';

CREATE TABLE auth_binding_request (
  binding_request_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '员工身份核实申请ID',
  identity_id BIGINT NOT NULL COMMENT '已微信认证的外部身份',
  staff_user_id BIGINT NOT NULL COMMENT '待核实学校员工账号',
  status VARCHAR(16) NOT NULL COMMENT 'PENDING、VERIFIED、REJECTED',
  reason VARCHAR(300) NOT NULL COMMENT '申请者核实依据说明',
  reviewed_by BIGINT NULL COMMENT '学校核实人，不能为目标本人',
  review_remark VARCHAR(300) NULL COMMENT '核实依据与结论，不保存密码证件原文',
  reviewed_at DATETIME(3) NULL COMMENT 'UTC核实时间',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '并发版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC申请时间',
  pending_identity_id BIGINT GENERATED ALWAYS AS (CASE WHEN status = 'PENDING' THEN identity_id ELSE NULL END) STORED COMMENT '仅待核实申请占唯一槽',
  PRIMARY KEY (binding_request_id),
  UNIQUE uk_binding_pending (
    pending_identity_id
  ) COMMENT '一个外部身份至多一份待核实申请',
  INDEX idx_binding_identity (identity_id, created_at, binding_request_id)   COMMENT '本人申请历史',
  INDEX idx_binding_staff (staff_user_id, status, binding_request_id)   COMMENT '学校核实范围筛选',
  INDEX idx_binding_reviewer (reviewed_by)   COMMENT '核实审计',
  CONSTRAINT fk_binding_identity FOREIGN KEY (identity_id) REFERENCES sys_external_identity (
    identity_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_binding_staff FOREIGN KEY (staff_user_id) REFERENCES sys_user (
    user_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_binding_reviewer FOREIGN KEY (reviewed_by) REFERENCES sys_user (
    user_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_binding_status CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  CONSTRAINT ck_binding_version CHECK (version >= 0),
  CONSTRAINT ck_binding_separation CHECK (reviewed_by IS NULL OR reviewed_by <> staff_user_id)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='学校核实微信员工绑定，不按手机号自动授员工权限';

-- Register the permission under the existing teacher-binding page. Role grants are manual.
INSERT INTO sys_menu (menu_name, parent_id, order_num, path, menu_type, visible, status,
                      perms, icon, create_by, create_time, remark)
SELECT '小程序员工身份核实', existing.menu_id, 10, '#', 'F', '0', '0',
       'identity:binding:approve', '#', 'migration', UTC_TIMESTAMP(),
       'MINI-02 员工绑定申请核实和撤销'
FROM (
    SELECT MIN(menu_id) AS menu_id FROM sys_menu
    WHERE menu_type='C' AND perms='recruit:binding:list'
) existing
WHERE existing.menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms='identity:binding:approve');
