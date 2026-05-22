import { useState, useEffect } from 'react';
import {
  getAdminStatus, listUsers, updateUser, updateUserQuota,
  listAdminPlans, createAdminPlan, updateAdminPlan,
  getAuditLog, getDeadLetter, replayDeadLetter,
  type AdminStatus, type User, type Plan, type AuditLogEntry,
} from '../api/client';

type AdminTab = 'status' | 'users' | 'plans' | 'audit' | 'dead-letter';

export function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>('status');
  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'status', label: '系统状态' },
    { key: 'users', label: '用户管理' },
    { key: 'plans', label: '套餐管理' },
    { key: 'audit', label: '审计日志' },
    { key: 'dead-letter', label: '死信队列' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">管理后台</h1>
      <div className="flex gap-2 mb-6 border-b pb-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm rounded-t ${tab === t.key ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >{t.label}</button>
        ))}
      </div>
      {tab === 'status' && <SystemStatus />}
      {tab === 'users' && <UserManagement />}
      {tab === 'plans' && <PlanManagement />}
      {tab === 'audit' && <AuditLog />}
      {tab === 'dead-letter' && <DeadLetter />}
    </div>
  );
}

function SystemStatus() {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStatus().then(setStatus).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">加载中...</div>;
  if (!status) return <div className="text-red-500">加载失败</div>;

  const cards = [
    { label: '数据库', value: status.database },
    { label: '队列后端', value: status.queue_backend },
    { label: '等待中', value: status.tasks_pending, color: 'text-yellow-600' },
    { label: '已就绪', value: status.tasks_ready, color: 'text-blue-600' },
    { label: '队列中', value: status.tasks_queued, color: 'text-indigo-600' },
    { label: '运行中', value: status.tasks_running, color: 'text-green-600' },
    { label: '已完成', value: status.tasks_completed, color: 'text-gray-600' },
    { label: '失败', value: status.tasks_failed, color: 'text-red-600' },
    { label: '已取消', value: status.tasks_cancelled, color: 'text-gray-400' },
    { label: 'Worker 空闲', value: status.workers_idle, color: 'text-green-600' },
    { label: 'Worker 忙碌', value: status.workers_busy, color: 'text-orange-600' },
    { label: 'Worker 离线', value: status.workers_offline, color: 'text-red-400' },
    { label: '队列深度', value: status.queue_pending },
    { label: '死信数', value: status.queue_dead, color: status.queue_dead > 0 ? 'text-red-600' : '' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {cards.map(c => (
        <div key={c.label} className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500">{c.label}</div>
          <div className={`text-2xl font-bold ${c.color || 'text-gray-900'}`}>{c.value ?? '-'}</div>
        </div>
      ))}
    </div>
  );
}

function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listUsers().then(d => setUsers(d.users)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleToggleActive = async (u: User) => {
    await updateUser(u.id, { is_active: !u.is_active });
    load();
  };

  const handleQuotaUpdate = async (u: User) => {
    const conc = prompt('并发限制:', String(u.quota_concurrency));
    if (!conc) return;
    const res = prompt('分辨率限制:', String(u.quota_max_resolution));
    if (!res) return;
    const samples = prompt('采样数限制:', String(u.quota_max_samples));
    if (!samples) return;
    await updateUserQuota(u.id, {
      quota_concurrency: parseInt(conc),
      quota_max_resolution: parseInt(res),
      quota_max_samples: parseInt(samples),
    });
    load();
  };

  if (loading) return <div className="text-gray-500">加载中...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="p-2 border-b">邮箱</th>
            <th className="p-2 border-b">名称</th>
            <th className="p-2 border-b">角色</th>
            <th className="p-2 border-b">活跃</th>
            <th className="p-2 border-b">并发</th>
            <th className="p-2 border-b">分辨率</th>
            <th className="p-2 border-b">采样</th>
            <th className="p-2 border-b">操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-b hover:bg-gray-50">
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.display_name || '-'}</td>
              <td className="p-2">{u.role}</td>
              <td className="p-2">{u.is_active ? '是' : '否'}</td>
              <td className="p-2">{u.quota_concurrency}</td>
              <td className="p-2">{u.quota_max_resolution}</td>
              <td className="p-2">{u.quota_max_samples}</td>
              <td className="p-2 flex gap-2">
                <button onClick={() => handleToggleActive(u)} className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">
                  {u.is_active ? '禁用' : '启用'}
                </button>
                <button onClick={() => handleQuotaUpdate(u)} className="text-xs px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700">
                  配额
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlanManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listAdminPlans().then(d => setPlans(d.plans)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async () => {
    const name = prompt('计划名称:');
    if (!name) return;
    const slug = prompt('标识 slug:', name.toLowerCase().replace(/\s+/g, '-'));
    if (!slug) return;
    const monthly = parseInt(prompt('月价格(分):', '0') || '0');
    await createAdminPlan({ name, slug, price_monthly_cents: monthly });
    load();
  };

  const handleUpdate = async (p: Plan) => {
    const monthly = prompt('月价格(分):', String(p.price_monthly_cents));
    if (!monthly) return;
    await updateAdminPlan(p.id, { price_monthly_cents: parseInt(monthly) });
    load();
  };

  if (loading) return <div className="text-gray-500">加载中...</div>;

  return (
    <div>
      <div className="mb-4">
        <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">创建套餐</button>
      </div>
      <div className="grid gap-4">
        {plans.map(p => (
          <div key={p.id} className="border rounded-lg p-4 bg-white shadow-sm flex justify-between items-center">
            <div>
              <div className="font-medium">{p.name} <span className="text-xs text-gray-400">({p.slug})</span></div>
              <div className="text-sm text-gray-500">
                月: ¥{(p.price_monthly_cents / 100).toFixed(2)} | 年: ¥{(p.price_yearly_cents / 100).toFixed(2)}
                {!p.is_public && <span className="ml-2 text-orange-500">[非公开]</span>}
              </div>
              {p.features && <div className="text-xs text-gray-400 mt-1">{JSON.stringify(p.features)}</div>}
            </div>
            <button onClick={() => handleUpdate(p)} className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">编辑</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLog(200).then(d => setLogs(d.logs)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">加载中...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="p-2 border-b">时间</th>
            <th className="p-2 border-b">用户</th>
            <th className="p-2 border-b">操作</th>
            <th className="p-2 border-b">资源类型</th>
            <th className="p-2 border-b">资源ID</th>
            <th className="p-2 border-b">详情</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id} className="border-b hover:bg-gray-50">
              <td className="p-2 text-xs">{new Date(l.created_at).toLocaleString()}</td>
              <td className="p-2">{l.user_id?.slice(0, 8) || '-'}</td>
              <td className="p-2">{l.action}</td>
              <td className="p-2">{l.resource_type || '-'}</td>
              <td className="p-2 text-xs">{l.resource_id?.slice(0, 8) || '-'}</td>
              <td className="p-2 text-xs text-gray-500 max-w-xs truncate">{l.details || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeadLetter() {
  const [data, setData] = useState<{ dead_letter_count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    getDeadLetter().then(setData).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleReplay = async () => {
    if (!confirm('确定要重放所有死信消息吗？')) return;
    const result = await replayDeadLetter();
    setMsg(`已重放 ${result.replayed} 条消息`);
    load();
  };

  if (loading) return <div className="text-gray-500">加载中...</div>;

  return (
    <div>
      {msg && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded">{msg}</div>}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <div className="text-lg mb-2">死信队列消息数: <strong>{data?.dead_letter_count ?? 0}</strong></div>
        <button
          onClick={handleReplay}
          disabled={!data?.dead_letter_count}
          className="px-4 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50"
        >重放所有消息</button>
      </div>
    </div>
  );
}
