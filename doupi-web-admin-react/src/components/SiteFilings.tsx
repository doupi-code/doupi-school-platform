import { useEffect, useState } from 'react';
import { getClientBaseUrl } from '@/utils/env';
import { DEFAULT_SITE_FILINGS, SITE_FILINGS_UPDATED } from '@/utils/siteFilings';

export default function SiteFilings() {
  const [config, setConfig] = useState(DEFAULT_SITE_FILINGS);

  useEffect(() => {
    const controller = new AbortController();
    // 使用官网公共接口，普通后台用户也能读取备案，无需 CMS 管理权限。
    fetch(`${getClientBaseUrl()}/api/public/v1/cms/global/footer`, { signal: controller.signal })
      .then(response => response.json())
      .then(response => {
        if (response.code !== 200 || !response.data) return;
        const footer = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        setConfig({ ...DEFAULT_SITE_FILINGS, ...footer });
      })
      .catch(() => { /* 接口不可用时显示核准备案信息。 */ });

    const handleUpdate = (event: Event) => {
      // 防止较早发出的读取请求覆盖刚保存的配置。
      controller.abort();
      setConfig({ ...DEFAULT_SITE_FILINGS, ...(event as CustomEvent).detail });
    };
    window.addEventListener(SITE_FILINGS_UPDATED, handleUpdate);
    return () => {
      controller.abort();
      window.removeEventListener(SITE_FILINGS_UPDATED, handleUpdate);
    };
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '0 16px 24px', color: 'rgba(0, 0, 0, 0.45)', fontSize: 13 }}>
      <a href={/^https?:\/\//i.test(config.icpUrl) ? config.icpUrl : undefined} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
        {config.icp}
      </a>
      <span aria-hidden="true">/</span>
      <a href={/^https?:\/\//i.test(config.policeBeianUrl) ? config.policeBeianUrl : undefined} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <img src={`${import.meta.env.BASE_URL}images/police-beian.png`} alt="" width={18} height={20} />
        {config.policeBeian}
      </a>
    </div>
  );
}
