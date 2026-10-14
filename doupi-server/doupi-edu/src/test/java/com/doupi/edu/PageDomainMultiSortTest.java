package com.doupi.edu;

import com.doupi.common.core.page.PageDomain;
import com.doupi.common.utils.sql.SqlUtil;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

public class PageDomainMultiSortTest {

    @Test
    public void testMultiColumnOrderByParsing() {
        PageDomain pageDomain = new PageDomain();
        pageDomain.setOrderByColumn("printTime desc, totalPages asc");
        String orderBy = pageDomain.getOrderBy();
        Assertions.assertEquals("print_time desc, total_pages asc", orderBy);
        Assertions.assertTrue(SqlUtil.isValidOrderBySql(orderBy));
    }

    @Test
    public void testTablePrefixedMultiColumnOrderBy() {
        PageDomain pageDomain = new PageDomain();
        pageDomain.setOrderByColumn("r.printTime desc, r.status asc");
        String orderBy = pageDomain.getOrderBy();
        Assertions.assertEquals("r.print_time desc, r.status asc", orderBy);
        Assertions.assertTrue(SqlUtil.isValidOrderBySql(orderBy));
    }

    @Test
    public void testDirectOrderByProperty() {
        PageDomain pageDomain = new PageDomain();
        pageDomain.setOrderBy("r.print_time desc, r.print_id desc");
        String orderBy = pageDomain.getOrderBy();
        Assertions.assertEquals("r.print_time desc, r.print_id desc", orderBy);
        Assertions.assertTrue(SqlUtil.isValidOrderBySql(orderBy));
    }

    @Test
    public void testSingleColumnLegacy() {
        PageDomain pageDomain = new PageDomain();
        pageDomain.setOrderByColumn("printTime");
        pageDomain.setIsAsc("desc");
        String orderBy = pageDomain.getOrderBy();
        Assertions.assertEquals("print_time desc", orderBy);
        Assertions.assertTrue(SqlUtil.isValidOrderBySql(orderBy));
    }
}
