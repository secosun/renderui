import { useEffect, useState } from 'react';
import axios from 'axios';

interface CategoryMapping {
  category_key: string;
  finish_id: string;
  overridden: boolean;
}

interface Finish {
  id: string;
  label_zh: string;
  principled: { base_color: number[] };
}

export function AdminCategoryFinishes() {
  const [mappings, setMappings] = useState<CategoryMapping[]>([]);
  const [finishes, setFinishes] = useState<Finish[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, setPending] = useState<string>('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      axios.get('/api/category-finishes'),
      axios.get('/api/finishes'),
    ]).then(([mr, fr]) => {
      setMappings(mr.data.mappings || []);
      setFinishes(fr.data.finishes || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleEdit = (key: string, current: string) => {
    setEditing(key);
    setPending(current);
  };

  const handleSave = async (key: string) => {
    if (!pending) return;
    try {
      await axios.put(`/api/category-finishes/${key}`, { finish_id: pending });
      setMappings(prev => prev.map(m =>
        m.category_key === key ? { ...m, finish_id: pending, overridden: true } : m
      ));
      setEditing(null);
      setMsg(`已更新：${key} → ${pending}`);
      setTimeout(() => setMsg(''), 3000);
    } catch (err: any) {
      setMsg('保存失败: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleReset = async (key: string) => {
    try {
      await axios.delete(`/api/category-finishes/${key}`);
      // Reload defaults
      const mr = await axios.get('/api/category-finishes');
      setMappings(mr.data.mappings || []);
      setMsg(`已重置：${key}`);
      setTimeout(() => setMsg(''), 3000);
    } catch (err: any) {
      setMsg('重置失败: ' + (err.response?.data?.detail || err.message));
    }
  };

  const colorSwatch = (c: number[]) => {
    const r = Math.round((c?.[0] || 0) * 255);
    const g = Math.round((c?.[1] || 0) * 255);
    const b = Math.round((c?.[2] || 0) * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const finishName = (id: string) => {
    const f = finishes.find(f => f.id === id);
    return f?.label_zh || id;
  };

  const finishColor = (id: string) => {
    const f = finishes.find(f => f.id === id);
    if (!f?.principled?.base_color) return '#ccc';
    const bc = f.principled.base_color;
    return colorSwatch(bc);
  };

  if (loading) return <div className="text-center py-12 text-gray-400">加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">产品分类材质映射</h1>
      </div>

      {msg && <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-sm rounded">{msg}</div>}

      <p className="text-sm text-gray-500 mb-4">
        为每个产品分类指定默认材质（finish）。修改后重新提交任务即生效。
      </p>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-3 border-b font-medium text-gray-600">分类</th>
              <th className="p-3 border-b font-medium text-gray-600">当前材质</th>
              <th className="p-3 border-b font-medium text-gray-600">状态</th>
              <th className="p-3 border-b font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map(m => (
              <tr key={m.category_key} className="border-b hover:bg-gray-50">
                <td className="p-3 font-mono text-xs">{m.category_key}</td>
                <td className="p-3">
                  {editing === m.category_key ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={pending}
                        onChange={e => setPending(e.target.value)}
                        className="text-xs border rounded px-2 py-1"
                      >
                        {finishes.map(f => (
                          <option key={f.id} value={f.id}>{f.label_zh}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleSave(m.category_key)}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >保存</button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-2 py-1 bg-gray-100 text-xs rounded hover:bg-gray-200"
                      >取消</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full inline-block border"
                            style={{ background: finishColor(m.finish_id) }} />
                      <span>{finishName(m.finish_id)}</span>
                    </div>
                  )}
                </td>
                <td className="p-3">
                  {m.overridden
                    ? <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded">自定义</span>
                    : <span className="text-xs px-2 py-0.5 bg-gray-50 text-gray-400 rounded">默认</span>
                  }
                </td>
                <td className="p-3">
                  {editing !== m.category_key && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(m.category_key, m.finish_id)}
                        className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                      >编辑</button>
                      {m.overridden && (
                        <button
                          onClick={() => handleReset(m.category_key)}
                          className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                        >重置</button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
