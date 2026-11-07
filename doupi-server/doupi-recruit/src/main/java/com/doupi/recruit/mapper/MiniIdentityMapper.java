package com.doupi.recruit.mapper;

import java.util.List;
import java.util.Set;
import org.apache.ibatis.annotations.Param;

public interface MiniIdentityMapper
{
    void upsertIdentity(@Param("appId") String appId, @Param("openId") String openId);

    Identity findIdentity(@Param("appId") String appId, @Param("openId") String openId);

    Identity selectIdentity(@Param("id") long id, @Param("lock") boolean lock);

    Binding selectBinding(@Param("id") long id, @Param("lock") boolean lock);

    Binding selectPendingBinding(@Param("identityId") long identityId);

    Binding selectLatestBinding(@Param("identityId") long identityId);

    Long lockCurrentBinding(@Param("identityId") long identityId, @Param("staffId") long staffId);

    Long lockActiveStaff(@Param("id") long id);

    List<Binding> selectQueue(@Param("all") boolean all, @Param("departments") Set<String> departments,
            @Param("before") long before);

    void insertBinding(@Param("identityId") long identityId, @Param("staffId") long staffId,
            @Param("reason") String reason);

    void updateIdentity(@Param("id") long id, @Param("userId") Long userId,
            @Param("status") String status, @Param("reviewer") Long reviewer);

    void reviewBinding(@Param("id") long id, @Param("reviewer") long reviewer,
            @Param("status") String status, @Param("remark") String remark);

    void upsertCommand(@Param("scope") String scope, @Param("action") String action,
            @Param("key") String key, @Param("hash") String hash);

    Command lockCommand(@Param("scope") String scope, @Param("action") String action, @Param("key") String key);

    void finishCommand(@Param("id") long id, @Param("status") int status, @Param("result") String result);

    record Identity(long id, Long staffId, String status, Long bindingId, String appId, String subjectId, Long authVersion)
    {
    }

    record Binding(long id, long identityId, long staffId, Long deptId, String username,
                   String nickname, String status, String reason, long version)
    {
    }

    record Command(long id, String hash, String result)
    {
    }
}
