import { useEffect, useState } from 'react';
import { listApiKeys, createApiKey, revokeApiKey, type ApiKey } from '../api/client';

export function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [label, setLabel] = useState('');

  const load = () => { setLoading(true); listApiKeys().then(setKeys).finally(() => setLoading(false)); };
  useEffect(load, []);

  const handleCreate = async () => {
    try {
      const key = await createApiKey(label);
      setNewKey(key);
      setLabel('');
      load();
    } catch (err) {
      alert('创建失败');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('确定吊销此 API 密钥？此操作不可撤销。')) return;
    try {
      await revokeApiKey(id);
      load();
    } catch (err) {
      alert('吊销失败');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">API 密钥管理</h1>

      {/* Show newly created key */}
      {newKey && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
          <p className="text-sm font-medium text-yellow-800">新密钥已创建 — 请立即复制，关闭后将不再显示：</p>
          <p className="font-mono text-sm bg-white p-2 rounded border mt-2 select-all">{newKey.full_key}</p>
          <button onClick={() => setNewKey(null)} className="text-sm text-yellow-700 hover:underline mt-2">已复制，关闭</button>
        </div>
      )}

      {/* Create new key */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">创建新密钥</h2>
        <div className="flex gap-3">
          <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="标签（可选）" maxLength={100}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          <button onClick={handleCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">创建</button>
        </div>
      </div>

      {/* Key list */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-6 text-center text-gray-400">加载中...</div>
        ) : keys.length === 0 ? (
          <div className="p-6 text-center text-gray-400">暂无 API 密钥</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">标签</th>
                <th className="text-left px-4 py-3">密钥前缀</th>
                <th className="text-left px-4 py-3">状态</th>
                <th className="text-left px-4 py-3">最后使用</th>
                <th className="text-left px-4 py-3">创建时间</th>
                <th className="text-left px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {keys.map(k => (
                <tr key={k.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{k.label || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{k.key_prefix}...</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${k.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {k.is_active ? '启用' : '已吊销'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{k.last_used_at ? new Date(k.last_used_at).toLocaleString('zh-CN') : '从未'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(k.created_at).toLocaleString('zh-CN')}</td>
                  <td className="px-4 py-3">
                    {k.is_active && (
                      <button onClick={() => handleRevoke(k.id)} className="text-red-600 hover:underline text-xs">吊销</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
