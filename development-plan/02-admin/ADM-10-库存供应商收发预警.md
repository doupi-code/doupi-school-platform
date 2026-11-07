# ADM-10 基础库存、供应商、验收收发与预警

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-10)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

工期4人日。负责物品和供应商基础资料、真实可用量验收入库、授权仓库调出、统一流水、包装/散量投影及基础量预警。教职工领用必须走ADM-08获准申请，文印领纸走ADM-06；本模块调出仅用于仓库调拨，不代替领用审批。不建设采购合同、付款和应付系统。排期前置为ADM-09；复用ADM-01工程基线、ADM-02员工/权限/仓库规则、ADM-03审计根与动作，以及ADM-06/08/09已接入的统一收发契约。

- [ ] 第1日：实现`inventory/InventoryRepository.java`及`InventoryService.saveGoods/saveSupplier`基础校验
- [ ] 第2日：实现`arrival/dispatch`和`StockLedger.java`单写余额
- [ ] 第3日：在现有`doupi-web-admin-react/src/pages/stock`下接入基础量/包装/散量/预警并新增`movements.tsx`、到货验收明细
- [ ] 第4日：验收部分拒收、全拒收、同物品并行出库、负余额、换算率锁定与动作重放。分层说明代码见本模块第5节；生产接入时旧保存扣库逻辑必须停用后再切新接口，本轮不做切换。

验收：goods.stock_qty_base唯一真值；每次变动生成signed stock_movement并同步兼容凭证；arrived=accepted+rejected，只accepted增加库存；stock_num=base/rate、remain_sheets=base%rate；有历史movement后不改单位/换算；物品与收发变更有INVENTORY根及动作；供应商统一复用ADM-02带version的DirectoryService及目录审计，不另造第二套写入。

## 2. 接口设计清单

库存前缀`/api/v1/office/inventory`，全部员工JWT。写请求`Idempotency-Key`必填，ID字符串，数量精确整数。物品/到货/调出创建新的`biz_type=INVENTORY`审计根，可选根字段`applicantUserId,title,clientSource,dueAt`遵循Roots；不接受客户端操作者。更新goods另需`expectedGoodsVersion`，不是上一个审计根的expectedVersion。供应商新增/修改使用下列完整目录路径；保留的`/inventory/suppliers`写路由仅委托同一个DirectoryService，使用同一SUPPLIER_SAVE幂等和目录version。

| 接口名称 | 请求方式 | 路径 | 请求参数（字段名/类型/是否必填/含义） | 返回参数（字段名/类型/含义） | 权限要求 |
|---|---|---|---|---|---|
| 查询 goods | GET | `/api/v1/office/inventory/goods` | query afterId非负默认0、warnings布尔默认false | `items`最多200个物品；200 | `inventory:goods:read` |
| 办理 goods | POST | `/api/v1/office/inventory/goods` | goods全部字段见下，及可选根字段 | `goodsId,goodsVersion=0,stockQtyBase=0,requestId,status=COMPLETED,version`；201 | `inventory:goods:write` |
| 更新 {id} | PUT | `/api/v1/office/inventory/goods/{id}` | path goodsId，`expectedGoodsVersion`，goods全部字段及可选根字段 | `goodsId,goodsVersion,stockQtyBase,requestId,status,version`；200 | `inventory:goods:write` |
| 查询 suppliers | GET | `/api/v1/office/inventory/suppliers` | 无body | `items[{supplier_id,supplier_name,contact,phone,version}]`；200 | `inventory:supplier:read` |
| 办理 suppliers | POST | `/api/v1/office/directory/suppliers` | `supplierName`string 1—100必填、`contact`string可空≤50、`phone`string可空（非空3—20且仅+数字括号空格短横线）、`enabled`boolean可省略默认true；Idempotency-Key为8—64个字母数字或_.:- | `supplier_id`string，`supplier_name,contact,phone,del_flag`string，`version`long；201 | `directory:maintain` |
| 更新 {id} | PUT | `/api/v1/office/directory/suppliers/{id}` | path supplierId正ID，`expectedVersion`非负long必填，其余同创建 | 同新增供应商，`version+1`；200 | `directory:maintain` |
| 查询 movements | GET | `/api/v1/office/inventory/goods/{id}/movements` | path goodsId，query afterId非负默认0 | `items`最多200条按movement_id升序统一流水；200 | `inventory:movement:read` |
| 办理 arrivals | POST | `/api/v1/office/inventory/arrivals` | `supplierId`正ID、`reason`1—500、`items`非空，每项`goodsId`正ID、`arrivedQty`正数、`acceptedQty,rejectedQty`非负；可选根字段 | `inId,acceptanceStatus,items[{itemId,goodsId,movementId,acceptedQty,rejectedQty}],requestId,status,version`；201，accepted=0的movementId为空 | `inventory:arrival:accept` |
| 办理 dispatches | POST | `/api/v1/office/inventory/dispatches` | `destination`1—50、`reason`1—500、`items`非空，每项`goodsId,qty`正数；可选根字段 | `outId,items[{itemId,movementId}],requestId,status,version`；201 | `inventory:dispatch:confirm` |

goods完整字段：`goodsName`1—100、`category`枚举1办公物/2教材/3耗材、`unit`包装单位1—10、`baseUnit`基础单位1—20、`conversionRate`1—2147483647、`warnLowBaseQty`非负；`supplierId`可空有效ID、`grade`可空≤20、`spec`可空≤50、`location`可空≤100、`returnRequired`布尔默认false。创建不接收初始余额，必须通过到货或经独立复核盘点形成库存事实。GET goods无warnings时返回当前edu_goods业务列，有warnings时返回`goods_id,goods_name,category,supplier_id,unit,conversion_rate,base_unit,stock_qty_base,stock_num,remain_sheets,warn_low_base_qty,location,return_required,version`。movement返回`movement_id,goods_id,request_id,action_id,source_type,source_id,source_item_id,movement_kind,delta_qty,before_qty,after_qty,base_unit,goods_version,actor_user_id,occurred_at,posted_at,reason,reversal_of_movement_id`。


## 3. 数据流转细节

| API/字段来源 | 字段校验及逻辑 | 表字段、审计与事务/缓存 |
|---|---|---|
| goods GET：afterId/warnings | 非负游标；权限校验后只取del_flag=0，warnings=true增加stock_qty_base≤warn_low_base_qty | edu_goods实时读取；预警可以缓存展示但不能作扣库依据；不将stock_num当基础量 |
| supplier GET | 员工与读取权限 | edu_supplier有效行，返回联系人电话仅内部，不开放公共路由 |
| goods CREATE：完整goods字段 | unit/baseUnit非空，category固定枚举，rate正整数受int范围，warning非负，supplier若有须有效；Actor须根规则warehouseRoleId | Roots.create(INVENTORY)建审计根；INSERT goods名称/类别/供应商/年级/规格/单位/换算/基础预警/库位/应归还；stock_qty_base/stock_num/remain_sheets/warn_low/version=0；根完成，target=GOODS/id；action INVENTORY_GOODS_CREATE与INVENTORY_MASTER_CHANGED事件同事务 |
| goods UPDATE：path id/expectedGoodsVersion/全字段 | path goodsId规范加入动作摘要；锁goods并比goods.version；有历史movement则unit、base_unit、conversion_rate不能变化；无历史时也不直接改余额 | UPDATE基础字段，stock_num与remain由当前唯一余额及新rate重新投影，version+1；audit存完整before及after；action INVENTORY_GOODS_UPDATE、新INVENTORY根，Commands只递增根版本一次 |
| supplier CREATE/UPDATE：supplierName/contact/phone/enabled、path id/expectedVersion | 全部复用DirectoryService.saveSupplier；名称长度/唯一、电话受限；锁supplier并比version；path supplierId入hash；enabled=false映射del_flag=2停止新选择 | INSERT/UPDATE edu_supplier，首次version=0、修改+1；ExternalCommands(scope=STAFF:Actor,action=SUPPLIER_SAVE)占channel_idempotency，同hash先重放；directory_change_log存entity_type=SUPPLIER/entity_id/actor/before/after，同事务提交；兼容inventory写路由不另写根、不另起动作、不绕过版本 |
| movement GET：id/afterId | goods存在有效；非负游标，固定SQL及升序，无客户端SQL/排序片段 | stock_movement只读，不按兼容in/out重复计算；不缓存唯一余额 |
| arrival：supplierId/reason/items[].goodsId | supplier有效；items非空且同goods不重复；按goodsId排序锁余额；reason必填；Actor仓库岗位 | 先INSERT edu_stock_in获得in_id；in_no=IN+actionId、request/supplier/operator_id/姓名快照/in_time/server/status=1/source_type=ARRIVAL/action_id/version=0；同根所有到货行一个头 |
| arrival：arrivedQty/acceptedQty/rejectedQty | 三者基础单位；arrived>0，accepted/rejected≥0，arrived=accepted+rejected（溢出拒绝）；短缺不登记为实到；全拒收合法但不生0流水 | INSERT edu_stock_in_item.quantity=arrived/base_qty=accepted/arrived_qty/rejected_qty/unit=goods.base_unit/conversion_rate=1/price=amount=0；accepted>0调用ledger.move正delta、source=ARRIVAL/inId/itemId/kind=RECEIVE，回填movement_id；拒收>0头acceptance_status=PARTIAL；没有拒收ACCEPTED；根完成，action INVENTORY_ARRIVAL_ACCEPT，audit及INVENTORY_RECEIVED |
| dispatch：destination/reason/items.goodsId/qty | destination实际调出目的地、qty>0；同物品合并且按ID排序；Actor仓库岗位、专属调出权限；不是职工领用入口 | INSERT edu_stock_out out_type=2/receiver=destination/operator真实/out_time/status=1/receipt_status=CONFIRMED/action_id；插out_item.quantity=base_qty=qty/unit=base_unit/conversion_rate=1；ledger负delta source=INVENTORY_OUT/outId/itemId/kind=TRANSFER_OUT，回填movement；根完成、target STOCK_OUT，audit目的地/原因，INVENTORY_DISPATCHED事件 |
| ledger内部字段 | 锁goods，精确计算before+delta≥0，校验换算和单位，goods.version条件更新；来源唯一键不允许同事件重复movement | 写stock_qty_base和包装/散量投影、goods.version+1；写stock_movement完整signed delta/前后余额/单位/actor/时间/版本/来源/action/request；ARRIVAL和INVENTORY_OUT仅回填预建兼容明细，其他领退来源由ledger生成引用同流水的兼容凭证；从不第二次扣余额 |

