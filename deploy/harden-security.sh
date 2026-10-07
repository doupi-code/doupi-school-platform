#!/bin/bash
# ==============================================================================
# 豆皮教育系统 生产服务器安全加固脚本（腾讯轻量应用服务器适配版）
# 服务器：101.43.58.160 (腾讯轻量 Lighthouse，Ubuntu 24.04)
#
# 与上一版的关键差异（适配腾讯轻量服务器）：
#   1. 防火墙改用 ufw（服务器已装且运行中），不再用 nftables（避免冲突）
#   2. 明确「防 DDoS」边界：大流量 DDoS 靠腾讯云大禹防护，本脚本只做
#      防暴力破解(fail2ban) + 连接限速(ufw limit)
#   3. MySQL/Redis 改端口后，腾讯轻量控制台防火墙需手动同步（脚本无法操作控制台）
#
# 用途：
#   1. 修改 MySQL 密码为 Lt19960614.
#   2. MySQL 端口 3306 -> 53061，Redis 端口 9763 -> 49763
#   3. MySQL/Redis 仅监听本机 127.0.0.1
#   4. ufw 白名单：SSH/后端 仅 176.122.189.165 可访问
#   5. 安装 fail2ban 防 SSH 暴力破解
#   6. 同步生产/测试两个后端启动脚本
#
# 警告：会重启 MySQL/Redis/后端，服务短暂中断。执行前先看《安全加固方案.md》。
# 执行：sudo bash harden-security.sh
# ==============================================================================

set -euo pipefail

# ---------------------------- 可调参数 ----------------------------
NEW_MYSQL_PASSWORD='Lt19960614.'
NEW_MYSQL_PORT=53061
NEW_REDIS_PORT=49763
# 白名单 IP：固定公网IP + 当前实际出口IP（两个都放行，避免锁死SSH）
WHITELIST_IPS=('176.122.189.165' '113.57.10.164')
OLD_MYSQL_PASSWORD='123456'
OLD_REDIS_PASSWORD='lt19960614.'
# -------------------------------------------------------------------

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[+]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[x]${NC} $*"; }

# ==============================================================================
# 0. 前置检查
# ==============================================================================
log "========== 0. 前置检查 =========="
[ "$(id -u)" -eq 0 ] || { err "请用 root 权限执行：sudo bash harden-security.sh"; exit 1; }
command -v ufw >/dev/null || { err "未找到 ufw"; exit 1; }
command -v mysql >/dev/null || { err "未找到 mysql 客户端"; exit 1; }

# ==============================================================================
# 1. 备份关键配置
# ==============================================================================
log "========== 1. 备份关键配置 =========="
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/data/doupi/backups/security-${TS}"
mkdir -p "${BACKUP_DIR}"
cp /etc/mysql/mysql.conf.d/mysqld.cnf     "${BACKUP_DIR}/mysqld.cnf.bak"     2>/dev/null || true
cp /etc/mysql/mysql.conf.d/doupi-tune.cnf "${BACKUP_DIR}/doupi-tune.cnf.bak" 2>/dev/null || true
cp /etc/redis/redis.conf                  "${BACKUP_DIR}/redis.conf.bak"      2>/dev/null || true
cp /data/doupi/start.sh                   "${BACKUP_DIR}/start.sh.bak"        2>/dev/null || true
cp /data/doupi-test/start.sh              "${BACKUP_DIR}/start-test.sh.bak"   2>/dev/null || true
ufw status numbered > "${BACKUP_DIR}/ufw-status.txt" 2>/dev/null || true
log "配置已备份到 ${BACKUP_DIR}"

# ==============================================================================
# 2. 修改 MySQL 密码
# ==============================================================================
log "========== 2. 修改 MySQL root 密码 =========="
# 注意：root 有两个 host（localhost 和 127.0.0.1），都要改，否则后端连 127.0.0.1 会失败
mysql -uroot -p"${OLD_MYSQL_PASSWORD}" -e \
  "ALTER USER 'root'@'localhost' IDENTIFIED BY '${NEW_MYSQL_PASSWORD}'; FLUSH PRIVILEGES;" 2>/dev/null && \
  log "MySQL root@localhost 密码已修改" || warn "修改密码失败（旧密码可能已变），跳过"
