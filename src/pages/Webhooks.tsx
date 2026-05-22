import { useState, useEffect } from 'react';
import { listWebhooks, createWebhook, updateWebhook, deleteWebhook, type Webhook } from '../api/client';

export function Webhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['task.completed']);
  const [secret, setSecret] = useState('');

  const allEvents = ['task.completed', 'task.failed', 'task.progress'];

  const load = () => {
    setLoading(true);
    listWebhooks().then(setWebhooks).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async () => {
    if (!url) return;
    await createWebhook(url, events, secret || undefined);
    setUrl(''); setEvents(['task.completed']); setSecret(''); setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此 Webhook？')) return;
    await deleteWebhook(id);
    load();
  };

  const handleToggle = async (wh: Webhook) => {
    await updateWebhook(wh.id, { is_active: !wh.is_active });
    load();
  };

  const toggleEvent = (e: string) => {
    setEvents(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  };

  if (loading) return <div className="text-gray-500">加载中...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Webhook 管理</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
          {showForm ? '取消' : '添加 Webhook'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-gray-50 border rounded-lg p-4">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/webhook" className="w-full p-2 border rounded text-sm" />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">事件</label>
            <div className="flex gap-3">
              {allEvents.map(e => (
                <label key={e} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={events.includes(e)} onChange={() => toggleEvent(e)} />
                  {e}
                </label>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Secret (可选，留空自动生成)</label>
            <input value={secret} onChange={e => setSecret(e.target.value)} placeholder="自定义 HMAC 密钥" className="w-full p-2 border rounded text-sm" />
          </div>
          <button onClick={handleCreate} disabled={!url || events.length === 0} className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50">创建</button>
        </div>
      )}

      {webhooks.length === 0 ? (
        <div className="text-gray-400 text-center py-12">暂无 Webhook，点击上方按钮添加</div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(wh => (
            <div key={wh.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium break-all">{wh.url}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    事件: {wh.events.join(', ')} | 活跃: {wh.is_active ? '是' : '否'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">创建于 {new Date(wh.created_at).toLocaleString()}</div>
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
                  <button onClick={() => handleToggle(wh)} className={`text-xs px-3 py-1 rounded ${wh.is_active ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                    {wh.is_active ? '暂停' : '启用'}
                  </button>
                  <button onClick={() => handleDelete(wh.id)} className="text-xs px-3 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100">删除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