物品和收发先运行固定action幂等查询，再根创建、岗位资格、业务锁和余额锁；失败整事务回滚，包括新INVENTORY根，不持久化伪成功。供应商使用目录已有事务/幂等/审计。缓存只做可重建查询，命令结果以office_action_log或channel_idempotency存档为准。goods变更需要失效物品/预警查询；不依赖缓存失效成功保证余额正确。

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

**channel_idempotency**

```sql
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
```

**directory_change_log**

```sql
CREATE TABLE directory_change_log (
  change_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '档案变更事件',
  entity_type VARCHAR(24) NOT NULL COMMENT 'CLASS/SUPPLIER/KIT',
  entity_id BIGINT NOT NULL COMMENT '类型内主键，逻辑关联',
  actor_user_id BIGINT NOT NULL COMMENT '真实操作人',
  before_json JSON NOT NULL COMMENT '变更前快照',
  after_json JSON NOT NULL COMMENT '变更后快照',
  created_at DATETIME(3) NOT NULL COMMENT '变更时间UTC',
  PRIMARY KEY (change_id),
  INDEX idx_directory_entity (entity_type, entity_id, change_id),
  CONSTRAINT fk_directory_actor FOREIGN KEY (actor_user_id) REFERENCES sys_user (
    user_id
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='档案变更审计，禁止一般编辑删除';
```

**edu_goods**

```sql
CREATE TABLE `edu_goods` (
  `goods_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '物品ID',
  `goods_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物品名称',
  `category` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类：1-教师办公品 2-学生教材 3-文印耗材',
  `supplier_id` BIGINT DEFAULT NULL COMMENT '默认供应商ID',
  `grade` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '适用年级（如高一、初一，非教材类为空）',
  `spec` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '规格',
  `unit` VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '单位',
  `stock_num` BIGINT NOT NULL DEFAULT '0' COMMENT '当前库存',
  `warn_low` BIGINT NOT NULL DEFAULT '0' COMMENT '库存下限',
  `location` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '存放位置',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '删除标志 0存在 2删除',
  `conversion_rate` INT DEFAULT '500' COMMENT '每包装基础数量换算率(如1000张/包)',
  `base_unit` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT '张' COMMENT '最小基础消耗单位(如张/支/本)',
  `remain_sheets` INT DEFAULT '0' COMMENT '散张/零头余量(如整包拆开后剩余散张数)',
  PRIMARY KEY (`goods_id`),
  INDEX `idx_category` (`category`),
  INDEX `idx_grade` (`grade`),
  INDEX `idx_supplier_id` (`supplier_id`),
  `stock_qty_base` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，唯一可写基础单位余额',
  `warn_low_base_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，基础单位预警线',
  `return_required` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '新增，应归还标记',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，库存行版本',
  INDEX `idx_goods_active` (`category`, `del_flag`),
  CONSTRAINT `ck_edu_goods_0` CHECK (stock_qty_base >= 0),
  CONSTRAINT `ck_edu_goods_1` CHECK (conversion_rate > 0),
  CONSTRAINT `ck_edu_goods_2` CHECK (remain_sheets >= 0 AND remain_sheets < conversion_rate),
  CONSTRAINT `fk_ref_022` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_023` FOREIGN KEY (`supplier_id`) REFERENCES `edu_supplier` (
    `supplier_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='物品档案表';
