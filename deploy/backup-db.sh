#!/bin/bash
# ==============================================================================
# MySQL 数据库定时自动备份脚本 (保留最近 30 天)
# ==============================================================================

BACKUP_DIR="/home/doupi/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="doupi-mysql"
DB_NAME="doupi"
MYSQL_PWD="doupi_secure_pwd_2026"

mkdir -p "${BACKUP_DIR}"

echo "[${DATE}] 开始备份数据库 ${DB_NAME}..."
docker exec ${CONTAINER_NAME} mysqldump -u root -p"${MYSQL_PWD}" --single-transaction --quick "${DB_NAME}" | gzip > "${BACKUP_DIR}/doupi_${DATE}.sql.gz"

if [ $? -eq 0 ]; then
    echo "[${DATE}] 备份成功: ${BACKUP_DIR}/doupi_${DATE}.sql.gz"
else
    echo "[${DATE}] 备份失败！"
fi

# 删除 30 天以前的历史备份
find "${BACKUP_DIR}" -type f -name "doupi_*.sql.gz" -mtime +30 -exec rm -f {} \;
