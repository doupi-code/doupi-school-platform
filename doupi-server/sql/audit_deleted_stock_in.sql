-- 删除入库单未回退库存：只读核查，不修改库存或单据。
-- 在发生问题的业务库执行；按物资名称核对原单据，不能直接把当前库存清零。
-- 2026-11-03 已在生产库 stuck-mg 以只读事务查实：
-- goods_id=313 初始库存 0；入库单 in_id=6 / RK20261103001 的唯一明细为入库 7 本。
-- 15:01:50 删除成功后，单据仍为 status=1、del_flag=2，当前库存仍为 7。
-- 无关联出库或盘点记录，无后续成功调整记录；应按此单回退 7 本至 0，
-- 并将单据 status 置为 2，保留 del_flag=2。本文件仅供核查，不执行修复。
-- 已于 2026-11-03 15:59:21（北京时间）按用户指示完成上述定向修复：
-- 同一事务将库存 7 -> 0、单据 status 1 -> 2；独立连接复查已持久化，明细保留。
-- 修复前快照及结果保存在服务器 /home/ubuntu/doupi-repair-backups/stock-in-repair-20261103/。
SET @goods_name = '语文课本选必1';

-- 1. 当前库存；在线后台 2026-11-03 核查时该物资 ID 为 313，库存显示 7 本。
SELECT goods_id, goods_name, stock_num, unit, del_flag
FROM edu_goods
WHERE goods_name = @goods_name;

-- 2. 包含逻辑删除的完整入库明细。del_flag=2 且 status=1 是旧删除逻辑的待核查对象。
SELECT i.in_id, i.in_no, i.in_time, i.status, i.del_flag,
       d.item_id, d.goods_id, g.goods_name, d.quantity, g.unit,
       i.create_time, i.update_time
FROM edu_stock_in i
JOIN edu_stock_in_item d ON d.in_id = i.in_id
JOIN edu_goods g ON g.goods_id = d.goods_id
WHERE g.goods_name = @goods_name
ORDER BY i.in_id DESC, d.item_id;

-- 3. 入库单审计记录。日志时间用于与原单据交叉核对，不据此推定入库数量。
SELECT oper_id, title, business_type, oper_url, oper_param, json_result, status, oper_time
FROM sys_oper_log
WHERE title = '入库单'
  AND oper_time >= '2026-11-03 00:00:00'
  AND oper_time < '2026-11-04 00:00:00'
ORDER BY oper_time DESC;

-- 后续回退须按确认的 in_id，在同一事务中锁定单据和相关物资、校验可扣减数量，
-- 按原始明细扣减库存，并将单据 status 置为 2（保留 del_flag=2），防止重复修复。
-- 不应批量扣减所有历史删除单据：须先核对是否已被盘点或人工调整覆盖。
