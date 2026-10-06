#!/bin/bash
cd /data/doupi-test
exec /usr/bin/java -server \
  -Xms512m -Xmx512m \
  -XX:MetaspaceSize=96m -XX:MaxMetaspaceSize=160m \
  -XX:+UseG1GC -XX:MaxGCPauseMillis=100 -XX:+ParallelRefProcEnabled \
  -Djava.awt.headless=true -Dfile.encoding=UTF-8 \
  -jar doupi-admin.jar \
  --server.port=8089 \
  --spring.datasource.druid.master.url="jdbc:mysql://127.0.0.1:3306/stuck-mg-test?useUnicode=true&characterEncoding=utf8&zeroDateTimeBehavior=convertToNull&useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true" \
  --spring.datasource.druid.master.username=doupi_test \
  --spring.datasource.druid.master.password="DoupiTest2026!#" \
  --spring.data.redis.host=127.0.0.1 \
  --spring.data.redis.port=9763 \
  --spring.data.redis.password=lt19960614. \
  --spring.data.redis.database=1 \
  --doupi.profile=/data/doupi-test/uploadPath