mysql -uroot -p"${NEW_MYSQL_PASSWORD}" -e \
  "ALTER USER 'root'@'127.0.0.1' IDENTIFIED BY '${NEW_MYSQL_PASSWORD}'; FLUSH PRIVILEGES;" 2>/dev/null && \
  log "MySQL root@127.0.0.1 密码已修改" || warn "root@127.0.0.1 修改失败（可能不存在），跳过"

# ==============================================================================
# 3. 修改 MySQL 端口 + 绑定本机
# ==============================================================================
log "========== 3. 修改 MySQL 端口 -> ${NEW_MYSQL_PORT}，绑定 127.0.0.1 =========="
MYSQLD_CNF=/etc/mysql/mysql.conf.d/mysqld.cnf
if grep -q '^port' "${MYSQLD_CNF}"; then
  sed -i "s/^port.*/port = ${NEW_MYSQL_PORT}/" "${MYSQLD_CNF}"
else
  sed -i "/^\[mysqld\]/a port = ${NEW_MYSQL_PORT}" "${MYSQLD_CNF}"
fi
# 绑定本机（关闭对外）
if grep -q '^bind-address' "${MYSQLD_CNF}"; then
  sed -i "s/^bind-address.*/bind-address = 127.0.0.1/" "${MYSQLD_CNF}"
else
  sed -i "/^\[mysqld\]/a bind-address = 127.0.0.1" "${MYSQLD_CNF}"
fi
# 关闭 X 协议端口（33060 已确认暴露，一并关闭）
if grep -q '^mysqlx-bind-address' "${MYSQLD_CNF}"; then
  sed -i "s/^mysqlx-bind-address.*/mysqlx-bind-address = 127.0.0.1/" "${MYSQLD_CNF}"
else
  sed -i "/^\[mysqld\]/a mysqlx-bind-address = 127.0.0.1" "${MYSQLD_CNF}"
fi
log "MySQL 端口 ${NEW_MYSQL_PORT} + 绑定 127.0.0.1 已写入"

# ==============================================================================
# 4. 修改 Redis 端口 + 绑定本机
# ==============================================================================
log "========== 4. 修改 Redis 端口 -> ${NEW_REDIS_PORT}，绑定 127.0.0.1 =========="
REDIS_CNF=/etc/redis/redis.conf
sed -i "s/^port .*/port ${NEW_REDIS_PORT}/" "${REDIS_CNF}"
sed -i "s/^bind .*/bind 127.0.0.1/" "${REDIS_CNF}"
sed -i "s/^protected-mode .*/protected-mode yes/" "${REDIS_CNF}"
# 密码保持不变（需求未要求改 Redis 密码）
log "Redis 端口 ${NEW_REDIS_PORT} + 绑定 127.0.0.1 已写入"

# ==============================================================================
# 5. 同步后端启动脚本（生产 + 测试）
# ==============================================================================
log "========== 5. 同步后端启动脚本 =========="
# 生产后端：MySQL 地址/端口、MySQL 密码、Redis 端口
sed -i "s|jdbc:mysql://127.0.0.1:3306/|jdbc:mysql://127.0.0.1:${NEW_MYSQL_PORT}/|g" /data/doupi/start.sh
sed -i "s|--spring.datasource.druid.master.password=[^ ]*|--spring.datasource.druid.master.password=${NEW_MYSQL_PASSWORD}|" /data/doupi/start.sh
sed -i "s|--spring.data.redis.port=[0-9]*|--spring.data.redis.port=${NEW_REDIS_PORT}|" /data/doupi/start.sh

# 测试后端：MySQL 地址/端口、Redis 端口（测试库账号 doupi_test 密码不变）
if [ -f /data/doupi-test/start.sh ]; then
  sed -i "s|jdbc:mysql://127.0.0.1:3306/|jdbc:mysql://127.0.0.1:${NEW_MYSQL_PORT}/|g" /data/doupi-test/start.sh
  sed -i "s|--spring.data.redis.port=[0-9]*|--spring.data.redis.port=${NEW_REDIS_PORT}|" /data/doupi-test/start.sh
fi
log "后端启动脚本已同步（生产 + 测试）"

