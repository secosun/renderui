import { useState, useEffect } from 'react';
import axios from 'axios';
import { listUserScenes, createScene, updateScene, deleteScene, type SceneDetail } from '../api/client';

interface EngineScene {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

export function Scenes() {
  const [scenes, setScenes] = useState<SceneDetail[]>([]);
  const [engineScenes, setEngineScenes] = useState<EngineScene[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('custom');
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      listUserScenes(),
      axios.get('/api/scenes-engine').then(r => r.data.scenes || []).catch(() => []),
    ]).then(([scenesRes, engineScenesRes]) => {
      setScenes(scenesRes.scenes);
      setEngineScenes(engineScenesRes);
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createScene({ name, description, category, params: {} });
    setName(''); setDescription(''); setCategory('custom');
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此场景？')) return;
    await deleteScene(id);
    load();
  };

  const handleDuplicate = async (s: SceneDetail) => {
    await createScene({
      name: `${s.name} (副本)`,
      description: s.description,
      category: s.category,
      params: s.params,
    });
    load();
  };

  if (loading) return <div className="text-gray-500">加载中...</div>;

  const systemScenes = scenes.filter(s => s.is_system);
  const customScenes = scenes.filter(s => !s.is_system);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">场景管理</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
          {showForm ? '取消' : '创建自定义场景'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-gray-50 border rounded-lg p-4">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">场景名称</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="我的自定义场景" className="w-full p-2 border rounded text-sm" />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="场景描述..." className="w-full p-2 border rounded text-sm" rows={2} />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="p-2 border rounded text-sm bg-white">
              <option value="custom">自定义</option>
              <option value="studio">工作室</option>
              <option value="outdoor">户外</option>
              <option value="closeup">特写</option>
            </select>
          </div>
          <button onClick={handleCreate} disabled={!name.trim()} className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50">创建</button>
        </div>
      )}

      {customScenes.length > 0 && (
        <div className="mb-8">
          <h2 className="font-medium mb-3 text-gray-700">我的自定义场景</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {customScenes.map(s => (
              <div key={s.id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.category}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleDuplicate(s)} className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200" title="复制">复制</button>
                    <button onClick={() => handleDelete(s.id)} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100">删除</button>
                  </div>
                </div>
                {s.description && <div className="text-xs text-gray-500 mb-2">{s.description}</div>}
                <div className="text-xs text-gray-400">
                  参数: {Object.keys(s.params || {}).length > 0 ? Object.entries(s.params || {}).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(', ') : '默认'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-medium mb-3 text-gray-700">视觉场景</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {engineScenes.map(s => (
          <div key={s.id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1">
              <div className="font-medium">{s.name}</div>
              <div className="flex gap-1">
                {s.tags?.map(t => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{t}</span>
                ))}
              </div>
            </div>
            {s.description && <div className="text-xs text-gray-500">{s.description}</div>}
            <div className="mt-2 text-xs text-gray-400 font-mono">{s.id}</div>
          </div>
        ))}
        {systemScenes.map(s => (
          <div key={s.id} className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="font-medium">{s.name}</div>
            <div className="text-xs text-gray-400 mb-1">{s.category}</div>
            {s.description && <div className="text-xs text-gray-500">{s.description}</div>}
            <div className="mt-2 text-xs text-gray-300">旧版预设</div>
          </div>
        ))}
      </div>
    </div>
  );
}
