import { useState, useEffect } from 'react';
import axios from 'axios';

interface EngineScene {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

export function Scenes() {
  const [engineScenes, setEngineScenes] = useState<EngineScene[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>(() => localStorage.getItem('preferred_scene') || 'studio_neutral');

  useEffect(() => {
    axios.get('/api/scenes-engine')
      .then(r => setEngineScenes(r.data.scenes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (id: string) => {
    setSelected(id);
    localStorage.setItem('preferred_scene', id);
  };

  const tagColors: Record<string, string> = {
    studio: 'bg-blue-50 text-blue-600',
    outdoor: 'bg-green-50 text-green-600',
    通用: 'bg-gray-50 text-gray-600',
    亮色: 'bg-yellow-50 text-yellow-700',
    深色: 'bg-purple-50 text-purple-700',
    金属: 'bg-orange-50 text-orange-700',
    柔光: 'bg-pink-50 text-pink-600',
    自然光: 'bg-emerald-50 text-emerald-600',
    暖色: 'bg-amber-50 text-amber-700',
  };

  if (loading) return <div className="text-center py-12 text-gray-400">加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">场景管理</h1>
        <p className="text-sm text-gray-500">选择渲染场景，场景定义了灯光、背景、后期风格。当前选择自动保存。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {engineScenes.map(s => {
          const isSelected = selected === s.id;
          return (
            <button key={s.id} onClick={() => handleSelect(s.id)}
              className={`text-left rounded-xl p-5 border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className={`font-semibold ${isSelected ? 'text-blue-800' : 'text-gray-900'}`}>
                    {s.name}
                    {isSelected && <span className="ml-2 text-xs px-2 py-0.5 bg-blue-600 text-white rounded-full">已选</span>}
                  </div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">{s.id}</div>
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-3">{s.description}</div>
              <div className="flex gap-1.5 flex-wrap">
                {s.tags?.map(t => (
                  <span key={t} className={`text-[10px] px-2 py-0.5 rounded ${tagColors[t] || 'bg-gray-50 text-gray-500'}`}>
                    {t}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