```

**edu_supplier**

```sql
CREATE TABLE `edu_supplier` (
  `supplier_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '供应商ID',
  `supplier_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '供应商名称',
  `contact` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '联系人',
  `phone` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '联系电话',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0',
  PRIMARY KEY (`supplier_id`),
  UNIQUE `uk_supplier_name` (
    `supplier_name`
  ),
  version BIGINT NOT NULL DEFAULT 0 COMMENT '供应商并发版本'
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='供应商表';
```

**edu_stock_in**

```sql
CREATE TABLE `edu_stock_in` (
  `in_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '入库ID',
  `in_no` VARCHAR(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '入库单号',
  `in_type` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '入库类型：1-采购 2-调拨 3-其他',
  `supplier_id` BIGINT DEFAULT NULL COMMENT '供应商ID',
  `in_time` DATETIME NOT NULL COMMENT '入库时间',
  `operator` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '经办人',
  `operator_id` BIGINT DEFAULT NULL COMMENT '经办人用户ID',
  `remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1' COMMENT '状态：1-正常 2-作废',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0',
  `declared_package_count` INT DEFAULT NULL COMMENT '历史进货确认的总箱数，纸型可待核实',
  `declared_amount` DECIMAL(12, 2) DEFAULT NULL COMMENT '历史进货确认的总金额',
  PRIMARY KEY (`in_id`),
  UNIQUE `uk_in_no` (
    `in_no`
  ),
  `request_id` BIGINT NULL COMMENT '新增，归还/余纸退回/验收事项',
  `acceptance_status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT '新增，PENDING/PARTIAL/ACCEPTED/EXCEPTION',
  `source_type` VARCHAR(32) NULL COMMENT '新增，PRINT_RETURN/MATERIAL_RETURN/ARRIVAL等',
  `source_id` BIGINT NULL COMMENT '新增，来源记录',
  `action_id` BIGINT NULL COMMENT '新增，确认动作，历史可空',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增',
  UNIQUE `uk_in_action` (
    `action_id`
  ),
  INDEX `idx_in_request` (`request_id`, `in_time`),
  INDEX `idx_in_supplier` (`supplier_id`, `in_time`),
  INDEX `idx_in_status_time` (`status`, `in_time`),
  CONSTRAINT `fk_ref_024` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_025` FOREIGN KEY (`supplier_id`) REFERENCES `edu_supplier` (
    `supplier_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_026` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (
    `action_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='入库单主表';
```

**edu_stock_in_item**

```sql
CREATE TABLE `edu_stock_in_item` (
  `item_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `in_id` BIGINT NOT NULL COMMENT '入库单ID',
  `goods_id` BIGINT NOT NULL COMMENT '物品ID',
  `quantity` BIGINT NOT NULL COMMENT '数量',
  `price` DECIMAL(10, 2) DEFAULT '0.00' COMMENT '单价',
  `amount` DECIMAL(10, 2) DEFAULT '0.00' COMMENT '小计',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  INDEX `idx_in_id` (`in_id`),
  `base_qty` BIGINT NOT NULL COMMENT '新增，验收可用基础量',
  `arrived_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，实到基础量',
  `rejected_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，破损拒收基础量',
  `unit` VARCHAR(10) NOT NULL COMMENT '新增，登记单位快照',
  `conversion_rate` INT NOT NULL COMMENT '新增，换算快照',
  `movement_id` BIGINT NULL COMMENT '新增，唯一统一流水',
  INDEX `idx_in_item_goods` (`goods_id`, `in_id`),
  UNIQUE `uk_in_item_movement` (
    `movement_id`
  ),
  CONSTRAINT `fk_ref_027` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_028` FOREIGN KEY (`movement_id`) REFERENCES `stock_movement` (
    `movement_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_109` FOREIGN KEY (`in_id`) REFERENCES `edu_stock_in` (
    `in_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='入库单明细表';
```

**edu_stock_out**

```sql
CREATE TABLE `edu_stock_out` (
  `out_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '出库ID',
  `out_no` VARCHAR(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '出库单号',
  `out_type` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '出库类型：1-教师领用 2-学生领书 3-耗材出库',
  `receiver` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '领用人/班级',
  `class_id` BIGINT DEFAULT NULL COMMENT '关联班级ID',
  `out_time` DATETIME NOT NULL COMMENT '出库时间',
  `operator` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '经办人',
  `operator_id` BIGINT DEFAULT NULL COMMENT '经办人用户ID',
  `remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1' COMMENT '状态：1-正常 2-作废',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0',
  PRIMARY KEY (`out_id`),
  UNIQUE `uk_out_no` (
    `out_no`
  ),
  `request_id` BIGINT NULL COMMENT '新增，同事项可多次发放',
  `receiver_user_id` BIGINT NULL COMMENT '新增，校内领取身份；非账号不虚构ID',
  `class_name` VARCHAR(50) NULL COMMENT '新增，现有映射为关联展示，目标存历史快照',
  `grade` VARCHAR(20) NULL COMMENT '新增，现有映射为关联展示，目标存历史快照',
  `receipt_status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT '新增，PENDING/CONFIRMED/DISPUTED',
  `action_id` BIGINT NULL COMMENT '新增',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增',
  UNIQUE `uk_out_action` (
    `action_id`
  ),
  INDEX `idx_out_request` (`request_id`, `out_time`),
  INDEX `idx_out_class` (`class_id`, `out_time`),
  INDEX `idx_out_status_time` (`status`, `out_time`),
  CONSTRAINT `fk_ref_029` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_030` FOREIGN KEY (`receiver_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_031` FOREIGN KEY (`class_id`) REFERENCES `edu_class` (
    `class_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_032` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (
    `action_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='出库单主表';
```

**edu_stock_out_item**

```sql
CREATE TABLE `edu_stock_out_item` (
  `item_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `out_id` BIGINT NOT NULL COMMENT '出库单ID',
  `goods_id` BIGINT NOT NULL COMMENT '物品ID',
  `quantity` BIGINT NOT NULL COMMENT '数量',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  INDEX `idx_out_id` (`out_id`),
  `base_qty` BIGINT NOT NULL COMMENT '新增，实际发出基础量',
  `unit` VARCHAR(10) NOT NULL COMMENT '新增，登记单位快照',
  `conversion_rate` INT NOT NULL COMMENT '新增，换算快照',
  `movement_id` BIGINT NULL COMMENT '新增，复用同一流水，不再生成一次',
  INDEX `idx_out_item_goods` (`goods_id`, `out_id`),
  UNIQUE `uk_out_item_movement` (
    `movement_id`
  ),
  CONSTRAINT `fk_ref_033` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_034` FOREIGN KEY (`movement_id`) REFERENCES `stock_movement` (
    `movement_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_110` FOREIGN KEY (`out_id`) REFERENCES `edu_stock_out` (
    `out_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='出库单明细表';
```

**stock_movement**

```sql
CREATE TABLE `stock_movement` (
  `movement_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '流水，不当作全库提交顺序',
  `goods_id` BIGINT NOT NULL COMMENT '所有写入先锁该物品余额',
  `request_id` BIGINT NULL COMMENT '来源事项',
  `action_id` BIGINT NOT NULL COMMENT '一次动作可多物品',
  `source_type` VARCHAR(32) NOT NULL COMMENT 'IN_ITEM/OUT_ITEM/PRINT_PAPER/CHECK_ITEM等',
  `source_id` BIGINT NOT NULL COMMENT '来源头/纸张事件',
  `source_item_id` BIGINT NOT NULL COMMENT '来源明细，一规格事件取issue_id',
  `movement_kind` VARCHAR(24) NOT NULL COMMENT 'RECEIVE/ISSUE/RETURN/CHECK_ADJUST/CORRECTION/OPENING',
  `delta_qty` BIGINT NOT NULL COMMENT '基础量增减，入正出负',
  `before_qty` BIGINT NOT NULL COMMENT '变化前可用量',
  `after_qty` BIGINT NOT NULL COMMENT '变化后量，必须非负',
  `base_unit` VARCHAR(20) NOT NULL COMMENT '历史单位快照',
  `goods_version` BIGINT NOT NULL COMMENT '该物品变化后版本，逐物品递增',
  `actor_user_id` BIGINT NOT NULL COMMENT '操作者身份',
  `occurred_at` DATETIME(3) NOT NULL COMMENT '实物时间，可补录，不作并发边界',
  `posted_at` DATETIME(3) NOT NULL COMMENT '入账时间',
  `reversal_of_movement_id` BIGINT NULL COMMENT '经批准更正的原流水，真实归还是RETURN',
  `reason` VARCHAR(1000) NULL COMMENT '变动依据',
  PRIMARY KEY (`movement_id`),
  UNIQUE `uk_movement_source` (
    `source_type`,
    `source_id`,
    `source_item_id`,
    `movement_kind`
  ),
  UNIQUE `uk_goods_movement_version` (
    `goods_id`,
    `goods_version`
  ),
  INDEX `idx_movement_goods` (`goods_id`, `movement_id`),
  INDEX `idx_movement_request` (`request_id`, `movement_id`),
  INDEX `idx_movement_action` (`action_id`),
  INDEX `idx_movement_reversal` (`reversal_of_movement_id`),
  CONSTRAINT `ck_stock_movement_0` CHECK (delta_qty <> 0),
  CONSTRAINT `ck_stock_movement_1` CHECK (after_qty >= 0),
  CONSTRAINT `fk_ref_073` FOREIGN KEY (reversal_of_movement_id) REFERENCES `stock_movement` (
    `movement_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_074` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_075` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_076` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (
    `action_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_077` FOREIGN KEY (`actor_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='stock_movement';
```

**office_request**

```sql
CREATE TABLE `office_request` (
  `request_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '一次申请/审批聚合',
  `request_no` VARCHAR(32) NOT NULL COMMENT '事项编号',
  `biz_type` VARCHAR(24) NOT NULL COMMENT 'PRINT/MATERIAL/STOCK_CHECK等固定业务',
  `title` VARCHAR(200) NOT NULL COMMENT '标题',
  `created_by_user_id` BIGINT NOT NULL COMMENT '实际录入主体，来自认证上下文，代录时不冒充申请人',
  `applicant_user_id` BIGINT NOT NULL COMMENT '真实原申请人，默认JWT主体；仅有代录权限且范围内可指定，经服务器核实',
  `applicant_dept_id` BIGINT NOT NULL COMMENT '从真实申请人资料派生的提交部门快照，不信任客户端部门',
  `handler_user_id` BIGINT NULL COMMENT '当前经办人',
  `client_source` VARCHAR(16) NOT NULL COMMENT 'ADMIN_WEB/STAFF_APP/WECHAT_MINI/PUBLIC_WEB，仅来源',
  `status` VARCHAR(24) NOT NULL COMMENT '根状态，不代表库存事实',
  `current_node` VARCHAR(32) NULL COMMENT '当前固定节点',
  `rule_snapshot` JSON NOT NULL COMMENT '本次固定节点规则快照：规则版本、审批人/职责、免审条件、判定来源，禁止客户端任意定义',
  `revision` INT NOT NULL DEFAULT 1 COMMENT '内容修订轮次',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '跨子项动作根行版本',
  `request_key` VARCHAR(64) NOT NULL COMMENT '创建幂等键',
  `payload_hash` CHAR(64) NOT NULL COMMENT '规范创建载荷摘要',
  `due_at` DATETIME(3) NULL COMMENT '期限',
  `submitted_at` DATETIME(3) NULL COMMENT '最近提交',
  `closed_at` DATETIME(3) NULL COMMENT '完成/取消结案',
  `cancelled_at` DATETIME(3) NULL COMMENT '取消决定，不自动退库',
  `cancel_reason` VARCHAR(500) NULL COMMENT '取消原因',
  `created_at` DATETIME(3) NOT NULL COMMENT '创建时间UTC',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间UTC',
  PRIMARY KEY (`request_id`),
  UNIQUE `uk_request_no` (
    `request_no`
  ),
  UNIQUE `uk_request_create` (
    `created_by_user_id`,
    `biz_type`,
    `request_key`
  ),
  INDEX `idx_request_applicant` (`applicant_user_id`, `status`, `created_at`),
  INDEX `idx_request_handler` (`handler_user_id`, `status`, `due_at`),
  INDEX `idx_request_dept` (`applicant_dept_id`, `biz_type`, `status`, `created_at`),
  CONSTRAINT `fk_ref_002` FOREIGN KEY (`created_by_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_003` FOREIGN KEY (`applicant_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_004` FOREIGN KEY (`applicant_dept_id`) REFERENCES `sys_dept` (
    `dept_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_005` FOREIGN KEY (`handler_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='office_request';
```

**office_action_log**

```sql
CREATE TABLE `office_action_log` (
  `action_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '已提交动作',
  `request_id` BIGINT NOT NULL COMMENT '聚合',
  `task_id` BIGINT NULL COMMENT '待办',
  `target_type` VARCHAR(32) NOT NULL COMMENT 'PRINT/ISSUE/SETTLEMENT/DELIVERY等',
  `target_id` BIGINT NULL COMMENT '本次子记录，创建时同事务回填',
  `action_code` VARCHAR(64) NOT NULL COMMENT '幂等operation固定动作，如PRINT_ISSUE，不拼目标ID',
  `actor_user_id` BIGINT NOT NULL COMMENT '认证上下文操作者',
  `actor_dept_id` BIGINT NULL COMMENT '部门快照',
  `client_source` VARCHAR(16) NOT NULL COMMENT '四端来源，仅审计',
  `from_status` VARCHAR(24) NULL COMMENT '前状态',
  `to_status` VARCHAR(24) NULL COMMENT '后状态',
  `request_revision` INT NOT NULL COMMENT '所依据申请版本',
  `idempotency_key` VARCHAR(64) NOT NULL COMMENT '幂等键',
  `payload_hash` CHAR(64) NOT NULL COMMENT '含目标ID及规范正文',
  `result_code` INT NOT NULL COMMENT '已提交响应状态',
  `result_json` JSON NOT NULL COMMENT '可重放最小响应，不含临时文件地址/凭证',
  `before_json` JSON NULL COMMENT '脱敏前值快照',
  `after_json` JSON NULL COMMENT '脱敏后值快照，含核销更正历史',
  `created_at` DATETIME(3) NOT NULL COMMENT '提交时间，不允许普通编辑删除',
  PRIMARY KEY (`action_id`),
  UNIQUE `uk_action_idempotency` (
    `actor_user_id`,
    `action_code`,
    `idempotency_key`
  ),
  INDEX `idx_action_request` (`request_id`, `action_id`),
  INDEX `idx_action_task` (`task_id`),
  CONSTRAINT `fk_ref_011` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_012` FOREIGN KEY (`actor_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_013` FOREIGN KEY (`actor_dept_id`) REFERENCES `sys_dept` (
    `dept_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_102` FOREIGN KEY (`task_id`) REFERENCES `office_task` (
    `task_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='office_action_log';
```

## 5. 代码实现骨架



**backend/src/main/java/com/doupi/planref/directory/DirectoryController.java**

```java
package com.doupi.planref.directory;
import com.doupi.planref.*;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/office/directory")
public class DirectoryController {
    private final DirectoryService service;
    public DirectoryController(DirectoryService service) {this.service=service;}
    @GetMapping("/{kind}") public ResponseEntity<?> list(@PathVariable String kind) {return ApiReply.of(service.read(kind),200);}
    @GetMapping("/kits/{id}") public ResponseEntity<?> kit(@PathVariable long id) {return ApiReply.of(service.kit(id),200);}
    @PostMapping("/classes") public ResponseEntity<?> addClass(@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b) {return ApiReply.of(service.saveClass(0,key,b),201);}
    @PutMapping("/classes/{id}") public ResponseEntity<?> editClass(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b) {return ApiReply.of(service.saveClass(id,key,b),200);}
    @PostMapping("/suppliers") public ResponseEntity<?> addSupplier(@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b) {return ApiReply.of(service.saveSupplier(0,key,b),201);}
    @PutMapping("/suppliers/{id}") public ResponseEntity<?> editSupplier(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b) {return ApiReply.of(service.saveSupplier(id,key,b),200);}
    @PostMapping("/kits") public ResponseEntity<?> addKit(@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b) {return ApiReply.of(service.saveKit(0,key,b),201);}
    @PutMapping("/kits/{id}") public ResponseEntity<?> editKit(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b) {return ApiReply.of(service.saveKit(id,key,b),200);}
}
```

**backend/src/main/java/com/doupi/planref/directory/DirectoryService.java**

```java
package com.doupi.planref.directory;

import com.doupi.planref.*;
import com.doupi.planref.auth.ExternalCommands;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class DirectoryService {
    private final DirectoryRepository repo;private final ExternalCommands commands;
    public DirectoryService(DirectoryRepository repo,ExternalCommands commands) {this.repo=repo;this.commands=commands;}
    private void scope(long dept) {Actor a=Actors.current();if(!a.allData()&&!a.scopeDeptIds().contains(dept)) throw Problem.notFound("资料不在可见范围");}
    public Map<String,Object> read(String kind) {
        Actor a=Actors.current();a.require("directory:read");List<Map<String,Object>> items;
        switch(kind) {
            case "staff": items=repo.staff().stream().filter(x->a.allData()||Inputs.number(x.getOrDefault("user_id",0))==a.userId()||a.scopeDeptIds().contains(Inputs.number(x.getOrDefault("dept_id",0)))).toList();break;
            case "classes": items=repo.classes().stream().filter(x->a.allData()||a.scopeDeptIds().contains(Inputs.number(x.getOrDefault("dept_id",0)))).toList();break;
            case "goods": items=repo.goods();break;
            case "suppliers": a.require("directory:maintain");items=repo.suppliers();break;
            default: throw Problem.notFound("不支持的资料类别");
        }
        return P.of("items",items);
    }
    public Map<String,Object> kit(long id) {Actors.current().require("directory:read");return repo.kit(id);}
    public Map<String,Object> saveClass(long id,String key,Map<String,Object> body) {
        Actor a=Actors.current();a.require("directory:maintain");Map<String,Object> payload=new LinkedHashMap<>(body);payload.put("classId",id);
        return commands.run("STAFF:"+a.userId(),"CLASS_SAVE",key,payload,id==0?201:200,()->{
            long dept=Inputs.id(body,"deptId");scope(dept);repo.db().required("SELECT dept_id FROM sys_dept WHERE dept_id=#{p.id} AND status='0' AND del_flag='0'",P.of("id",dept));
            Map<String,Object> old=id==0?Map.of():repo.lockClass(id);
            if(id>0) {if(old.get("dept_id")==null) throw Problem.conflict("历史班级必须先核实管理部门");scope(Inputs.number(old.get("dept_id")));if(Inputs.nonNegative(body,"expectedVersion")!=Inputs.number(old.get("version"))) throw Problem.conflict("班级已更新");}
            long count=Inputs.nonNegative(body,"studentNum");if(count>1000) throw Problem.bad("班级人数超出允许范围");
            Long teacher=Inputs.optionalId(body,"headTeacherId");String name=null;
            if(teacher!=null) {Map<String,Object> user=repo.db().required("SELECT nick_name,dept_id FROM sys_user WHERE user_id=#{p.id} AND status='0' AND del_flag='0'",P.of("id",teacher));scope(Inputs.number(user.getOrDefault("dept_id",0)));name=user.get("nick_name").toString();}
            String status=Inputs.text(body,"status",6,8);if(!Set.of("ACTIVE","ARCHIVED").contains(status)) throw Problem.bad("班级状态无效");
            Map<String,Object> p=P.of("grade",Inputs.text(body,"grade",1,20),"name",Inputs.text(body,"className",1,50),"count",count,"teacher",teacher,"teacherName",name,"dept",dept,"status",status,"id",id);
            long saved=id;
            if(id==0) saved=repo.db().insert("INSERT INTO edu_class(grade,class_name,student_num,head_teacher_id,head_teacher,dept_id,status,version) VALUES(#{p.grade},#{p.name},#{p.count},#{p.teacher},#{p.teacherName},#{p.dept},#{p.status},0)",p);
            else repo.db().write("UPDATE edu_class SET grade=#{p.grade},class_name=#{p.name},student_num=#{p.count},head_teacher_id=#{p.teacher},head_teacher=#{p.teacherName},dept_id=#{p.dept},status=#{p.status},version=version+1 WHERE class_id=#{p.id}",p);
            Map<String,Object> result=repo.lockClass(saved);repo.audit("CLASS",saved,old,result);return result;
        });
    }
    public Map<String,Object> saveSupplier(long id,String key,Map<String,Object> body) {
        Actor a=Actors.current();a.require("directory:maintain");Map<String,Object> payload=new LinkedHashMap<>(body);payload.put("supplierId",id);
        return commands.run("STAFF:"+a.userId(),"SUPPLIER_SAVE",key,payload,id==0?201:200,()->{
            Map<String,Object> old=id==0?Map.of():repo.db().required("SELECT * FROM edu_supplier WHERE supplier_id=#{p.id} FOR UPDATE",P.of("id",id));
            if(id>0&&Inputs.nonNegative(body,"expectedVersion")!=Inputs.number(old.get("version"))) throw Problem.conflict("供应商已更新");
            String phone=Inputs.optionalText(body,"phone",20);if(phone!=null&&!phone.matches("[+0-9() -]{3,20}")) throw Problem.bad("联系电话格式无效");
            Map<String,Object> p=P.of("name",Inputs.text(body,"supplierName",1,100),"contact",Inputs.optionalText(body,"contact",50),"phone",phone,"id",id,"flag",Inputs.bool(body,"enabled",true)?"0":"2");
            long saved=id;
            if(id==0) saved=repo.db().insert("INSERT INTO edu_supplier(supplier_name,contact,phone,del_flag,version) VALUES(#{p.name},#{p.contact},#{p.phone},#{p.flag},0)",p);
            else repo.db().write("UPDATE edu_supplier SET supplier_name=#{p.name},contact=#{p.contact},phone=#{p.phone},del_flag=#{p.flag},version=version+1 WHERE supplier_id=#{p.id}",p);
            Map<String,Object> result=repo.db().required("SELECT * FROM edu_supplier WHERE supplier_id=#{p.id}",P.of("id",saved));repo.audit("SUPPLIER",saved,old,result);return result;
        });
    }
    public Map<String,Object> saveKit(long id,String key,Map<String,Object> body) {
        Actor a=Actors.current();a.require("directory:maintain");Map<String,Object> payload=new LinkedHashMap<>(body);payload.put("kitId",id);
        return commands.run("STAFF:"+a.userId(),"KIT_SAVE",key,payload,id==0?201:200,()->{
            Map<String,Object> old=id==0?Map.of():repo.db().required("SELECT * FROM edu_goods_kit WHERE kit_id=#{p.id} FOR UPDATE",P.of("id",id));
            if(id>0&&Inputs.nonNegative(body,"expectedVersion")!=Inputs.number(old.get("version"))) throw Problem.conflict("套装已更新");
            String type=Inputs.text(body,"targetType",1,1);if(!Set.of("1","2","3").contains(type)) throw Problem.bad("套装对象为教师1、学生2或班级3");
            List<Map<String,Object>> items=Inputs.list(body,"items");if(items.isEmpty()) throw Problem.bad("套装不能为空");Set<Long> seen=new HashSet<>();
            for(Map<String,Object> item:items) {long gid=Inputs.id(item,"goodsId");if(!seen.add(gid)) throw Problem.bad("套装物品重复");Inputs.positive(item,"quantity");repo.db().required("SELECT goods_id FROM edu_goods WHERE goods_id=#{p.id} AND del_flag='0'",P.of("id",gid));}
            Map<String,Object> p=P.of("id",id,"name",Inputs.text(body,"kitName",1,100),"code",Inputs.optionalText(body,"kitCode",50),"type",type,"grade",Inputs.optionalText(body,"grade",30),"subject",Inputs.optionalText(body,"subject",50),"status",Inputs.bool(body,"enabled",true)?"0":"1");long saved=id;
            if(id==0) saved=repo.db().insert("INSERT INTO edu_goods_kit(kit_name,kit_code,target_type,grade,subject,status,del_flag,version) VALUES(#{p.name},#{p.code},#{p.type},#{p.grade},#{p.subject},#{p.status},'0',0)",p);
            else {repo.db().write("UPDATE edu_goods_kit SET kit_name=#{p.name},kit_code=#{p.code},target_type=#{p.type},grade=#{p.grade},subject=#{p.subject},status=#{p.status},version=version+1 WHERE kit_id=#{p.id}",p);repo.db().write("DELETE FROM edu_goods_kit_item WHERE kit_id=#{p.id}",P.of("id",id));}
            for(Map<String,Object> item:items) repo.db().write("INSERT INTO edu_goods_kit_item(kit_id,goods_id,quantity) VALUES(#{p.kit},#{p.goods},#{p.qty})",P.of("kit",saved,"goods",Inputs.id(item,"goodsId"),"qty",Inputs.positive(item,"quantity")));
            Map<String,Object> result=repo.kit(saved);repo.audit("KIT",saved,old,result);return result;
        });
    }
}
```

**backend/src/main/java/com/doupi/planref/directory/DirectoryRepository.java**

```java
package com.doupi.planref.directory;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class DirectoryRepository {
    private final Db db;
    public DirectoryRepository(Db db) {this.db=db;}
    public Db db() {return db;}
    public List<Map<String,Object>> classes() {return db.list("SELECT class_id,grade,class_name,student_num,head_teacher_id,dept_id,status,version FROM edu_class ORDER BY class_id",Map.of());}
    public List<Map<String,Object>> staff() {return db.list("SELECT user_id,dept_id,nick_name,grade,subject FROM sys_user WHERE status='0' AND del_flag='0' ORDER BY user_id",Map.of());}
    public List<Map<String,Object>> goods() {return db.list("SELECT goods_id,goods_name,category,spec,unit,base_unit,conversion_rate,stock_qty_base,warn_low_base_qty,return_required,version FROM edu_goods WHERE del_flag='0' ORDER BY goods_id",Map.of());}
    public List<Map<String,Object>> suppliers() {return db.list("SELECT supplier_id,supplier_name,contact,phone,version FROM edu_supplier WHERE del_flag='0' ORDER BY supplier_id",Map.of());}
    public Map<String,Object> kit(long id) {Map<String,Object> head=db.required("SELECT kit_id,kit_name,target_type,status,version FROM edu_goods_kit WHERE kit_id=#{p.id} AND del_flag='0'",P.of("id",id));head.put("items",db.list("SELECT goods_id,quantity FROM edu_goods_kit_item WHERE kit_id=#{p.id} ORDER BY goods_id",P.of("id",id)));return head;}
    public Map<String,Object> lockClass(long id) {return db.required("SELECT * FROM edu_class WHERE class_id=#{p.id} FOR UPDATE",P.of("id",id));}
    public void audit(String type,long id,Map<String,Object> before,Map<String,Object> after) {
        db.write("INSERT INTO directory_change_log(entity_type,entity_id,actor_user_id,before_json,after_json,created_at) VALUES(#{p.type},#{p.id},#{p.actor},#{p.before},#{p.after},CURRENT_TIMESTAMP(3))",P.of("type",type,"id",id,"actor",Actors.current().userId(),"before",Json.write(before),"after",Json.write(after)));
    }
}
```





**backend/src/main/java/com/doupi/planref/inventory/InventoryController.java**

```java
package com.doupi.planref.inventory;

import com.doupi.planref.ApiReply;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/office/inventory")
public final class InventoryController {
    private final InventoryService service;
    public InventoryController(InventoryService service){this.service=service;}
    @GetMapping("/goods") public ResponseEntity<Map<String,Object>> goods(@RequestParam(defaultValue="0")long afterId,@RequestParam(defaultValue="false")boolean warnings){return ApiReply.of(service.goods(afterId,warnings),200);}
    @PostMapping("/goods") public ResponseEntity<Map<String,Object>> createGoods(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.saveGoods(null,key,b),201);}
    @PutMapping("/goods/{id}") public ResponseEntity<Map<String,Object>> updateGoods(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.saveGoods(id,key,b),200);}
    @GetMapping("/suppliers") public ResponseEntity<Map<String,Object>> suppliers(){return ApiReply.of(service.suppliers(),200);}
    @PostMapping("/suppliers") public ResponseEntity<Map<String,Object>> createSupplier(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.saveSupplier(null,key,b),201);}
    @PutMapping("/suppliers/{id}") public ResponseEntity<Map<String,Object>> updateSupplier(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.saveSupplier(id,key,b),200);}
    @GetMapping("/goods/{id}/movements") public ResponseEntity<Map<String,Object>> movements(@PathVariable long id,@RequestParam(defaultValue="0")long afterId){return ApiReply.of(service.movements(id,afterId),200);}
    @PostMapping("/arrivals") public ResponseEntity<Map<String,Object>> arrival(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.arrival(key,b),201);}
    @PostMapping("/dispatches") public ResponseEntity<Map<String,Object>> dispatch(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.dispatch(key,b),201);}
    @PostMapping("/checks") public ResponseEntity<Map<String,Object>> createCheck(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.createCheck(key,b),201);}
    @GetMapping("/checks/{id}") public ResponseEntity<Map<String,Object>> check(@PathVariable long id){return ApiReply.of(service.checkDetail(id),200);}
    @PostMapping("/checks/{id}/counts") public ResponseEntity<Map<String,Object>> count(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.count(id,key,b),200);}
    @PostMapping("/checks/{id}/review") public ResponseEntity<Map<String,Object>> review(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.review(id,key,b),200);}
}
```

**backend/src/main/java/com/doupi/planref/inventory/InventoryService.java**

```java
package com.doupi.planref.inventory;

import com.doupi.planref.*;
import com.doupi.planref.office.OfficeService;
import com.doupi.planref.directory.DirectoryService;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public final class InventoryService {
    private final InventoryRepository repo;
    private final Commands commands;
    private final Roots roots;
    private final OfficeService office;
    private final StockLedger ledger;
    private final DirectoryService directory;
    public InventoryService(InventoryRepository repo,Commands commands,Roots roots,OfficeService office,StockLedger ledger,DirectoryService directory){this.repo=repo;this.commands=commands;this.roots=roots;this.office=office;this.ledger=ledger;this.directory=directory;}
    public Map<String,Object> goods(long after,boolean warnings){Actor a=Actors.current();a.requireStaff();a.require("inventory:goods:read");if(after<0)throw Problem.bad("afterId不能为负");return P.of("items",repo.goodsList(after,warnings));}
    public Map<String,Object> suppliers(){Actor a=Actors.current();a.requireStaff();a.require("inventory:supplier:read");return P.of("items",repo.db().list("select supplier_id,supplier_name,contact,phone,version from edu_supplier where del_flag='0' order by supplier_id",P.of()));}
    public Map<String,Object> movements(long goods,long after){Actors.current().require("inventory:movement:read");Actors.current().requireStaff();repo.goods(goods);if(after<0)throw Problem.bad("afterId不能为负");return P.of("items",repo.db().list("select * from stock_movement where goods_id=#{p.goods} and movement_id>#{p.after} order by movement_id limit 200",P.of("goods",goods,"after",after)));}
    public Map<String,Object> saveSupplier(Long id,String key,Map<String,Object>b){return directory.saveSupplier(id==null?0:id,key,b);}
    public Map<String,Object> saveGoods(Long id,String key,Map<String,Object>b){Actors.current().require("inventory:goods:write");Map<String,Object> payload=target(b,"goodsId",id==null?0:id);return commands.create(id==null?"INVENTORY_GOODS_CREATE":"INVENTORY_GOODS_UPDATE",key,payload,id==null?201:200,()->roots.create("INVENTORY",key,b),c->{office.requireRole(c,"warehouseRoleId");String name=Inputs.text(b,"goodsName",1,100),category=Inputs.text(b,"category",1,1),unit=Inputs.text(b,"unit",1,10),baseUnit=Inputs.text(b,"baseUnit",1,20);if(!Set.of("1","2","3").contains(category))throw Problem.bad("物品类别只允许1/2/3");long rate=Inputs.positive(b,"conversionRate"),warning=Inputs.nonNegative(b,"warnLowBaseQty");if(rate>Integer.MAX_VALUE)throw Problem.bad("换算率超出范围");Long supplier=b.get("supplierId")==null?null:Inputs.id(b,"supplierId");if(supplier!=null)repo.supplier(supplier);Map<String,Object> values=P.of("name",name,"category",category,"supplier",supplier,"grade",Inputs.optionalText(b,"grade",20),"spec",Inputs.optionalText(b,"spec",50),"unit",unit,"baseUnit",baseUnit,"rate",rate,"warning",warning,"location",Inputs.optionalText(b,"location",100),"returnRequired",Inputs.bool(b,"returnRequired",false)?1:0);long goods;Map<String,Object> before=P.of();
        if(id==null)goods=repo.db().insert("insert into edu_goods(goods_name,category,supplier_id,grade,spec,unit,base_unit,conversion_rate,stock_qty_base,stock_num,remain_sheets,warn_low,warn_low_base_qty,location,return_required,version,del_flag) values(#{p.name},#{p.category},#{p.supplier},#{p.grade},#{p.spec},#{p.unit},#{p.baseUnit},#{p.rate},0,0,0,0,#{p.warning},#{p.location},#{p.returnRequired},0,'0')",values);
        else{goods=id;before=repo.goods(id);if(Inputs.nonNegative(b,"expectedGoodsVersion")!=n(before,"version"))throw Problem.conflict("物品版本已变化");if(repo.lastMovement(id)>0&&(!unit.equals(before.get("unit"))||!baseUnit.equals(before.get("base_unit"))||rate!=n(before,"conversion_rate")))throw Problem.conflict("有历史收发后不能修改单位或换算率");values.put("id",id);repo.db().write("update edu_goods set goods_name=#{p.name},category=#{p.category},supplier_id=#{p.supplier},grade=#{p.grade},spec=#{p.spec},unit=#{p.unit},base_unit=#{p.baseUnit},conversion_rate=#{p.rate},warn_low_base_qty=#{p.warning},location=#{p.location},return_required=#{p.returnRequired},stock_num=stock_qty_base/#{p.rate},remain_sheets=mod(stock_qty_base,#{p.rate}),version=version+1 where goods_id=#{p.id}",values);}
        repo.complete(c.requestId());c.target("GOODS",goods);c.audit(P.of("before",before,"after",values));c.event("INVENTORY_MASTER_CHANGED",P.of("goodsId",goods));return P.of("goodsId",Long.toString(goods),"goodsVersion",id==null?0:n(before,"version")+1,"stockQtyBase",before.isEmpty()?0:n(before,"stock_qty_base"));});}
    public Map<String,Object> arrival(String key,Map<String,Object>b){Actors.current().require("inventory:arrival:accept");return commands.create("INVENTORY_ARRIVAL_ACCEPT",key,b,201,()->roots.create("INVENTORY",key,b),c->{office.requireRole(c,"warehouseRoleId");long supplier=Inputs.id(b,"supplierId");repo.supplier(supplier);String reason=Inputs.text(b,"reason",1,500);List<Map<String,Object>> items=orderedItems(b);long in=repo.db().insert("insert into edu_stock_in(in_no,in_type,request_id,supplier_id,operator_id,operator,in_time,status,acceptance_status,source_type,action_id,version,remark,del_flag) values(#{p.no},'1',#{p.request},#{p.supplier},#{p.actor},#{p.name},current_timestamp,'1','ACCEPTED','ARRIVAL',#{p.action},0,#{p.reason},'0')",P.of("no","IN"+c.actionId(),"request",c.requestId(),"supplier",supplier,"actor",c.actor().userId(),"name",repo.actorName(c.actor().userId()),"action",c.actionId(),"reason",reason));List<Map<String,Object>> out=new ArrayList<>();boolean rejected=false;
        for(Map<String,Object> item:items){long goods=Inputs.id(item,"goodsId"),arrived=Inputs.positive(item,"arrivedQty"),accepted=Inputs.nonNegative(item,"acceptedQty"),reject=Inputs.nonNegative(item,"rejectedQty");if(Math.addExact(accepted,reject)!=arrived)throw Problem.bad("实到量须等于验收可用量加拒收量");Map<String,Object> g=repo.goods(goods);long iid=repo.db().insert("insert into edu_stock_in_item(in_id,goods_id,quantity,base_qty,arrived_qty,rejected_qty,unit,conversion_rate,price,amount) values(#{p.in},#{p.goods},#{p.arrived},#{p.accepted},#{p.arrived},#{p.rejected},#{p.unit},1,0,0)",P.of("in",in,"goods",goods,"arrived",arrived,"accepted",accepted,"rejected",reject,"unit",g.get("base_unit")));Long movement=accepted==0?null:ledger.move(c,goods,accepted,"ARRIVAL",in,iid,"RECEIVE",reason);out.add(P.of("itemId",Long.toString(iid),"goodsId",Long.toString(goods),"movementId",movement==null?null:Long.toString(movement),"acceptedQty",accepted,"rejectedQty",reject));rejected|=reject>0;}
        if(rejected)repo.db().write("update edu_stock_in set acceptance_status='PARTIAL' where in_id=#{p.id}",P.of("id",in));repo.complete(c.requestId());c.target("STOCK_IN",in);c.audit(P.of("items",out,"reason",reason));c.event("INVENTORY_RECEIVED",P.of("inId",in));return P.of("inId",Long.toString(in),"acceptanceStatus",rejected?"PARTIAL":"ACCEPTED","items",out);});}
    public Map<String,Object> dispatch(String key,Map<String,Object>b){Actors.current().require("inventory:dispatch:confirm");return commands.create("INVENTORY_DISPATCH_CONFIRM",key,b,201,()->roots.create("INVENTORY",key,b),c->{office.requireRole(c,"warehouseRoleId");String reason=Inputs.text(b,"reason",1,500),destination=Inputs.text(b,"destination",1,50);List<Map<String,Object>> items=orderedItems(b);long out=repo.db().insert("insert into edu_stock_out(out_no,out_type,request_id,receiver,operator_id,operator,out_time,status,receipt_status,action_id,version,del_flag) values(#{p.no},'2',#{p.request},#{p.destination},#{p.actor},#{p.name},current_timestamp,'1','CONFIRMED',#{p.action},0,'0')",P.of("no","OUT"+c.actionId(),"request",c.requestId(),"destination",destination,"actor",c.actor().userId(),"name",repo.actorName(c.actor().userId()),"action",c.actionId()));List<Map<String,Object>> result=new ArrayList<>();for(Map<String,Object> item:items){long goods=Inputs.id(item,"goodsId"),qty=Inputs.positive(item,"qty");Map<String,Object>g=repo.goods(goods);long iid=repo.db().insert("insert into edu_stock_out_item(out_id,goods_id,quantity,base_qty,unit,conversion_rate) values(#{p.out},#{p.goods},#{p.qty},#{p.qty},#{p.unit},1)",P.of("out",out,"goods",goods,"qty",qty,"unit",g.get("base_unit")));long movement=ledger.move(c,goods,-qty,"INVENTORY_OUT",out,iid,"TRANSFER_OUT",reason);result.add(P.of("itemId",Long.toString(iid),"movementId",Long.toString(movement)));}repo.complete(c.requestId());c.target("STOCK_OUT",out);c.audit(P.of("destination",destination,"reason",reason,"items",result));c.event("INVENTORY_DISPATCHED",P.of("outId",out));return P.of("outId",Long.toString(out),"items",result);});}
    public Map<String,Object> createCheck(String key,Map<String,Object>b){Actors.current().require("inventory:check:create");return commands.create("STOCK_CHECK_CREATE",key,b,201,()->roots.create("STOCK_CHECK",key,b),c->{office.requireRole(c,"warehouseRoleId");List<Long> ids=new ArrayList<>(Inputs.ids(b,"goodsIds"));if(ids.isEmpty()||new HashSet<>(ids).size()!=ids.size())throw Problem.bad("盘点物品不得为空或重复");Collections.sort(ids);long check=repo.db().insert("insert into edu_stock_check(check_no,request_id,check_type,check_time,baseline_at,counted_by,review_status,review_round,version,status,operator) values(#{p.no},#{p.request},'2',current_timestamp,current_timestamp,#{p.actor},'COUNTING',1,0,'1',#{p.name})",P.of("no","CHK"+c.actionId(),"request",c.requestId(),"actor",c.actor().userId(),"name",repo.actorName(c.actor().userId())));for(long id:ids){Map<String,Object>g=repo.goods(id);repo.db().insert("insert into edu_stock_check_item(check_id,goods_id,book_num,real_num,diff_num,baseline_goods_version,baseline_movement_id,period_in_qty,period_out_qty,counted_at) values(#{p.check},#{p.goods},#{p.book},#{p.book},0,#{p.version},#{p.movement},0,0,null)",P.of("check",check,"goods",id,"book",g.get("stock_qty_base"),"version",g.get("version"),"movement",repo.lastMovement(id)));}repo.db().write("update office_request set status='PROCESSING',current_node='STOCK_COUNT' where request_id=#{p.id}",P.of("id",c.requestId()));c.task("STOCK_COUNT","STOCK_CHECK",check,c.actor().userId(),null,null);c.target("STOCK_CHECK",check);c.event("STOCK_CHECK_OPENED",P.of("checkId",check));return P.of("checkId",Long.toString(check),"checkVersion",0,"items",repo.checkItems(check));});}
    public Map<String,Object> checkDetail(long check){Actors.current().require("inventory:check:read");Map<String,Object> row=repo.locateCheck(check);Map<String,Object>root=repo.db().required("select * from office_request where request_id=#{p.id}",P.of("id",row.get("request_id")));Access.requireRequest(Actors.current(),root,repo.db());return P.of("request",root,"check",row,"items",repo.checkItems(check));}
    public Map<String,Object> count(long check,String key,Map<String,Object>b){Actors.current().require("inventory:check:count");long request=n(repo.locateCheck(check),"request_id");return commands.run(request,"STOCK_CHECK_COUNT",key,target(b,"checkId",check),200,c->{Map<String,Object>h=repo.check(check);checkVersion(b,h);if(!Set.of("COUNTING","RETURNED").contains(h.get("review_status")))throw Problem.conflict("不在可提交盘点状态");if(n(h,"counted_by")!=c.actor().userId())throw Problem.forbidden("必须由实际盘点人提交");office.requireTask(c,"STOCK_COUNT","STOCK_CHECK",check);List<Map<String,Object>> rows=repo.checkItems(check);Map<Long,Map<String,Object>> inputs=index(b,"itemId");if(inputs.size()!=rows.size())throw Problem.bad("须提交全部盘点行");List<Map<String,Object>> evidence=new ArrayList<>();for(Map<String,Object> row:rows){Map<String,Object>i=inputs.get(n(row,"item_id"));if(i==null)throw Problem.bad("盘点行不属于该单");Map<String,Object>g=repo.goods(n(row,"goods_id")),period=period(row,g);acknowledge(i,period);long actual=Inputs.nonNegative(i,"actualQtyAtCount"),real=BusinessMath.normalizedCount(actual,n(period,"in_qty"),n(period,"out_qty")),diff=Math.subtractExact(real,n(row,"book_num"));String reason=Inputs.optionalText(i,"diffReason",1000);if(diff!=0&&(reason==null||reason.isBlank()))throw Problem.bad("差异必须说明原因");repo.db().write("update edu_stock_check_item set real_num=#{p.real},diff_num=#{p.diff},reconciled_movement_id=#{p.movement},period_in_qty=#{p.in},period_out_qty=#{p.out},counted_at=current_timestamp,diff_reason=#{p.reason} where item_id=#{p.id}",P.of("id",row.get("item_id"),"real",real,"diff",diff,"movement",period.get("last_id"),"in",period.get("in_qty"),"out",period.get("out_qty"),"reason",reason));evidence.add(P.of("itemId",row.get("item_id"),"actualQtyAtCount",actual,"period",period,"normalizedRealQty",real,"diffQty",diff));}repo.db().write("update edu_stock_check set review_status='PENDING_REVIEW',version=version+1 where check_id=#{p.id}",P.of("id",check));repo.db().write("update office_request set status='SUBMITTED',current_node='STOCK_CHECK_REVIEW' where request_id=#{p.id}",P.of("id",request));c.closeTasks("STOCK_COUNT","STOCK_CHECK",check);long task=c.task("STOCK_CHECK_REVIEW","STOCK_CHECK",check,null,office.role(c.request(),"checkReviewerRoleId"),c.actor().userId());c.target("STOCK_CHECK",check);c.audit(P.of("counts",evidence));c.event("STOCK_CHECK_SUBMITTED",P.of("taskIds",List.of(task)));return P.of("checkId",Long.toString(check),"checkVersion",n(h,"version")+1,"reviewStatus","PENDING_REVIEW");});}
    public Map<String,Object> review(long check,String key,Map<String,Object>b){Actors.current().require("inventory:check:review");long request=n(repo.locateCheck(check),"request_id");return commands.run(request,"STOCK_CHECK_REVIEW",key,target(b,"checkId",check),200,c->{Map<String,Object>h=repo.check(check);checkVersion(b,h);if(!"PENDING_REVIEW".equals(h.get("review_status")))throw Problem.conflict("盘点不是待复核");if(n(h,"counted_by")==c.actor().userId()||n(c.request(),"created_by_user_id")==c.actor().userId())throw Problem.forbidden("盘点与复核必须由不同人员完成");office.requireTask(c,"STOCK_CHECK_REVIEW","STOCK_CHECK",check);String decision=Inputs.text(b,"decision",1,16),comment=Inputs.text(b,"comment",1,1000);if(!Set.of("APPROVE","RETURN").contains(decision))throw Problem.bad("复核决定只允许APPROVE/RETURN");List<Map<String,Object>> result=new ArrayList<>();
        if("APPROVE".equals(decision)){List<Map<String,Object>>rows=repo.checkItems(check);Map<Long,Map<String,Object>>inputs=index(b,"itemId");if(inputs.size()!=rows.size())throw Problem.bad("须逐项确认期间收发");for(Map<String,Object>row:rows){Map<String,Object>i=inputs.get(n(row,"item_id"));if(i==null||row.get("counted_at")==null)throw Problem.bad("存在未完成的盘点行");Map<String,Object>g=repo.goods(n(row,"goods_id")),p=period(row,g);acknowledge(i,p);long diff=n(row,"diff_num");BusinessMath.stockAfter(n(g,"stock_qty_base"),diff);Long movement=diff==0?null:ledger.move(c,n(row,"goods_id"),diff,"STOCK_CHECK",check,n(row,"item_id"),"CHECK_ADJUST",comment);repo.db().write("update edu_stock_check_item set reconciled_movement_id=#{p.last},period_in_qty=#{p.in},period_out_qty=#{p.out},adjustment_movement_id=#{p.movement} where item_id=#{p.id}",P.of("id",row.get("item_id"),"last",p.get("last_id"),"in",p.get("in_qty"),"out",p.get("out_qty"),"movement",movement));result.add(P.of("itemId",row.get("item_id"),"adjustmentQty",diff,"movementId",movement==null?null:Long.toString(movement),"period",p));}repo.complete(request);}
        else{repo.db().write("update office_request set status='RETURNED',current_node='STOCK_COUNT' where request_id=#{p.id}",P.of("id",request));c.task("STOCK_COUNT","STOCK_CHECK",check,n(h,"counted_by"),null,null);}
        repo.db().write("update edu_stock_check set review_status=#{p.status},reviewer_user_id=#{p.actor},reviewed_at=current_timestamp,review_comment=#{p.comment},review_round=review_round+case when #{p.status}='RETURNED' then 1 else 0 end,version=version+1,status=case when #{p.status}='APPROVED' then '2' else '1' end where check_id=#{p.id}",P.of("id",check,"status","APPROVE".equals(decision)?"APPROVED":"RETURNED","actor",c.actor().userId(),"comment",comment));c.closeTasks("STOCK_CHECK_REVIEW","STOCK_CHECK",check);c.target("STOCK_CHECK",check);c.audit(P.of("decision",decision,"comment",comment,"adjustments",result));c.event("STOCK_CHECK_REVIEWED",P.of("checkId",check,"decision",decision));return P.of("checkId",Long.toString(check),"checkVersion",n(h,"version")+1,"reviewStatus","APPROVE".equals(decision)?"APPROVED":"RETURNED","adjustments",result);});}
    private Map<String,Object> period(Map<String,Object>row,Map<String,Object>g){Map<String,Object>p=repo.period(n(row,"goods_id"),n(row,"baseline_movement_id"));if(n(p,"last_id")==0)p.put("last_id",n(row,"baseline_movement_id"));if(Math.addExact(n(row,"book_num"),Math.subtractExact(n(p,"in_qty"),n(p,"out_qty")))!=n(g,"stock_qty_base"))throw Problem.conflict("余额与基准后流水不一致，须先对账");return p;}
    private static void acknowledge(Map<String,Object>b,Map<String,Object>p){if(Inputs.nonNegative(b,"expectedMovementId")!=n(p,"last_id")||Inputs.nonNegative(b,"periodInQty")!=n(p,"in_qty")||Inputs.nonNegative(b,"periodOutQty")!=n(p,"out_qty"))throw Problem.conflict("期间收发已变化，请重新核实实盘和流水边界");}
    private static Map<Long,Map<String,Object>> index(Map<String,Object>b,String key){Map<Long,Map<String,Object>>out=new HashMap<>();for(Map<String,Object>i:Inputs.list(b,"items"))if(out.put(Inputs.id(i,key),i)!=null)throw Problem.bad("重复盘点行");return out;}
    private static List<Map<String,Object>> orderedItems(Map<String,Object>b){List<Map<String,Object>>items=new ArrayList<>(Inputs.list(b,"items"));if(items.isEmpty())throw Problem.bad("收发明细不能为空");Set<Long>seen=new HashSet<>();for(Map<String,Object>i:items)if(!seen.add(Inputs.id(i,"goodsId")))throw Problem.bad("同物品须合并一行");items.sort(Comparator.comparingLong(i->Inputs.id(i,"goodsId")));return items;}
    private static void checkVersion(Map<String,Object>b,Map<String,Object>h){if(Inputs.nonNegative(b,"expectedCheckVersion")!=n(h,"version"))throw Problem.conflict("盘点单版本已变化");}
    private static Map<String,Object> target(Map<String,Object>b,String field,long id){Map<String,Object>out=new LinkedHashMap<>(b);out.put(field,id);return out;}
    private static long n(Map<String,Object>m,String key){return m.get(key)==null?0:Inputs.number(m.get(key));}
}
```

**backend/src/main/java/com/doupi/planref/inventory/InventoryRepository.java**

```java
package com.doupi.planref.inventory;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class InventoryRepository {
    private final Db db;
    public InventoryRepository(Db db){this.db=db;}
    public Db db(){return db;}
    public Map<String,Object> goods(long id){return db.required("select * from edu_goods where goods_id=#{p.id} and del_flag='0' for update",P.of("id",id));}
    public Map<String,Object> supplier(long id){return db.required("select * from edu_supplier where supplier_id=#{p.id} and del_flag='0' for update",P.of("id",id));}
    public Map<String,Object> check(long id){return db.required("select * from edu_stock_check where check_id=#{p.id} for update",P.of("id",id));}
    public Map<String,Object> locateCheck(long id){return db.required("select * from edu_stock_check where check_id=#{p.id}",P.of("id",id));}
    public List<Map<String,Object>> checkItems(long id){return db.list("select * from edu_stock_check_item where check_id=#{p.id} order by goods_id for update",P.of("id",id));}
    public List<Map<String,Object>> goodsList(long after,boolean warnings){return warnings?db.list("select goods_id,goods_name,category,supplier_id,unit,conversion_rate,base_unit,stock_qty_base,stock_num,remain_sheets,warn_low_base_qty,location,return_required,version from edu_goods where del_flag='0' and goods_id>#{p.after} and stock_qty_base<=warn_low_base_qty order by goods_id limit 200",P.of("after",after)):db.list("select * from edu_goods where del_flag='0' and goods_id>#{p.after} order by goods_id limit 200",P.of("after",after));}
    public Map<String,Object> period(long goods,long baseline){return db.required("select coalesce(max(movement_id),0) as last_id,coalesce(sum(case when delta_qty>0 then delta_qty else 0 end),0) as in_qty,coalesce(sum(case when delta_qty<0 then -delta_qty else 0 end),0) as out_qty from stock_movement where goods_id=#{p.goods} and movement_id>#{p.baseline}",P.of("goods",goods,"baseline",baseline));}
    public long lastMovement(long goods){return Inputs.number(db.required("select coalesce(max(movement_id),0) as n from stock_movement where goods_id=#{p.id}",P.of("id",goods)).get("n"));}
    public String actorName(long id){return String.valueOf(db.required("select nick_name from sys_user where user_id=#{p.id} and status='0' and del_flag='0'",P.of("id",id)).get("nick_name"));}
    public void complete(long request){db.write("update office_request set status='COMPLETED',current_node=null,closed_at=current_timestamp where request_id=#{p.id}",P.of("id",request));}
}
```

**backend/src/main/java/com/doupi/planref/StockLedger.java**

```java
package com.doupi.planref;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public final class StockLedger {
    private final Db db;
    public StockLedger(Db db){this.db=db;}
    public long move(Commands.Context ctx,long goodsId,long delta,String sourceType,long sourceId,long sourceItemId,String kind,String reason){
        if(delta==0)throw Problem.bad("库存变动不得为零");
        Map<String,Object> g=db.required("select * from edu_goods where goods_id=#{p.id} and del_flag='0' for update",P.of("id",goodsId));
        long before=Inputs.number(g.get("stock_qty_base")),version=Inputs.number(g.get("version"));
        long after;
        try{after=BusinessMath.stockAfter(before,delta);}catch(IllegalArgumentException|ArithmeticException ex){throw Problem.conflict("库存不足或数量溢出");}
        long rate=Inputs.number(g.get("conversion_rate"));
        String unit=String.valueOf(g.get("base_unit"));
        if(rate<=0||g.get("base_unit")==null||unit.isBlank())throw Problem.conflict("物品基础单位尚未核定");
        int changed=db.write("update edu_goods set stock_qty_base=#{p.after},stock_num=#{p.pack},remain_sheets=#{p.remain},version=version+1,update_time=current_timestamp where goods_id=#{p.id} and version=#{p.version}",P.of("after",after,"pack",after/rate,"remain",after%rate,"id",goodsId,"version",version));
        if(changed!=1)throw Problem.conflict("库存版本冲突");
        long movement=db.insert("insert into stock_movement(goods_id,request_id,action_id,source_type,source_id,source_item_id,movement_kind,delta_qty,before_qty,after_qty,base_unit,goods_version,actor_user_id,occurred_at,posted_at,reason) values(#{p.goods},#{p.request},#{p.action},#{p.sourceType},#{p.source},#{p.item},#{p.kind},#{p.delta},#{p.before},#{p.after},#{p.unit},#{p.version},#{p.actor},#{p.at},#{p.at},#{p.reason})",P.of("goods",goodsId,"request",ctx.requestId(),"action",ctx.actionId(),"sourceType",sourceType,"source",sourceId,"item",sourceItemId,"kind",kind,"delta",delta,"before",before,"after",after,"unit",unit,"version",Math.addExact(version,1),"actor",ctx.actor().userId(),"at",Timestamp.from(Instant.now()),"reason",reason));
        project(ctx,goodsId,delta,sourceType,sourceId,sourceItemId,unit,movement,reason);return movement;
    }
    private void project(Commands.Context c,long goods,long delta,String source,long sourceId,long item,String unit,long movement,String reason){
        if("ARRIVAL".equals(source)){if(delta<=0)throw Problem.bad("到货只允许可用量入库");int n=db.write("update edu_stock_in_item set movement_id=#{p.m} where item_id=#{p.item} and in_id=#{p.source} and movement_id is null",P.of("m",movement,"item",item,"source",sourceId));if(n!=1)throw Problem.conflict("验收明细流水重复");return;}
        if("INVENTORY_OUT".equals(source)){if(delta>=0)throw Problem.bad("调出必须为负向流水");int n=db.write("update edu_stock_out_item set movement_id=#{p.m} where item_id=#{p.item} and out_id=#{p.source} and movement_id is null",P.of("m",movement,"item",item,"source",sourceId));if(n!=1)throw Problem.conflict("调出明细流水重复");return;}
        String name=String.valueOf(db.required("select nick_name from sys_user where user_id=#{p.id}",P.of("id",c.actor().userId())).get("nick_name"));
        long qty=delta>0?delta:Math.negateExact(delta),head;
        if(delta>0){Map<String,Object> old=db.one("select in_id from edu_stock_in where action_id=#{p.action}",P.of("action",c.actionId()));head=old.isEmpty()?db.insert("insert into edu_stock_in(in_no,in_type,request_id,operator_id,operator,in_time,status,acceptance_status,source_type,source_id,action_id,version,remark,del_flag) values(#{p.no},'3',#{p.request},#{p.actor},#{p.name},current_timestamp,'1','ACCEPTED',#{p.source},#{p.sourceId},#{p.action},0,#{p.reason},'0')",P.of("no","IN"+c.actionId(),"request",c.requestId(),"actor",c.actor().userId(),"name",name,"source",source,"sourceId",sourceId,"action",c.actionId(),"reason",reason)):Inputs.number(old.get("in_id"));
            db.insert("insert into edu_stock_in_item(in_id,goods_id,quantity,base_qty,arrived_qty,rejected_qty,unit,conversion_rate,price,amount,movement_id) values(#{p.head},#{p.goods},#{p.qty},#{p.qty},#{p.qty},0,#{p.unit},1,0,0,#{p.m})",P.of("head",head,"goods",goods,"qty",qty,"unit",unit,"m",movement));
            if("PRINT_PAPER".equals(source))db.write("update edu_print_paper_issue set in_id=#{p.head} where issue_id=#{p.id}",P.of("head",head,"id",sourceId));
        }else{Map<String,Object> old=db.one("select out_id from edu_stock_out where action_id=#{p.action}",P.of("action",c.actionId()));head=old.isEmpty()?db.insert("insert into edu_stock_out(out_no,out_type,request_id,operator_id,operator,out_time,status,receipt_status,action_id,version,del_flag) values(#{p.no},'3',#{p.request},#{p.actor},#{p.name},current_timestamp,'1','PENDING',#{p.action},0,'0')",P.of("no","OUT"+c.actionId(),"request",c.requestId(),"actor",c.actor().userId(),"name",name,"action",c.actionId())):Inputs.number(old.get("out_id"));
            db.insert("insert into edu_stock_out_item(out_id,goods_id,quantity,base_qty,unit,conversion_rate,movement_id) values(#{p.head},#{p.goods},#{p.qty},#{p.qty},#{p.unit},1,#{p.m})",P.of("head",head,"goods",goods,"qty",qty,"unit",unit,"m",movement));
            if("PRINT_PAPER".equals(source))db.write("update edu_print_paper_issue set out_id=#{p.head} where issue_id=#{p.id}",P.of("head",head,"id",sourceId));}
    }
}
```



## 6. 边界与异常场景处理

400处理非法单位/换算率/数量、重复goods行、实到守恒失败及溢出；403处理非仓库岗位；404隐藏无效供应商/物品；409处理负库存、物品版本变化、名称唯一冲突及历史换算不可改。全拒收保留验收事实，不产生0 movement；任一出库行不足整单回滚，不部分提交。不得手改stock_num/remain_sheets修库存，不以单据作废自动反转。并发路径均根→业务→goodsId升序，死锁回滚原键重试。流水和单位历史保留；停用基础资料不得物理删除历史。外部通知失败不回滚已验收实物。
