package com.doupi.cms.mapper;

import java.util.List;
import com.doupi.cms.domain.CmsFaq;

/**
 * 官网常见问答Mapper接口
 * 
 * @author doupi
 */
public interface CmsFaqMapper 
{
    public CmsFaq selectFaqById(Long faqId);

    public List<CmsFaq> selectFaqList(CmsFaq faq);

    public int insertFaq(CmsFaq faq);

    public int updateFaq(CmsFaq faq);

    public int deleteFaqById(Long faqId);

    public int deleteFaqByIds(Long[] faqIds);
}
