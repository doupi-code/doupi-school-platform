package com.doupi.common.core.domain;

import java.util.UUID;

public record ApiV1Response(int code, String msg, String traceId, boolean replayed, Object data)
{
    public static ApiV1Response of(int code, String msg, Object data)
    {
        return new ApiV1Response(code, msg, UUID.randomUUID().toString(), false, data);
    }
}