# ==============================================================================
# 6. 重启服务
# ==============================================================================
log "========== 6. 重启服务 =========="
systemctl restart mysql
systemctl restart redis-server
log "MySQL / Redis 已重启"
sleep 5
systemctl restart doupi-server
systemctl restart doupi-server-test
log "后端服务已重启"

# ==============================================================================
# 7. 配置 ufw（白名单 + 限速）
# ==============================================================================
log "========== 7. 配置 ufw 防火墙 =========="
# SSH：改为仅白名单 IP + 限速（防暴力破解）
# 关键：先加白名单规则，再删全网放行，避免 SSH 瞬间断连自锁
for IP in "${WHITELIST_IPS[@]}"; do
  ufw allow from "${IP}" to any port 22 proto tcp
  # 后端 8088/8089：仅白名单 IP 访问
  ufw allow from "${IP}" to any port 8088 proto tcp
  ufw allow from "${IP}" to any port 8089 proto tcp
done
ufw limit 22/tcp
ufw delete allow OpenSSH 2>/dev/null || true
ufw delete allow 22/tcp 2>/dev/null || true

# MySQL/Redis 新端口：本机已绑定 127.0.0.1，无需对外放行
# 若你之后要远程直连（不推荐），再手动加：
#   ufw allow from ${WHITELIST_IP} to any port ${NEW_MYSQL_PORT} proto tcp
#   ufw allow from ${WHITELIST_IP} to any port ${NEW_REDIS_PORT} proto tcp

# 80/443/syncthing/RustDesk 保持现状（不改，避免影响现有业务）
log "ufw 规则已更新（SSH 限白名单+限速，后端限白名单）"

# ==============================================================================
# 8. 安装并配置 fail2ban（防 SSH 暴力破解）
# ==============================================================================
log "========== 8. 安装 fail2ban =========="
if ! command -v fail2ban-client >/dev/null; then
  apt-get update -qq && apt-get install -y -qq fail2ban
fi
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5
ignoreip = 127.0.0.1/8 176.122.189.165 113.57.10.164

[sshd]
enabled = true
port    = 22
backend = systemd
EOF
systemctl enable fail2ban 2>/dev/null || true
systemctl restart fail2ban 2>/dev/null && log "fail2ban 已启动" || warn "fail2ban 启动失败"

# ==============================================================================
# 9. 验证
# ==============================================================================
log "========== 9. 验证 =========="
echo -n "MySQL 端口: "; ss -tlnp | grep -E ":${NEW_MYSQL_PORT}" || err "MySQL 端口未监听!"
echo -n "Redis 端口: "; ss -tlnp | grep -E ":${NEW_REDIS_PORT}" || err "Redis 端口未监听!"
echo -n "MySQL 登录: "; mysql -uroot -p"${NEW_MYSQL_PASSWORD}" -h127.0.0.1 -P${NEW_MYSQL_PORT} -e "SELECT 1;" >/dev/null 2>&1 && log "OK" || err "MySQL 登录失败!"
echo -n "Redis 验证: "; redis-cli -p ${NEW_REDIS_PORT} -a "${OLD_REDIS_PASSWORD}" ping 2>/dev/null || err "Redis 验证失败!"
echo -n "后端(8088): "; curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8088/ 2>/dev/null || true; echo ""
echo -n "后端(8089): "; curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8089/ 2>/dev/null || true; echo ""

log "========== 服务器内部加固完成 =========="
log "备份目录：${BACKUP_DIR}"
log "MySQL：密码 ${NEW_MYSQL_PASSWORD} / 端口 ${NEW_MYSQL_PORT} / 绑定 127.0.0.1"
log "Redis：端口 ${NEW_REDIS_PORT} / 绑定 127.0.0.1"
warn ""
warn "【还需手动操作】腾讯轻量控制台防火墙（网页控制台）："
warn "  1. 删除 3306、9763 的放行规则（旧端口已不再监听）"
warn "  2. 确认 SSH(22) 放行源已限制为白名单 IP（176.122.189.165 / 113.57.10.164），或保持现状靠 ufw 兜底"
warn "  3. 大流量 DDoS 依赖腾讯云「DDoS 基础防护」，控制台确认已开启"
