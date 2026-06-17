import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTask, dispatchTask, cancelTask, cloneTask, connectTaskWS, type Task } from '../api/client';
import { ModelViewer } from '../components/ModelViewer';

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700', ready: 'bg-blue-100 text-blue-700',
  queued: 'bg-yellow-100 text-yellow-700', running: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '待处理', ready: '已就绪', queued: '队列中',
  running: '渲染中', completed: '已完成', failed: '失败', cancelled: '已取消',
};

const RENDER_STAGES = [
  { key: 'importing', label: '导入模型', icon: '📦' },
  { key: 'setup', label: '场景设置', icon: '🎬' },
  { key: 'materials', label: '材质处理', icon: '🎨' },
  { key: 'final', label: '最终渲染', icon: '✨' },
  { key: 'export', label: '导出结果', icon: '📥' },
];

function ProgressTimeline({ stageName, stageProgress, etaSeconds }: { stageName?: string; stageProgress?: number; etaSeconds?: number }) {
  const currentIdx = RENDER_STAGES.findIndex(s => s.key === stageName);

  return (
    <div className="mt-4 space-y-1">
      {RENDER_STAGES.map((stage, i) => {
        const isPast = currentIdx > i || (!stageName && i === 0);
        const isCurrent = stage.key === stageName;
        return (
          <div key={stage.key} className={`flex items-center gap-3 py-1.5 ${isCurrent ? 'text-blue-700' : isPast ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0
              ${isPast ? 'bg-green-100 text-green-600' :
                isCurrent ? 'bg-blue-100 border-2 border-blue-500 text-blue-600' :
                'bg-gray-100 text-gray-400'}`}>
              {isPast ? '✓' : <span className="text-xs">{stage.icon}</span>}
            </div>
            <span className="text-sm font-medium">{stage.label}</span>
            {isCurrent && stageProgress !== undefined && (
              <span className="text-xs ml-auto">{Math.round(stageProgress * 100)}%</span>
            )}
          </div>
        );
      })}
      {etaSeconds !== undefined && etaSeconds > 0 && (
        <p className="text-xs text-gray-500 mt-2 text-right">
          预计剩余: {Math.floor(etaSeconds / 60)} 分 {etaSeconds % 60} 秒
        </p>
      )}
    </div>
  );
}

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    if (!id) return;
    getTask(id).then(t => {
      setTask(t);
      if (['pending', 'ready', 'queued', 'running'].includes(t.status)) {
        connectTaskWS(id, (ev) => {
          if (ev.type === 'status') setTask(ev as Task);
        });
      }
    }).catch(() => setError('任务不存在')).finally(() => setLoading(false));
  }, [id]);

  const handleDispatch = async () => {
    if (!id) return;
    setActionLoading('dispatch');
    try {
      const t = await dispatchTask(id);
      setTask(t);
    } catch (err: any) {
      setError(err.response?.data?.detail || '投递失败');
    } finally {
      setActionLoading('');
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    setActionLoading('cancel');
    try {
      const t = await cancelTask(id);
      setTask(t);
    } catch (err: any) {
      setError(err.response?.data?.detail || '取消失败');
    } finally {
      setActionLoading('');
    }
  };

  const handleClone = async () => {
    if (!id) return;
    setActionLoading('clone');
    try {
      const t = await cloneTask(id);
      navigate(`/tasks/${t.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || '克隆失败');
    } finally {
      setActionLoading('');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (!task) return <div className="text-center py-12 text-gray-400">{error || '任务不存在'}</div>;

  const hasMultipleResults = task.result_urls && task.result_urls.length > 1;

  return (
    <div>
      <Link to="/my-tasks" className="text-blue-600 hover:underline text-sm mb-4 inline-block">&larr; 返回任务列表</Link>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">任务详情</h1>
          <span className={`px-3 py-1 rounded text-sm font-medium ${STATUS_BADGES[task.status]}`}>
            {STATUS_LABELS[task.status] || task.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          {task.name && <div className="col-span-2"><span className="text-gray-500">任务名称</span><p className="font-medium mt-0.5">{task.name}</p></div>}
          <div><span className="text-gray-500">任务 ID</span><p className="font-mono text-xs mt-0.5">{task.id}</p></div>
          <div><span className="text-gray-500">模型 ID</span><p className="font-mono text-xs mt-0.5">{task.model_id || task.intent_json?.template_id || task.intent_json?.model_path?.split('/').pop()?.slice(0, 12) || '-'}</p></div>
          <div><span className="text-gray-500">场景</span><p>{task.scene_name || task.intent_json?.scene_name || '-'}</p></div>
          {task.intent_json?.model_path && (
            <div className="col-span-2"><span className="text-gray-500">OBJ 文件</span><p className="font-mono text-xs mt-0.5">{task.intent_json.model_path.split('/').pop()}</p></div>
          )}
          <div><span className="text-gray-500">描述</span><p>{task.prompt || '-'}</p></div>
          <div><span className="text-gray-500">创建时间</span><p>{new Date(task.created_at).toLocaleString('zh-CN')}</p></div>
          <div><span className="text-gray-500">更新时间</span><p>{new Date(task.updated_at).toLocaleString('zh-CN')}</p></div>
          {task.retry_count !== undefined && task.retry_count > 0 && (
            <div className="col-span-2"><span className="text-gray-500">重试次数</span><p className="text-orange-600">{task.retry_count}</p></div>
          )}
        </div>

        {/* Progress bar for running tasks */}
        {task.status === 'running' && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">{task.progress_message || '渲染中...'}</span>
              <span className="text-gray-700 font-medium">{Math.round(task.progress * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                   style={{ width: `${Math.round(task.progress * 100)}%` }} />
            </div>
          </div>
        )}

        {/* Stage Timeline — visible during rendering or when stage data available */}
        {(task.status === 'running' || task.stage_name) && (
          <ProgressTimeline
            stageName={task.stage_name}
            stageProgress={task.stage_progress}
            etaSeconds={task.eta_seconds}
          />
        )}

        {/* Error */}
        {task.error_message && (
          <div className="mt-4 bg-red-50 text-red-700 p-3 rounded text-sm">{task.error_message}</div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6 flex-wrap">
          {(task.status === 'pending' || task.status === 'ready') && (
            <button onClick={handleDispatch} disabled={!!actionLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
              {actionLoading === 'dispatch' ? '投递中...' : '投递渲染'}
            </button>
          )}
          {['pending', 'ready', 'queued', 'running'].includes(task.status) && (
            <button onClick={handleCancel} disabled={!!actionLoading}
              className="bg-red-50 text-red-700 px-4 py-2 rounded hover:bg-red-100 disabled:opacity-50 text-sm">
              {actionLoading === 'cancel' ? '取消中...' : '取消任务'}
            </button>
          )}
          {task.status === 'failed' && (
            <button onClick={handleClone} disabled={!!actionLoading}
              className="bg-orange-50 text-orange-700 px-4 py-2 rounded hover:bg-orange-100 disabled:opacity-50 text-sm">
              {actionLoading === 'clone' ? '克隆中...' : '重试 (克隆)'}
            </button>
          )}
          {task.status === 'completed' && (
            <button onClick={handleClone} disabled={!!actionLoading}
              className="bg-blue-50 text-blue-700 px-4 py-2 rounded hover:bg-blue-100 disabled:opacity-50 text-sm">
              {actionLoading === 'clone' ? '克隆中...' : '克隆此任务'}
            </button>
          )}
        </div>
      </div>

      {/* Multi-angle Result Gallery */}
      {hasMultipleResults && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">渲染结果 ({task.result_urls!.length} 个角度)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {task.result_urls!.map((url, i) => (
              <div key={i} className="flex flex-col items-center gap-2 bg-gray-50 rounded-lg p-3">
                <img src={url} alt={`渲染结果 ${i+1}`}
                     className="w-full rounded-lg shadow" />
                <a href={url} target="_blank" rel="noopener noreferrer"
                   className="text-blue-600 hover:underline text-xs">下载原图</a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single result */}
      {task.result_url && !hasMultipleResults && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">渲染结果</h2>
          <div className="flex flex-col items-center gap-4">
            <img src={task.result_url} alt="渲染结果"
                 className="max-w-full max-h-[600px] rounded-lg shadow" />
            <a href={task.result_url} target="_blank" rel="noopener noreferrer"
               className="text-blue-600 hover:underline text-sm">下载原图</a>
          </div>
        </div>
      )}

      {/* 3D Preview — show if there's a 3D model URL available */}
      {task.status === 'completed' && task.intent_json?.model_path && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-2">3D 预览</h2>
          <p className="text-xs text-gray-500 mb-3">可交互的 3D 模型预览，拖拽旋转查看</p>
          <div className="aspect-[4/3] bg-gray-50 rounded-lg overflow-hidden">
            <ModelViewer
              src={`/uploads/${task.intent_json.model_path.replace(/^\//, '')}`}
              alt={`${task.name || task.id} 3D 模型`}
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {/* Intent JSON */}
      {task.intent_json && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-lg font-bold mb-2">渲染参数 (Intent)</h2>
          <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto">{JSON.stringify(task.intent_json, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
