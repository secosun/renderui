import { useEffect, useState } from 'react';
import axios from 'axios';
import type { CatalogColor, Finish } from '../../api/client';

export function AdminTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState<string | null>(null);

  // Create form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('aluminum');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [paramDefs, setParamDefs] = useState('{}');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  // Color/finish binding state
  const [allFinishes, setAllFinishes] = useState<Finish[]>([]);
  const [colorCatalog, setColorCatalog] = useState<Record<string, CatalogColor>>({});
  const [colorSeries, setColorSeries] = useState<Record<string, string>>({});
  const [selectedFinishes, setSelectedFinishes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  // Binding search
  const [colorSearch, setColorSearch] = useState('');

  useEffect(() => {
    loadTemplates();
    axios.get('/api/colors').then(r => {
      setColorCatalog(r.data.colors || {});
      setColorSeries(r.data.series || {});
    }).catch(() => {});
    axios.get('/api/finishes').then(r => setAllFinishes(r.data.finishes || [])).catch(() => {});
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await axios.get('/api/freecad/templates?limit=100');
      setTemplates(res.data.templates || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setUploading(true);
    try {
      const parsed = JSON.parse(paramDefs);
      const paramsSchema = {
        properties: parsed,
        required: Object.keys(parsed),
      };
      const res = await axios.post('/api/freecad/templates', {
        name, slug, description, category,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        params_schema: paramsSchema,
        available_finishes: selectedFinishes,
        available_colors: selectedColors,
      });
      const templateId = res.data.id;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        await axios.post(`/api/freecad/templates/${templateId}/upload`, fd);
      }
      setSuccess('模板创建成功');
      setShowForm(false);
      resetForm();
      loadTemplates();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || '创建失败');
    }
    setUploading(false);
  };

  const resetForm = () => {
    setName(''); setSlug(''); setDescription('');
    setCategory('aluminum'); setTags(''); setFile(null);
    setParamDefs('{}');
    setSelectedFinishes([]);
    setSelectedColors([]);
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('确定删除此模板？')) return;
    try { await axios.delete(`/api/freecad/templates/${id}`); loadTemplates(); }
    catch { /* ignore */ }
  };

  const handleThumbnailUpload = async (templateId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingThumb(templateId);
    try {
      const fd = new FormData();
      fd.append('file', f);
      await axios.post(`/api/freecad/templates/${templateId}/thumbnail`, fd);
      loadTemplates();
    } catch { /* ignore */ }
    setUploadingThumb(null);
  };

  const startEdit = (t: any) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditDesc(t.description);
    setEditCategory(t.category);
    setSelectedFinishes(t.available_finishes || []);
    setSelectedColors(t.available_colors || []);
    setColorSearch('');
  };

  const saveEdit = async (id: string) => {
    try {
      await axios.patch(`/api/freecad/templates/${id}`, {
        name: editName, description: editDesc, category: editCategory,
        available_finishes: selectedFinishes,
        available_colors: selectedColors,
      });
      setEditingId(null);
      loadTemplates();
    } catch { /* ignore */ }
  };

  const paramPresets = [
    { label: '尺寸 (长宽高)', value: JSON.stringify({
      length: { type: 'number', title: '长度', default: 100, minimum: 10, maximum: 2000, unit: 'mm' },
      width: { type: 'number', title: '宽度', default: 50, minimum: 10, maximum: 1000, unit: 'mm' },
      height: { type: 'number', title: '高度', default: 20, minimum: 5, maximum: 500, unit: 'mm' },
    }, null, 2) },
    { label: '管材 (直径+壁厚)', value: JSON.stringify({
      diameter: { type: 'number', title: '外径', default: 30, minimum: 5, maximum: 200, unit: 'mm' },
      wall_thickness: { type: 'number', title: '壁厚', default: 2, minimum: 0.5, maximum: 20, unit: 'mm' },
      length: { type: 'number', title: '长度', default: 1000, minimum: 100, maximum: 6000, unit: 'mm' },
    }, null, 2) },
    { label: '板材 (长宽+厚度)', value: JSON.stringify({
      length: { type: 'number', title: '长度', default: 200, minimum: 50, maximum: 3000, unit: 'mm' },
      width: { type: 'number', title: '宽度', default: 100, minimum: 50, maximum: 1500, unit: 'mm' },
      thickness: { type: 'number', title: '厚度', default: 3, minimum: 0.5, maximum: 50, unit: 'mm' },
    }, null, 2) },
    { label: 'EPDM 密封条', value: JSON.stringify({
      width: { type: 'number', title: '宽度', default: 10, minimum: 3, maximum: 50, unit: 'mm' },
      height: { type: 'number', title: '高度', default: 6, minimum: 2, maximum: 30, unit: 'mm' },
      hardness: { type: 'integer', title: '硬度 Shore A', default: 60, minimum: 30, maximum: 90, unit: 'ShA' },
      color: { type: 'string', title: '颜色', default: '黑色', enum: ['黑色', '白色', '灰色', '透明'] },
    }, null, 2) },
  ];

  const categories = ['aluminum', 'steel', 'plastic', 'furniture', 'hardware', 'packaging', 'machinery'];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">模板管理</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          {showForm ? '取消' : '新建模板'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg shadow mb-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}
          {success && <div className="bg-green-50 text-green-700 p-3 rounded text-sm">{success}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标识 (slug) *</label>
              <input value={slug} onChange={e => setSlug(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="逗号分隔"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">FCStd 文件</label>
              <input type="file" accept=".fcstd" onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
          </div>

          {/* Surface finish binding */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">可用表面处理</label>
            {allFinishes.length === 0 ? (
              <div className="text-xs text-gray-400">加载中...</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {allFinishes.map(f => {
                  const active = selectedFinishes.includes(f.id);
                  return (
                    <button key={f.id} type="button" onClick={() => {
                      setSelectedFinishes(prev =>
                        active ? prev.filter(x => x !== f.id) : [...prev, f.id]
                      );
                    }} className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}>{f.label_zh}</button>
                  );
                })}
              </div>
            )}
            {selectedFinishes.length === 0 && (
              <p className="text-[10px] text-gray-400 mt-1">未选择（渲染将使用默认表面处理）</p>
            )}
          </div>

          {/* Color binding */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">可用颜色</label>
            <input value={colorSearch} onChange={e => setColorSearch(e.target.value)}
              placeholder="搜索色号..."
              className="mb-2 w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
            {Object.keys(colorCatalog).length === 0 ? (
              <div className="text-xs text-gray-400">加载中...</div>
            ) : (
              <div className="max-h-40 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-1">
                {Object.entries(colorCatalog).filter(([k, c]) => {
                  if (!colorSearch) return true;
                  const q = colorSearch.toLowerCase();
                  return k.includes(q) || c.label_zh.includes(q) || c.label_en.toLowerCase().includes(q);
                }).map(([key, c]) => {
                  const active = selectedColors.includes(key);
                  return (
                    <button key={key} type="button" onClick={() => {
                      setSelectedColors(prev =>
                        active ? prev.filter(x => x !== key) : [...prev, key]
                      );
                    }} className={`flex items-center gap-1.5 p-1 rounded text-[10px] border transition-all ${
                      active
                        ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-300'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: c.hex }} />
                      <span className="truncate">{c.label_en || key}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedColors.length > 0 && (
              <p className="text-[10px] text-gray-400 mt-1">已选 {selectedColors.length} 色</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">参数定义 (JSON)</label>
              <div className="flex flex-wrap gap-2">
                {paramPresets.map(p => (
                  <button key={p.label} type="button" onClick={() => setParamDefs(p.value)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline">{p.label}</button>
                ))}
              </div>
            </div>
            <textarea value={paramDefs} onChange={e => setParamDefs(e.target.value)} rows={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <button type="submit" disabled={uploading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {uploading ? '创建中...' : '创建模板'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>暂无模板</p>
          <p className="text-xs mt-1">点击"新建模板"开始</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">缩略图</th>
                <th className="text-left px-4 py-3 font-medium">名称</th>
                <th className="text-left px-4 py-3 font-medium">分类</th>
                <th className="text-left px-4 py-3 font-medium">参数</th>
                <th className="text-left px-4 py-3 font-medium">绑定</th>
                <th className="text-left px-4 py-3 font-medium">创建时间</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <label className="cursor-pointer block">
                      {t.thumbnail_url ? (
                        <img src={t.thumbnail_url} alt=""
                          className="w-12 h-12 rounded object-cover border border-gray-200" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs border border-gray-200">
                          {uploadingThumb === t.id ? '...' : '添加'}
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => handleThumbnailUpload(t.id, e)} />
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === t.id ? (
                      <div className="flex flex-col gap-1">
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-xs" />
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(t.id)}
                            className="text-xs text-blue-600 hover:underline">保存</button>
                          <button onClick={() => setEditingId(null)}
                            className="text-xs text-gray-400 hover:underline">取消</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium text-gray-900">{t.name}</div>
                        <div className="text-xs text-gray-400">{t.slug}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{t.category}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono max-w-[200px] truncate">
                    {t.params_schema?.properties ? Object.keys(t.params_schema.properties).join(', ') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5 text-[10px]">
                      <span className={t.available_finishes?.length > 0 ? 'text-blue-600' : 'text-gray-400'}>
                        表面: {t.available_finishes?.length || 0}
                      </span>
                      <span className={t.available_colors?.length > 0 ? 'text-purple-600' : 'text-gray-400'}>
                        颜色: {t.available_colors?.length || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(t)}
                        className="text-xs text-blue-500 hover:text-blue-700">编辑</button>
                      <button onClick={() => deleteTemplate(t.id)}
                        className="text-xs text-red-500 hover:text-red-700">删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
