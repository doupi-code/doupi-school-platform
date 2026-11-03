package com.doupi.stock.service.impl;

import com.doupi.common.exception.ServiceException;
import com.doupi.stock.mapper.StockGoodsMapper;
import com.doupi.stock.mapper.StockInItemMapper;
import com.doupi.stock.mapper.StockInMapper;
import com.doupi.stock.service.IStockInService;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.SqlSessionFactoryBean;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabase;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;

import static org.junit.jupiter.api.Assertions.*;

/** Exercises the service, production MyBatis SQL and transaction boundaries together. */
class StockInDeletionTest
{
    private EmbeddedDatabase database;
    private JdbcTemplate jdbc;
    private IStockInService service;

    @BeforeEach
    void setUp() throws Exception
    {
        database = new EmbeddedDatabaseBuilder().generateUniqueName(true)
                .setType(EmbeddedDatabaseType.H2).build();
        jdbc = new JdbcTemplate(database);
        jdbc.execute("""
                create table edu_stock_in (
                    in_id bigint primary key, in_no varchar(64), in_type varchar(1), supplier_id bigint,
                    in_time timestamp, operator varchar(64), operator_id bigint, remark varchar(500),
                    status varchar(1), del_flag varchar(1), declared_package_count int,
                    declared_amount decimal(12,2), create_by varchar(64), create_time timestamp,
                    update_by varchar(64), update_time timestamp)
                """);
        jdbc.execute("""
                create table edu_stock_in_item (
                    item_id bigint primary key, in_id bigint, goods_id bigint, quantity bigint,
                    price decimal(12,2), amount decimal(12,2), create_by varchar(64), create_time timestamp,
                    update_by varchar(64), update_time timestamp)
                """);
        jdbc.execute("""
                create table edu_goods (
                    goods_id bigint primary key, goods_name varchar(64), category varchar(64), supplier_id bigint,
                    grade varchar(64), spec varchar(64), unit varchar(20), stock_num bigint,
                    conversion_rate int, base_unit varchar(20), remain_sheets int, warn_low bigint,
                    location varchar(64), create_by varchar(64), create_time timestamp,
                    update_by varchar(64), update_time timestamp, del_flag varchar(1))
                """);
        jdbc.execute("create table edu_supplier (supplier_id bigint primary key, supplier_name varchar(64))");
        jdbc.execute("create table sys_user (user_id bigint primary key, nick_name varchar(64))");

        SqlSessionFactoryBean factory = new SqlSessionFactoryBean();
        factory.setDataSource(database);
        factory.setTypeAliasesPackage("com.doupi.stock.domain");
        factory.setMapperLocations(new PathMatchingResourcePatternResolver()
                .getResources("classpath*:mapper/stock/Stock*Mapper.xml"));
        SqlSessionTemplate session = new SqlSessionTemplate(factory.getObject());
        StockInServiceImpl target = new StockInServiceImpl();
        inject(target, "stockInMapper", session.getMapper(StockInMapper.class));
        inject(target, "stockInItemMapper", session.getMapper(StockInItemMapper.class));
        inject(target, "stockGoodsMapper", session.getMapper(StockGoodsMapper.class));
        ProxyFactory proxy = new ProxyFactory(target);
        TransactionInterceptor transactions = new TransactionInterceptor();
        transactions.setTransactionManager(new DataSourceTransactionManager(database));
        transactions.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        proxy.addAdvice(transactions);
        service = (IStockInService) proxy.getProxy();
        jdbc.update("insert into edu_goods (goods_id, goods_name, stock_num, remain_sheets) values (10, '试卷纸', 100, 23)");
    }

    @AfterEach
    void tearDown()
    {
        if (database != null)
        {
            database.shutdown();
        }
    }

    @Test
    void deletingActiveReceiptReversesAllItsItems()
    {
        receipt(1, "1", "0", 10, 20);
        jdbc.update("insert into edu_goods (goods_id, goods_name, stock_num) values (11, '墨粉', 40)");
        jdbc.update("insert into edu_stock_in_item (item_id, in_id, goods_id, quantity) values (2, 1, 11, 5)");

        assertEquals(1, service.deleteEduStockInByInIds(new Long[]{1L}));

        assertEquals(80, stock(10));
        assertEquals(35, stock(11));
        assertEquals(23, jdbc.queryForObject("select remain_sheets from edu_goods where goods_id = 10", Integer.class));
        assertEquals("2", flag(1));
        assertEquals("2", status(1));
        assertEquals(2, jdbc.queryForObject("select count(*) from edu_stock_in_item", Integer.class));
    }

