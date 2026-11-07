package com.doupi.web;

import java.util.Set;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.autoconfigure.MybatisPlusAutoConfiguration;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInterceptor;
import com.doupi.framework.config.MyBatisConfig;
import com.doupi.recruit.mapper.MiniIdentityMapper;
import com.doupi.system.domain.SysConfig;
import com.doupi.system.mapper.SysConfigMapper;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;

class MyBatisPlusCompatibilityTest
{
    @Test
    void loadsLegacyXmlAndPageHelperAlongsidePlusCrud() throws Exception
    {
        var dataSource = new DriverManagerDataSource("jdbc:h2:mem:plus-check;MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement())
        {
            statement.execute("""
                    CREATE TABLE sys_config (config_id INT PRIMARY KEY, config_name VARCHAR(80),
                    config_key VARCHAR(80), config_value VARCHAR(80), config_type VARCHAR(1),
                    create_by VARCHAR(64), create_time TIMESTAMP, update_by VARCHAR(64),
                    update_time TIMESTAMP, remark VARCHAR(120))
                    """);
            statement.execute("INSERT INTO sys_config(config_id,config_name) VALUES (1,'First'),(2,'Second')");
            statement.execute("CREATE TABLE mapper_probe (id BIGINT PRIMARY KEY, name VARCHAR(40))");
        }
        try (var context = mapperContext(dataSource))
        {
            var factory = context.getBean(org.apache.ibatis.session.SqlSessionFactory.class);
            var config = assertInstanceOf(MybatisConfiguration.class, factory.getConfiguration());
            assertEquals(1, config.getInterceptors().stream().filter(PageInterceptor.class::isInstance).count());
            var sql = context.getBean(SqlSessionTemplate.class);
            var legacy = sql.getMapper(SysConfigMapper.class);
            try (var page = PageHelper.startPage(2, 1).setOrderBy("config_id"))
            {
                assertEquals("Second", legacy.selectConfigList(new SysConfig()).get(0).getConfigName());
                assertEquals(2, page.getTotal());
                assertEquals(1, page.getResult().size());
            }

            config.addMapper(ProbeMapper.class);
            var mapper = sql.getMapper(ProbeMapper.class);
            var probe = new Probe();
            probe.setId(7L);
            probe.setName("plus");
            assertEquals(1, mapper.insert(probe));
            assertEquals("plus", mapper.selectById(7L).getName());
        }
    }

    @Test
    void mapsMiniIdentityAndFiltersBindingQueueByDepartment() throws Exception
    {
        var dataSource = new DriverManagerDataSource("jdbc:h2:mem:mini-identity;MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement())
        {
            statement.execute("""
                    CREATE ALIAS UTC_TIMESTAMP AS $$
                    java.time.LocalDateTime utcTimestamp(int precision) {
                        return java.time.LocalDateTime.of(2026, 11, 7, 0, 0);
                    }
                    $$
                    """);
            statement.execute("""
                    CREATE TABLE sys_user (user_id BIGINT PRIMARY KEY, dept_id BIGINT,
                    user_name VARCHAR(30), nick_name VARCHAR(30), status VARCHAR(1) DEFAULT '0',
                    del_flag VARCHAR(1) DEFAULT '0', auth_version BIGINT DEFAULT 0)
                    """);
            statement.execute("""
                    CREATE TABLE sys_external_identity (identity_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    user_id BIGINT, provider VARCHAR(16), app_id VARCHAR(64),
                    subject_id VARCHAR(128), link_status VARCHAR(16), created_at TIMESTAMP,
                    verified_by BIGINT, verified_at TIMESTAMP, UNIQUE (provider, app_id, subject_id))
                    """);
            statement.execute("""
                    CREATE TABLE auth_binding_request (binding_request_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    identity_id BIGINT, staff_user_id BIGINT, status VARCHAR(16), reason VARCHAR(300),
                    version BIGINT DEFAULT 0, created_at TIMESTAMP, reviewed_by BIGINT,
                    review_remark VARCHAR(300), reviewed_at TIMESTAMP,
                    pending_identity_id BIGINT GENERATED ALWAYS AS (CASE WHEN status='PENDING' THEN identity_id END),
                    UNIQUE (pending_identity_id))
                    """);
            statement.execute("""
                    CREATE TABLE channel_idempotency (command_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    scope_key VARCHAR(128), action_code VARCHAR(64), idempotency_key VARCHAR(64),
                    payload_hash CHAR(64), http_status SMALLINT, result_json VARCHAR(400), created_at TIMESTAMP,
                    UNIQUE (scope_key, action_code, idempotency_key))
                    """);
            statement.execute("""
                    INSERT INTO sys_user(user_id,dept_id,user_name,nick_name)
                    VALUES (42,5,'staff-a','Staff A'),(43,6,'staff-b','Staff B')
                    """);
            statement.execute("""
                    INSERT INTO sys_external_identity(identity_id,user_id,provider,app_id,subject_id,link_status) VALUES
                    (1,42,'WECHAT','school','subject-a','VERIFIED'),
                    (2,NULL,'WECHAT','school','subject-b','PENDING'),
                    (3,NULL,'WEB','school','subject-a','VISITOR')
                    """);
            statement.execute("""
                    INSERT INTO auth_binding_request(binding_request_id,identity_id,staff_user_id,status,reason,version)
                    VALUES (101,1,42,'VERIFIED','approved test',1), (102,2,43,'PENDING','pending test',0)
                    """);
        }

        try (var context = mapperContext(dataSource))
        {
            var mapper = context.getBean(SqlSessionTemplate.class).getMapper(MiniIdentityMapper.class);
            assertEquals(new MiniIdentityMapper.Identity(1, 42L, "VERIFIED", 101L, "school", "subject-a", 0L),
                    mapper.findIdentity("school", "subject-a"));
            assertNull(mapper.findIdentity("other-school", "subject-a"));
            assertNull(mapper.selectIdentity(3, false));
            assertEquals(102, mapper.selectPendingBinding(2).id());
            assertEquals(42, mapper.selectQueue(false, Set.of("5"), Long.MAX_VALUE).get(0).staffId());
            assertEquals(1, mapper.selectQueue(false, Set.of("5"), Long.MAX_VALUE).size());
            assertEquals(0, mapper.selectQueue(false, Set.of(), Long.MAX_VALUE).size());
            assertEquals(2, mapper.selectQueue(true, Set.of(), Long.MAX_VALUE).size());
            mapper.updateIdentity(1, null, "REVOKED", null);
            assertEquals(new MiniIdentityMapper.Identity(1, null, "REVOKED", null, "school", "subject-a", null),
                    mapper.selectIdentity(1, false));
            assertEquals(1, mapper.selectQueue(true, Set.of(), Long.MAX_VALUE).size());
            mapper.upsertIdentity("school", "subject-c");
            var visitor = mapper.findIdentity("school", "subject-c");
            mapper.upsertIdentity("school", "subject-c");
            assertEquals(visitor, mapper.findIdentity("school", "subject-c"));

            var transaction = new TransactionTemplate(new DataSourceTransactionManager(dataSource));
            String scope = "IDENTITY:" + visitor.id();
            String hash = "a".repeat(64);
            transaction.executeWithoutResult(status -> {
                mapper.upsertCommand(scope, "BINDING_APPLY", "same-key", hash);
                var command = mapper.lockCommand(scope, "BINDING_APPLY", "same-key");
                mapper.selectIdentity(visitor.id(), true);
                mapper.insertBinding(visitor.id(), 43, "fixture reason");
                mapper.updateIdentity(visitor.id(), null, "PENDING", null);
                mapper.finishCommand(command.id(), 201, "{}");
                status.setRollbackOnly();
            });
            assertNull(mapper.lockCommand(scope, "BINDING_APPLY", "same-key"));
            assertNull(mapper.selectPendingBinding(visitor.id()));
            assertEquals("VISITOR", mapper.selectIdentity(visitor.id(), false).status());

            transaction.executeWithoutResult(status -> {
                mapper.upsertCommand(scope, "BINDING_APPLY", "same-key", hash);
                var command = mapper.lockCommand(scope, "BINDING_APPLY", "same-key");
                mapper.selectIdentity(visitor.id(), true);
                mapper.insertBinding(visitor.id(), 43, "fixture reason");
                mapper.updateIdentity(visitor.id(), null, "PENDING", null);
                mapper.finishCommand(command.id(), 201, "{}");
            });
            mapper.upsertCommand(scope, "BINDING_APPLY", "same-key", hash);
            assertEquals("{}", mapper.lockCommand(scope, "BINDING_APPLY", "same-key").result());
            var pending = mapper.selectPendingBinding(visitor.id());
            transaction.executeWithoutResult(status -> {
                mapper.selectIdentity(visitor.id(), true);
                mapper.selectBinding(pending.id(), true);
                assertEquals(43L, mapper.lockActiveStaff(43));
                mapper.reviewBinding(pending.id(), 42, "VERIFIED", "fixture approval");
                mapper.updateIdentity(visitor.id(), 43L, "VERIFIED", 42L);
            });
            assertEquals(pending.id(), mapper.selectIdentity(visitor.id(), false).bindingId());
            assertEquals(pending.id(), mapper.lockCurrentBinding(visitor.id(), 43));
        }
    }

    private AnnotationConfigApplicationContext mapperContext(DriverManagerDataSource dataSource) throws Exception
    {
        var context = new AnnotationConfigApplicationContext();
        new YamlPropertySourceLoader().load("mapper-test", new ClassPathResource("application.yml"))
                .forEach(context.getEnvironment().getPropertySources()::addLast);
        context.register(MyBatisConfig.class, MybatisPlusAutoConfiguration.class);
        context.registerBean(javax.sql.DataSource.class, () -> dataSource);
        context.refresh();
        return context;
    }

    interface ProbeMapper extends BaseMapper<Probe>
    {
    }

    @TableName("mapper_probe")
    public static class Probe
    {
        @TableId(type = IdType.INPUT)
        private Long id;
        private String name;

        public Long getId()
        {
            return id;
        }

        public void setId(Long id)
        {
            this.id = id;
        }

        public String getName()
        {
            return name;
        }

        public void setName(String name)
        {
            this.name = name;
        }
    }
}
