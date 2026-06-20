import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ParamField } from '../components/ParamField';
import { ColorPicker } from '../components/ColorPicker';
import { FinishPicker } from '../components/FinishPicker';
import type { CatalogColor, Finish } from '../api/client';

export function NewTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('template');

  const [templates, setTemplates] = useState<any[]>([]);
  const [scenes, setScenes] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, number | string>>({});
  const [sceneId, setSceneId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  // Color/finish state
  const [colorCatalog, setColorCatalog] = useState<Record<string, CatalogColor>>({});
  const [colorSeries, setColorSeries] = useState<Record<string, string>>({});
  const [allFinishes, setAllFinishes] = useState<Finish[]>([]);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedFinish, setSelectedFinish] = useState('');

  // Fetch templates and scenes
  useEffect(() => {
    axios.get('/api/freecad/templates?limit=50')
      .then(res => {
        const list = res.data.templates || [];
        setTemplates(list);
        if (preselectedId) {
          const found = list.find((t: any) => t.id === preselectedId);
          if (found) selectTemplate(found);
        }
      })
      .catch(() => {});
    axios.get('/api/scenes')
      .then(res => setScenes(res.data.scenes || res.data || []))
      .catch(() => {});

    // Fetch color catalog and finishes
    axios.get('/api/colors')
      .then(res => {
        setColorCatalog(res.data.colors || {});
        setColorSeries(res.data.series || {});
      })
      .catch(() => {});
    axios.get('/api/finishes')
      .then(res => setAllFinishes(res.data.finishes || []))
      .catch(() => {});
  }, [preselectedId]);

  const categories = useMemo(() =>
    Array.from(new Set(templates.map((t: any) => t.category))).sort(),
  [templates]);

  const filteredTemplates = useMemo(() =>
    templates.filter((t: any) => {
      if (activeCategory && t.category !== activeCategory) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q)
        || t.description?.toLowerCase().includes(q)
        || t.tags?.some((tag: string) => tag.toLowerCase().includes(q));
    }),
  [templates, searchQuery, activeCategory]);

  const defaultSceneId = scenes[0]?.id || '';

  const selectTemplate = (template: any) => {
    setSelectedTemplate(template);
    const defaults: Record<string, number | string> = {};
    if (template.params_schema?.properties) {
      for (const [key, param] of Object.entries(template.params_schema.properties as any)) {
        if ((param as any).default !== undefined) {
          defaults[key] = (param as any).default as number | string;
        }
      }
    }
    setParamValues(defaults);
    setSceneId(defaultSceneId);
    setError('');

    // Init color/finish — use template bindings if set, otherwise fallback to catalog defaults
    const availColors = template.available_colors || Object.keys(colorCatalog);
    const availFinishes = template.available_finishes || allFinishes.map((f: any) => f.id);
    setSelectedColor(availColors[0] || '');
    setSelectedFinish(availFinishes[0] || '');
  };

  const handleParamChange = (key: string, value: string) => {
    const param = selectedTemplate?.params_schema?.properties?.[key];
    const parsed = param?.type === 'number' || param?.type === 'integer'
      ? Number(value) : value;
    setParamValues(prev => ({ ...prev, [key]: parsed }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedTemplate) { setError('请选择产品模板'); return; }
    setLoading(true);
    try {
      const res = await axios.post('/api/tasks', {
        template_id: selectedTemplate.id,
        template_params: paramValues,
        scene_id: sceneId || defaultSceneId || undefined,
        prompt: prompt || undefined,
        name: `${selectedTemplate.name} - ${new Date().toLocaleDateString()}`,
        catalog_color: selectedColor || undefined,
        surface_finish: selectedFinish || undefined,
      });
      navigate(`/tasks/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || '创建任务失败');
    } finally {
      setLoading(false);
    }
  };

  // Determine which colors/finishes are available for this template
  const availableColorKeys = selectedTemplate?.available_colors?.length
    ? selectedTemplate.available_colors
    : Object.keys(colorCatalog);
  const availableFinishIds = selectedTemplate?.available_finishes?.length
    ? selectedTemplate.available_finishes
    : allFinishes.map(f => f.id);

  return (
    <div className="flex gap-6">
      {/* Left: Template browser */}
      <div className={`${selectedTemplate ? 'w-1/2' : 'w-full'} transition-all`}>
        <div className="mb-4">
          <h1 className="text-xl font-bold">选择模型</h1>
          <p className="text-sm text-gray-500 mt-0.5">选择产品模板开始配置</p>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索模型..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        {/* Category pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button onClick={() => setActiveCategory('')}
              className={`text-xs px-2.5 py-1 rounded-full ${!activeCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>全部</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`text-xs px-2.5 py-1 rounded-full capitalize ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{cat}</button>
            ))}
          </div>
        )}

        {/* Template grid */}
        <div className="grid grid-cols-2 gap-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
          {filteredTemplates.map((t: any) => (
            <button
              key={t.id}
              onClick={() => selectTemplate(t)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedTemplate?.id === t.id
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-sm text-gray-900 truncate">{t.name}</div>
              <div className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</div>
              {t.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {t.tags.slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
          {filteredTemplates.length === 0 && (
            <div className="col-span-2 text-center py-8 text-gray-400 text-sm">
              {templates.length === 0 ? '暂无模板' : '没有匹配的模型'}
            </div>
          )}
        </div>
      </div>

      {/* Right: Parameter panel */}
      {selectedTemplate && (
        <div className="w-1/2 border-l border-gray-200 pl-6">
          <div className="sticky" style={{ top: '1rem' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedTemplate.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">调整参数后提交渲染</p>
              </div>
              <button onClick={() => setSelectedTemplate(null)}
                className="text-xs text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Dimensions */}
              {selectedTemplate.params_schema?.properties &&
                Object.keys(selectedTemplate.params_schema.properties).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">尺寸参数</h3>
                  <div className="space-y-4">
                    {Object.entries(selectedTemplate.params_schema.properties).map(([key, param]: [string, any]) => (
                      <ParamField
                        key={key}
                        keyName={key}
                        param={param}
                        value={paramValues[key] ?? param.default ?? ''}
                        required={selectedTemplate.params_schema?.required?.includes(key) ?? false}
                        onChange={handleParamChange}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Surface Finish */}
              {allFinishes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">表面处理</h3>
                  <FinishPicker
                    finishes={allFinishes}
                    availableIds={availableFinishIds}
                    value={selectedFinish}
                    onChange={setSelectedFinish}
                  />
                </div>
              )}

              {/* Color */}
              {Object.keys(colorCatalog).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">颜色</h3>
                  <ColorPicker
                    colors={colorCatalog}
                    series={colorSeries}
                    availableKeys={availableColorKeys}
                    value={selectedColor}
                    onChange={setSelectedColor}
                  />
                </div>
              )}

              {/* Scene */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">渲染场景</h3>
                <select value={sceneId || defaultSceneId} onChange={e => setSceneId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  {scenes.length > 0 ? scenes.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  )) : (
                    <>
                      <option value="studio_champagne">香槟金 工作室标准</option>
                      <option value="studio_black_matte">哑光黑 工作室标准</option>
                      <option value="studio_gunmetal">枪灰色 金属质感</option>
                      <option value="studio_automotive">汽车烤漆 高光泽</option>
                      <option value="studio_white_soft">柔光白 简洁风</option>
                      <option value="studio_orange">橙色粉末涂层</option>
                      <option value="detail_closeup">局部特写</option>
                      <option value="transparent_black">黑底透明背景</option>
                    </>
                  )}
                </select>
              </div>

              {/* Prompt */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">补充描述（选填）</h3>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  placeholder="例如：强调表面金属质感，暖色调布光"
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20" />
                <p className="text-xs text-gray-400 text-right mt-0.5">{prompt.length}/500</p>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {loading ? '创建中...' : '创建渲染任务'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
