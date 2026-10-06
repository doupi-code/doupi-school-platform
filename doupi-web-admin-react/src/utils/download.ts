import axios from 'axios';
import { message } from 'antd';
import { getToken } from './auth';

/**
 * 通用Excel报表文件下载器（支持鉴权Token、Blob流处理与RFC 5987中文文件名解析）
 */
export async function downloadExcel(url: string, params: any, defaultFilename = '报表.xlsx') {
  try {
    message.loading({ content: '正在为您生成并导出高精度Excel报表，请稍候...', key: 'exporting' });
    const token = getToken();
    const baseURL = import.meta.env.VITE_API_BASE_URL || '';
    const res = await axios.post(`${baseURL}${url}`, null, {
      params,
      responseType: 'blob',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    let filename = defaultFilename;
    const disposition = res.headers['content-disposition'];
    if (disposition && disposition.indexOf("filename*=utf-8''") !== -1) {
      filename = decodeURIComponent(disposition.split("filename*=utf-8''")[1]);
    } else if (disposition && disposition.indexOf('filename=') !== -1) {
      filename = decodeURIComponent(disposition.split('filename=')[1].replace(/"/g, ''));
    }

    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    message.success({ content: `【${filename}】导出成功！`, key: 'exporting', duration: 3 });
  } catch (err: any) {
    console.error('导出Excel失败:', err);
    message.error({ content: '导出报表失败，请检查网络或重试！', key: 'exporting' });
  }
}
