package com.doupi.recruit.service;

import com.doupi.common.exception.ServiceException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class WechatIdentityClientTest
{
    @Test
    void acceptsOnlyTheIdentityReturnedByWechat()
    {
        assertEquals("official-openid", WechatIdentityClient.readOpenId(200,
                "{\"openid\":\"official-openid\",\"session_key\":\"never-export\"}"));
        assertEquals(401, assertThrows(ServiceException.class,
                () -> WechatIdentityClient.readOpenId(200, "{\"errcode\":40029,\"openid\":\"ignore\"}")).getCode());
        assertEquals(429, assertThrows(ServiceException.class,
                () -> WechatIdentityClient.readOpenId(200, "{\"errcode\":45011}")).getCode());
        assertEquals(503, assertThrows(ServiceException.class,
                () -> WechatIdentityClient.readOpenId(200, "{\"errcode\":40013}")).getCode());
        assertEquals(503, assertThrows(ServiceException.class,
                () -> WechatIdentityClient.readOpenId(200, "{\"openid\":123}")).getCode());
        assertEquals(503, assertThrows(ServiceException.class,
                () -> WechatIdentityClient.readOpenId(200, "not-json")).getCode());
    }

    @Test
    void missingConfigurationFailsBeforeAnyExchange()
    {
        var client = new WechatIdentityClient("", "");
        assertEquals(503, assertThrows(ServiceException.class, () -> client.exchange("test-code")).getCode());
    }
}
