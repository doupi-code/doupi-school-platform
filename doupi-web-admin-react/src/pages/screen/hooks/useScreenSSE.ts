import { useEffect, useState } from 'react';

/**
 * 大屏 SSE 实时数据订阅 Hook (带断线自动重连与心跳保活)
 */
export const useScreenSSE = (url: string) => {
  const [data, setData] = useState<any>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let timer: any = null;

    const connect = () => {
      try {
        eventSource = new EventSource(url);

        eventSource.onopen = () => {
          setConnected(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            setData(parsed);
          } catch (e) {
            console.error('[SSE] 数据解析异常', e);
          }
        };

        eventSource.onerror = () => {
          setConnected(false);
          eventSource?.close();
          // 5秒后尝试重连
          timer = setTimeout(connect, 5000);
        };
      } catch (err) {
        timer = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (timer) clearTimeout(timer);
      if (eventSource) eventSource.close();
    };
  }, [url]);

  return { data, connected };
};
