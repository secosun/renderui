import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ParamField } from '../components/ParamField';
import { ModelViewer } from '../components/ModelViewer';

export function TemplateDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<any | null>(null);
  const [scenes, setScenes] = useState<any[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, number | string>>({});
  const [sceneId, setSceneId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    // Load template by slug (list then filter)
    axios.get('/api/freecad/templates?limit=100')
      .then(res => {
        const list = res.data.templates || [];
        const found = list.find((t: any) => t.slug === slug || t.id === slug);
        if (found) {
          setTemplate(found);
          const defaults: Record<string, number | string> = {};
          if (found.params_schema?.properties) {
            for (const [key, param] of Object.entries(found.params_schema.properties as any)) {
              if ((param as any).default !== undefined) {
                defaults[key] = (param as any).default as number | string;
              }
            }
          }
          setParamValues(defaults);
        }
        setFetching(false);
      })
      .catch(() => setFetching(false));

    axios.get('/api/scenes')
      .then(res => setScenes(res.data.scenes || res.data || []))
      .catch(() => {});
  }, [slug]);

  const handleParamChange = (key: string, value: string) => {
    const param = template?.params_schema?.properties?.[key];
    const parsed = param?.type === 'number' || param?.type === 'integer'
      ? Number(value) : value;
    setParamValues(prev => ({ ...prev, [key]: parsed }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) { setError('请选择产品模板'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/tasks', {
        template_id: template.id,
        template_params: paramValues,
        scene_id: sceneId || undefined,
        prompt: prompt || undefined,
        name: `${template.name} - ${new Date().toLocaleDateString()}`,
      });
      navigate(`/tasks/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || '创建任务失败');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">模板不存在</p>
        <Link to="/" className="text-blue-600 hover:underline mt-2 inline-block text-sm">← 返回模型库</Link>
      </div>
    );
  }

  const hasParams = template.params_schema?.properties &&
    Object.keys(template.params_schema.properties).length > 0;

  // Determine preview 3D model from template type
  const previewUrl = (() => {
    const props = template.params_schema?.properties || {};
    if (props.diameter) return '/uploads/preview_cylinder.obj';
    if (props.length) return '/uploads/preview_cube.obj';
    return null;
  })();

  // Compute 3D scale from current parameter values
  const previewScale: [number, number, number] = (() => {
    const props = template.params_schema?.properties || {};
    const defs: Record<string, number> = {};
    for (const [k, p] of Object.entries(props) as [string, any][]) {
      if (p.default !== undefined) defs[k] = Number(p.default);
    }
    if (props.diameter) {
      const d = (Number(paramValues.diameter) || defs.diameter || 80) / 100;
      const h = (Number(paramValues.height) || defs.height || 120) / 100;
      return [d, h, d];
    }
    const l = (Number(paramValues.length) || defs.length || 100) / 100;
    const w = (Number(paramValues.width) || defs.width || 60) / 100;
    const h = (Number(paramValues.height) || defs.height || 40) / 100;
    return [l, h, w];
  })();

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        <Link to="/" className="hover:text-blue-600">模型库</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{template.name}</span>
      </div>

      <div className="flex gap-6">
        {/* Left: Model Preview */}
        <div className="w-3/5">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg overflow-hidden">
              {previewUrl ? (
                <ModelViewer
                  src={previewUrl}
                  scale={previewScale}
                  sceneId={sceneId}
                  autoRotate
                  cameraControls
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-center text-gray-400">
                  <svg className="w-20 h-20 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Model Info */}
          <div className="bg-white rounded-lg shadow p-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-xl font-bold text-gray-900">{template.name}</h1>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{template.category}</span>
            </div>
            <p className="text-sm text-gray-500">{template.description}</p>
            {template.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {template.tags.map((tag: string) => (
                  <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Parameter Panel */}
        <div className="w-2/5">
          <div className="bg-white rounded-lg shadow p-5 sticky" style={{ top: '1rem' }}>
            <h2 className="text-lg font-bold text-gray-900 mb-1">配置参数</h2>
            <p className="text-xs text-gray-500 mb-4">调整尺寸后提交渲染</p>

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {hasParams && (
                <div className="space-y-4">
                  {Object.entries(template.params_schema.properties).map(([key, param]: [string, any]) => (
                    <ParamField
                      key={key}
                      keyName={key}
                      param={param}
                      value={paramValues[key] ?? param.default ?? ''}
                      required={template.params_schema?.required?.includes(key) ?? false}
                      onChange={handleParamChange}
                    />
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">渲染场景</label>
                <select value={sceneId} onChange={e => setSceneId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
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
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">补充描述</label>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  placeholder="选填：描述渲染风格、材质细节等要求"
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-16" />
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {loading ? '提交中...' : '提交渲染'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
