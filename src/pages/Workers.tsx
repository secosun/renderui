import { useState, useEffect } from 'react';
import { listWorkers, type WorkerInfo } from '../api/client';

export function Workers() {
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [capacity, setCapacity] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listWorkers().then(d => {
      setWorkers(d.workers);
      setCapacity(d.available_capacity);
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const statusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-blue-100 text-blue-800';
      case 'offline': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'idle': return '空闲';
      case 'busy': return '忙碌';
      case 'offline': return '离线';
      default: return status;
    }
  };

  if (loading) return <div className="text-gray-500">加载中...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Worker 监控</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500">总数</div>
          <div className="text-2xl font-bold">{workers.length}</div>
        </div>
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500">空闲</div>
          <div className="text-2xl font-bold text-green-600">{workers.filter(w => w.status === 'idle').length}</div>
        </div>
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500">忙碌</div>
          <div className="text-2xl font-bold text-blue-600">{workers.filter(w => w.status === 'busy').length}</div>
        </div>
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500">可用容量</div>
          <div className="text-2xl font-bold text-indigo-600">{capacity}</div>
        </div>
      </div>

      {workers.length === 0 ? (
        <div className="text-gray-400 text-center py-12">暂无注册的 Worker</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-2 border-b">标签</th>
                <th className="p-2 border-b">主机名</th>
                <th className="p-2 border-b">GPU</th>
                <th className="p-2 border-b">状态</th>
                <th className="p-2 border-b">并发</th>
                <th className="p-2 border-b">当前任务</th>
                <th className="p-2 border-b">最后心跳</th>
                <th className="p-2 border-b">注册时间</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(w => (
                <tr key={w.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{w.label || '-'}</td>
                  <td className="p-2 text-xs">{w.hostname || '-'}</td>
                  <td className="p-2 text-xs">{w.gpu_device || '-'}</td>
                  <td className="p-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(w.status)}`}>
                      {statusLabel(w.status)}
                    </span>
                  </td>
                  <td className="p-2">{w.concurrency}</td>
                  <td className="p-2 text-xs">{w.current_task_id ? w.current_task_id.slice(0, 8) + '...' : '-'}</td>
                  <td className="p-2 text-xs">{new Date(w.last_heartbeat).toLocaleString()}</td>
                  <td className="p-2 text-xs">{new Date(w.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
