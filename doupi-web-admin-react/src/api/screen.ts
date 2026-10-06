import request from './request';

/**
 * 获取数字化校园数据大屏全量综合数据 (HTTP 初始或降级拉取)
 */
export function getScreenData() {
  return request({
    url: '/screen/data',
    method: 'get',
  });
}

/**
 * 获取提分光荣榜全量列表
 */
export function getCelebrationList(params?: any) {
  return request({
    url: '/screen/celebration/list',
    method: 'get',
    params,
  });
}

/**
 * 获取提分光荣榜概要
 */
export function getCelebrationSummary(batchTitle?: string) {
  return request({
    url: '/screen/celebration/summary',
    method: 'get',
    params: { batchTitle },
  });
}

/**
 * 获取提分光荣榜所有考试批次列表
 */
export function getCelebrationBatches() {
  return request({
    url: '/screen/celebration/batches',
    method: 'get',
  });
}

/**
 * 建立 WebFlux SSE 实时响应式数据流推送连接
 */
export function createScreenEventSource(
  onMessage: (data: any) => void,
  onError?: (err: any) => void
): EventSource | null {
  try {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
    const url = `${baseURL}/screen/stream`;
    const eventSource = new EventSource(url);

    eventSource.addEventListener('screen-update', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (e) {
        console.error('[WebFlux SSE] 解析推送帧异常:', e);
      }
    });

    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (e) {
        console.error('[WebFlux SSE] 解析推送帧异常:', e);
      }
    };

    eventSource.onerror = (err) => {
      if (onError) onError(err);
    };

    return eventSource;
  } catch (e) {
    console.error('[WebFlux SSE] 初始化异常:', e);
    return null;
  }
}
