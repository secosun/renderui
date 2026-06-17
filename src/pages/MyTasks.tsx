import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listTasks, cancelTask, type Task } from '../api/client';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  ready: 'bg-blue-100 text-blue-700',
  queued: 'bg-yellow-100 text-yellow-700',
  running: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '待处理', ready: '已就绪', queued: '队列中',
  running: '渲染中', completed: '已完成', failed: '失败', cancelled: '已取消',
};

export function MyTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = () => {
    setLoading(true);
    listTasks(100, 0).then(({ tasks, total }) => {
      setTasks(tasks);
      setTotal(total);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    let result = tasks;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        (t.name || '').toLowerCase().includes(q) ||
        t.model_id.toLowerCase().includes(q) ||
        (t.scene_name || '').toLowerCase().includes(q) ||
        (t.prompt || '').toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    }
    if (filterStatus) {
      result = result.filter(t => t.status === filterStatus);
    }
    return result;
  }, [tasks, search, filterStatus]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBatchCancel = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定取消选中的 ${selectedIds.size} 个任务？`)) return;
    for (const id of selectedIds) {
      try { await cancelTask(id); } catch { /* ignore */ }
    }
    setSelectedIds(new Set());
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">我的任务</h1>
          <p className="text-sm text-gray-500 mt-1">查看和管理你的渲染任务</p>
        </div>
        <Link to="/" className="text-blue-600 hover:underline text-sm">← 返回模型库</Link>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜索任务..."
          className="flex-1 min-w-[200px] p-2 border rounded-lg text-sm"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="p-2 border rounded-lg text-sm bg-white"
        >
          <option value="">全部状态</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {selectedIds.size > 0 && (
          <button onClick={handleBatchCancel}
            className="px-3 py-1.5 bg-red-50 text-red-700 rounded text-sm hover:bg-red-100">
            取消选中 ({selectedIds.size})
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>{search || filterStatus ? '没有匹配的任务' : '暂无渲染任务'}</p>
          <Link to="/" className="text-blue-600 hover:underline mt-2 inline-block text-sm">去模型库创建 →</Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="w-8 px-2 py-3">
                  <input type="checkbox"
                    onChange={() => {
                      if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                      else setSelectedIds(new Set(filtered.map(t => t.id)));
                    }}
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    className="rounded" />
                </th>
                <th className="text-left px-4 py-3">任务</th>
                <th className="text-left px-4 py-3">场景</th>
                <th className="text-left px-4 py-3">状态</th>
                <th className="text-left px-4 py-3">进度</th>
                <th className="text-left px-4 py-3">创建时间</th>
                <th className="text-left px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(t => (
                <tr key={t.id} className={`hover:bg-gray-50 ${selectedIds.has(t.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-2 py-3">
                    <input type="checkbox" checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelect(t.id)} className="rounded" />
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/tasks/${t.id}`} className="text-blue-700 hover:underline">
                      {t.name || t.id.slice(0, 8) + '...'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-gray-600">
                    {t.scene_name || t.prompt?.slice(0, 30) || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[t.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {t.status === 'running' ? `${Math.round(t.progress * 100)}%` : '-'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(t.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/tasks/${t.id}`} className="text-blue-600 hover:underline text-xs">详情</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 text-sm text-gray-500 border-t flex justify-between">
            <span>显示 {filtered.length} / 共 {total} 条</span>
            {(search || filterStatus) && (
              <button onClick={() => { setSearch(''); setFilterStatus(''); }}
                className="text-blue-600 hover:underline">清除筛选</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