    @Test
    void singleDeletionAlsoReversesStock()
    {
        receipt(1, "1", "0", 10, 20);
        assertEquals(1, service.deleteEduStockInByInId(1L));
        assertEquals(80, stock(10));
        assertEquals("2", flag(1));
    }

    @Test
    void deletingCancelledReceiptDoesNotDeductAgain()
    {
        receipt(1, "2", "0", 10, 20);
        assertEquals(1, service.deleteEduStockInByInIds(new Long[]{1L}));
        assertEquals(100, stock(10));
        assertEquals("2", flag(1));
    }

    @Test
    void cancelThenDeleteOnlyDeductsOnce()
    {
        receipt(1, "1", "0", 10, 20);
        assertEquals(1, service.cancelEduStockIn(1L));
        assertEquals(1, service.deleteEduStockInByInId(1L));
        assertEquals(80, stock(10));
    }

    @Test
    void duplicateIdsAndRepeatedDeletionOnlyDeductOnce()
    {
        receipt(1, "1", "0", 10, 20);
        assertEquals(1, service.deleteEduStockInByInIds(new Long[]{1L, 1L}));
        assertEquals(0, service.deleteEduStockInByInId(1L));
        assertEquals(80, stock(10));
    }

    @Test
    void batchFailureRollsBackEarlierStockAndDeletion()
    {
        receipt(1, "1", "0", 10, 20);
        receipt(2, "1", "0", 10, 90);

        assertThrows(ServiceException.class, () -> service.deleteEduStockInByInIds(new Long[]{1L, 2L}));

        assertEquals(100, stock(10));
        assertEquals("0", flag(1));
        assertEquals("1", status(1));
        assertEquals("0", flag(2));
    }

    @Test
    void historicalUnverifiedReceiptCannotBeDeleted()
    {
        receipt(1, "0", "0", 10, 20);
        assertThrows(ServiceException.class, () -> service.deleteEduStockInByInId(1L));
        assertEquals(100, stock(10));
        assertEquals("0", flag(1));
    }

    @Test
    void alreadyDeletedLegacyReceiptIsNotSilentlyReversed()
    {
        receipt(1, "1", "2", 10, 20);
        assertEquals(0, service.deleteEduStockInByInId(1L));
        assertThrows(ServiceException.class, () -> service.cancelEduStockIn(1L));
        assertEquals(100, stock(10));
    }

    @Test
    void missingReceiptsAndEmptyBatchesHaveNoEffect()
    {
        assertEquals(0, service.deleteEduStockInByInId(99L));
        assertEquals(0, service.deleteEduStockInByInIds(null));
        assertEquals(0, service.deleteEduStockInByInIds(new Long[0]));
        assertEquals(100, stock(10));
    }

    @Test
    void concurrentDeletesDeductExactlyOnce() throws Exception
    {
        receipt(1, "1", "0", 10, 10);
        ExecutorService workers = Executors.newFixedThreadPool(4);
        CountDownLatch start = new CountDownLatch(1);
        try
        {
            List<Future<Integer>> results = new ArrayList<>();
            for (int i = 0; i < 4; i++)
            {
                results.add(workers.submit(() -> {
                    assertTrue(start.await(5, TimeUnit.SECONDS));
                    return service.deleteEduStockInByInId(1L);
                }));
            }
            start.countDown();
            int deleted = 0;
            for (Future<Integer> result : results)
            {
                deleted += result.get(10, TimeUnit.SECONDS);
            }
            assertEquals(1, deleted);
            assertEquals(90, stock(10));
        }
        finally
        {
            workers.shutdownNow();
            assertTrue(workers.awaitTermination(10, TimeUnit.SECONDS));
        }
    }

    private void receipt(long id, String status, String delFlag, long goodsId, long quantity)
    {
        jdbc.update("insert into edu_stock_in (in_id, status, del_flag) values (?, ?, ?)", id, status, delFlag);
        jdbc.update("insert into edu_stock_in_item (item_id, in_id, goods_id, quantity) values (?, ?, ?, ?)",
                id, id, goodsId, quantity);
    }

    private long stock(long goodsId)
    {
        return jdbc.queryForObject("select stock_num from edu_goods where goods_id = ?", Long.class, goodsId);
    }

    private String flag(long id)
    {
        return jdbc.queryForObject("select del_flag from edu_stock_in where in_id = ?", String.class, id);
    }

    private String status(long id)
    {
        return jdbc.queryForObject("select status from edu_stock_in where in_id = ?", String.class, id);
    }

    private static void inject(Object target, String name, Object value) throws Exception
    {
        Field field = target.getClass().getDeclaredField(name);
        field.setAccessible(true);
        field.set(target, value);
    }
}
