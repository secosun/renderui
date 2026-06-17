import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export function BatchRender() {
  const navigate = useNavigate();
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ count: number; task_ids: string[] } | null>(null);

  const handleSubmit = async () => {
    setError('');
    setResult(null);

    // Parse CSV: template_id, param1, param2, ..., scene_id, name
    const lines = csvText.trim().split('\n').filter(Boolean);
    if (lines.length < 2) {
      setError('CSV 至少需要标题行和一行数据');
      return;
    }
    if (lines.length > 101) {
      setError('最多支持 100 个任务');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const tasks: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim());
      const task: Record<string, any> = { template_params: {} };

      for (let j = 0; j < headers.length; j++) {
        const h = headers[j];
        const v = vals[j] || '';
        if (h === 'template_id') task.template_id = v;
        else if (h === 'scene_id') task.scene_id = v;
        else if (h === 'name') task.name = v;
        else task.template_params[h] = isNaN(Number(v)) ? v : Number(v);
      }

      if (!task.template_id) {
        setError(`第 ${i + 1} 行缺少 template_id`);
        return;
      }
      tasks.push(task);
    }

    if (tasks.length > 100) {
      setError('最多支持 100 个任务');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/tasks/batch', { tasks });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || '批量创建失败');
    }
    setLoading(false);
  };

  const csvTemplate = `template_id,length,width,height,scene_id,name
56638f07-62f3-4580-8bf8-edc137f03fba,100,60,40,studio_champagne,立方体 100x60x40
56638f07-62f3-4580-8bf8-edc137f03fba,200,80,50,studio_champagne,立方体 200x80x50
0a752848-f604-47fa-9322-3212caffd77d,80,120,,studio_black_matte,圆柱体 80x120`;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">批量渲染</h1>
      <p className="text-gray-500 mb-6">通过 CSV 批量创建和提交渲染任务</p>

      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">CSV 格式说明</h2>
        <p className="text-xs text-gray-500 mb-3">
          第一行为标题列，支持的列：<code className="text-blue-600">template_id</code>（必填）、<code className="text-blue-600">scene_id</code>、<code className="text-blue-600">name</code>，其余列自动作为参数
        </p>
        <pre className="bg-gray-50 p-3 rounded text-xs font-mono text-gray-600 overflow-x-auto">{csvTemplate}</pre>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

      {result ? (
        <div className="bg-green-50 text-green-700 p-5 rounded-lg mb-6">
          <p className="font-medium mb-2">✅ 成功创建 {result.count} 个渲染任务</p>
          <div className="flex flex-wrap gap-2">
            {result.task_ids.map(id => (
              <button key={id} onClick={() => navigate(`/tasks/${id}`)}
                className="text-xs bg-green-100 px-2 py-1 rounded hover:bg-green-200">
                {id.slice(0, 8)}...
              </button>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CSV 数据</label>
            <textarea value={csvText} onChange={e => setCsvText(e.target.value)}
              placeholder={csvTemplate} rows={10}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">每行一个任务，最多 100 行</p>
          </div>
          <button type="submit" disabled={loading || !csvText.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {loading ? '创建中...' : '批量创建并提交'}
          </button>
        </form>
      )}
    </div>
  );
}
