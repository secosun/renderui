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

const ALL_STATUSES = ['', 'pending', 'ready', 'queued', 'running', 'completed', 'failed', 'cancelled'];

export function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState('');

  const load = () => {
    setLoading(true);
    listTasks(100, 0).then(({ tasks, total }) => {
      setTasks(tasks);
      setTotal(total);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Filter tasks by search text and status
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(t => t.id)));
    }
  };

  const handleBatchCancel = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定取消选中的 ${selectedIds.size} 个任务？`)) return;
    setBatchLoading('cancel');
    for (const id of selectedIds) {
      try { await cancelTask(id); } catch { /* ignore */ }
    }
    setSelectedIds(new Set());
    load();
    setBatchLoading('');
  };

  const handleBatchRetry = () => {
    const failedIds = [...selectedIds].filter(id => {
      const t = tasks.find(tt => tt.id === id);
      return t?.status === 'failed';
    });
    if (failedIds.length === 0) return;
    // Navigate to new task page for the first failed task's model
    const first = tasks.find(t => t.id === failedIds[0]);
    if (first) {
      navigate('/new');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const selectedCount = selectedIds.size;
  const failedCount = [...selectedIds].filter(id => tasks.find(t => t.id === id)?.status === 'failed').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">渲染任务</h1>
        <Link to="/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
          + 新建任务
        </Link>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜索任务名称 / 模型ID / 场景..."
          className="flex-1 min-w-[200px] p-2 border rounded-lg text-sm"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="p-2 border rounded-lg text-sm bg-white"
        >
          <option value="">全部状态</option>
          {ALL_STATUSES.filter(Boolean).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
          ))}
        </select>

        {/* Batch actions */}
        {selectedCount > 0 && (
          <div className="flex gap-2 items-center text-sm">
            <span className="text-gray-500">已选 {selectedCount} 项</span>
            <button
              onClick={handleBatchCancel}
              disabled={!!batchLoading}
              className="px-3 py-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 disabled:opacity-50"
            >取消选中</button>
            {failedCount > 0 && (
              <button onClick={handleBatchRetry} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                重试失败任务
              </button>
            )}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">📦</p>
          <p className="text-lg">{search || filterStatus ? '没有匹配的任务' : '暂无渲染任务'}</p>
          {!search && !filterStatus && (
            <Link to="/new" className="text-blue-600 hover:underline mt-2 inline-block">创建第一个任务</Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="w-8 px-2 py-3">
                  <input type="checkbox" onChange={toggleSelectAll}
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    className="rounded" />
                </th>
                <th className="text-left px-4 py-3">任务名称</th>
                <th className="text-left px-4 py-3">模型</th>
                <th className="text-left px-4 py-3">场景/描述</th>
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
                  <td className="px-4 py-3 font-mono text-xs">{t.model_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 max-w-[200px] truncate">{t.scene_name || t.prompt?.slice(0, 30) || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[t.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.status === 'running' ? `${Math.round(t.progress * 100)}%` : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(t.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 flex gap-1">
                    <Link to={`/tasks/${t.id}`} className="text-blue-600 hover:underline text-xs px-2 py-1">详情</Link>
                    {t.status === 'failed' && (
                      <button onClick={() => navigate('/new')} className="text-orange-600 hover:underline text-xs px-2 py-1">重试</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 text-sm text-gray-500 border-t flex justify-between">
            <span>显示 {filtered.length} / 共 {total} 条</span>
            {search || filterStatus ? (
              <button onClick={() => { setSearch(''); setFilterStatus(''); }} className="text-blue-600 hover:underline">清除筛选</button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
