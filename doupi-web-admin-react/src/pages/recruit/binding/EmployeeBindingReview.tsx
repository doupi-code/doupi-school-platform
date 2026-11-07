import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Input, Modal, Space, Table, Tag, message } from 'antd';
import axios from 'axios';
import request from '@/api/request';
import { useUserStore } from '@/store/useUserStore';

interface BindingRow {
  bindingRequestId: string;
  username: string;
  nickname: string;
  reason: string;
  version: number;
  status: 'PENDING' | 'VERIFIED';
  self: boolean;
}

type Action = 'APPROVE' | 'REJECT' | 'REVOKE';
interface PendingCommand {
  id: string;
  route: 'review' | 'revoke';
  key: string;
  body: { expectedVersion: number; decision?: 'APPROVE' | 'REJECT'; remark?: string };
}

const endpoint = '/api/v1/staff/employee-bindings';
const actionLabels = { APPROVE: '通过核实', REJECT: '拒绝申请', REVOKE: '撤销绑定' };

function readPending(storageKey: string): PendingCommand | null {
  try {
    const saved = sessionStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) as PendingCommand : null;
  } catch {
    return null;
  }
}

export default function EmployeeBindingReview() {
  const username = useUserStore(state => state.name);
  const storageKey = 'mini02.employeeBinding:' + username;
  const [rows, setRows] = useState<BindingRow[]>([]);
  const [cursor, setCursor] = useState('');
  const [nextCursor, setNextCursor] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingCommand | null>(() => readPending(storageKey));
  const [selected, setSelected] = useState<{ row: BindingRow; action: Action } | null>(null);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authorizationDenied, setAuthorizationDenied] = useState(false);
  const running = useRef(false);

  const load = async (before = '') => {
    setLoading(true);
    try {
      const response = await request({
        url: endpoint, method: 'get', params: before ? { before } : undefined
      }) as unknown as { data: { items: BindingRow[]; nextBefore: string } };
      setRows(response.data.items);
      setCursor(before);
      setNextCursor(response.data.nextBefore);
    } catch {
      setRows([]);
      setNextCursor('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPending(readPending(storageKey));
    void load();
  }, [storageKey]);

  const send = async (command: PendingCommand) => {
    if (running.current || !username) return;
    running.current = true;
    setSubmitting(true);
    setAuthorizationDenied(false);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(command));
    } catch {
      message.error('无法保存待确认命令，请检查浏览器存储设置');
      running.current = false;
      setSubmitting(false);
      return;
    }
    setPending(command);
    setSelected(null);
    try {
      await request({ url: endpoint + '/' + command.id + '/' + command.route, method: 'post',
        headers: { 'Idempotency-Key': command.key }, data: command.body });
      sessionStorage.removeItem(storageKey);
      setPending(null);
      message.success('员工绑定状态已更新');
      await load(cursor);
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 403) setAuthorizationDenied(true);
      if (status && [400, 404, 409, 422].includes(status)) {
        sessionStorage.removeItem(storageKey);
        setPending(null);
        await load(cursor);
      }
    } finally {
      running.current = false;
      setSubmitting(false);
    }
  };

  const pick = (row: BindingRow, action: Action) => {
    setRemark('');
    setSelected({ row, action });
  };

  const confirm = () => {
    if (!selected || pending) return;
    const { row, action } = selected;
    const note = remark.trim();
    if (action !== 'REVOKE' && !note) {
      message.warning('请填写核实备注');
      return;
    }
    if (!window.crypto?.randomUUID) {
      message.error('当前浏览器环境无法生成安全操作标识，请使用 HTTPS 打开管理后台');
      return;
    }
    void send({
      id: row.bindingRequestId,
      route: action === 'REVOKE' ? 'revoke' : 'review',
      key: window.crypto.randomUUID(),
      body: action === 'REVOKE' ? { expectedVersion: row.version }
        : { expectedVersion: row.version, decision: action, remark: note }
    });
  };

  return (
    <Card title="小程序员工身份核实" style={{ marginBottom: 16 }}
      extra={<Space>
        {cursor && <Button disabled={loading} onClick={() => void load()}>返回首页</Button>}
        <Button disabled={loading} onClick={() => void load(cursor)}>刷新</Button>
        {nextCursor && <Button disabled={loading} onClick={() => void load(nextCursor)}>下一页</Button>}
      </Space>}>
      {pending && <Alert
        type="warning"
        showIcon
        title="上一条操作结果待确认"
        description={authorizationDenied
          ? '当前无法核实这条申请。可结束本地重试并刷新队列。'
          : '使用原请求重试，避免重复核实或撤销。'}
        action={authorizationDenied
          ? <Button onClick={() => {
              sessionStorage.removeItem(storageKey);
              setPending(null);
              setAuthorizationDenied(false);
              void load(cursor);
            }}>结束重试</Button>
          : <Button loading={submitting} onClick={() => void send(pending)}>重试原操作</Button>}
      />}
      <Table<BindingRow> rowKey="bindingRequestId" dataSource={rows} loading={loading} pagination={false}
        columns={[
          { title: '申请编号', dataIndex: 'bindingRequestId' },
          { title: '学校账号', dataIndex: 'username' },
          { title: '姓名', dataIndex: 'nickname' },
          { title: '核实说明', dataIndex: 'reason', ellipsis: true },
          { title: '状态', render: (_, row) => row.status === 'PENDING'
            ? <Tag color="processing">待核实</Tag> : <Tag color="success">已核实</Tag> },
          { title: '操作', render: (_, row) => row.self ? '本人申请由其他核实员处理'
            : row.status === 'PENDING' ? <Space>
              <Button type="link" disabled={!!pending} onClick={() => pick(row, 'APPROVE')}>通过</Button>
              <Button type="link" disabled={!!pending} onClick={() => pick(row, 'REJECT')}>拒绝</Button>
            </Space> : <Button type="link" danger disabled={!!pending}
              onClick={() => pick(row, 'REVOKE')}>撤销</Button> }
        ]} />
      <Modal title={selected ? actionLabels[selected.action] : ''} open={!!selected}
        onOk={confirm} onCancel={() => setSelected(null)} confirmLoading={submitting}>
        <p>学校账号 {selected?.row.username}</p>
        <p>申请编号 {selected?.row.bindingRequestId}。请通过学校认可的渠道和申请人核对。</p>
        {selected?.action === 'REVOKE'
          ? <p>撤销后，该微信的员工会话将立即失效。</p>
          : <Input.TextArea value={remark} maxLength={300} rows={3}
            onChange={event => setRemark(event.target.value)} placeholder="核实备注，请勿填写密码或证件号码" />}
      </Modal>
    </Card>
  );
}
