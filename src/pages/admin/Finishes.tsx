import { useEffect, useState } from 'react';
import axios from 'axios';

interface Finish {
  id: string;
  label_zh: string;
  gate_profile: string;
  lighting_profile: string;
  texture_profile?: string;
  texture_intensity?: number;
  deprecated?: boolean;
  principled: {
    base_color: number[];
    roughness: number;
    metallic: number;
    coat_weight: number;
  };
}

interface TextureProfile {
  id: string;
  label_zh?: string;
  preview_url?: string;
  bakecoat_procedural?: {
    micro?: { scale?: number };
    bump?: { strength?: number };
  };
}

interface CategoryMapping {
  category_key: string;
  finish_id: string;
  overridden: boolean;
}

export function AdminFinishes() {
  const [finishes, setFinishes] = useState<Finish[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Category mapping state
  const [mappings, setMappings] = useState<CategoryMapping[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, setPending] = useState<string>('');
  const [mapMsg, setMapMsg] = useState('');
  const [textureProfiles, setTextureProfiles] = useState<TextureProfile[]>([]);

  useEffect(() => {
    Promise.all([
      axios.get('/api/finishes'),
      axios.get('/api/category-finishes'),
      axios.get('/api/texture-profiles').catch(() => ({ data: { profiles: [] } })),
    ]).then(([fr, mr, tr]) => {
      setFinishes((fr.data.finishes || []).filter((f: any) => !f.deprecated));
      setMappings(mr.data.mappings || []);
      setTextureProfiles(tr.data.profiles || []);
    }).finally(() => setLoading(false));
  }, []);

  const load = async () => {
    try {
      const res = await axios.get('/api/finishes');
      setFinishes((res.data.finishes || []).filter((f: any) => !f.deprecated));
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setError('');
    try {
      const text = await uploadFile.text();
      const data = JSON.parse(text);
      if (!data.id || !data.label_zh) {
        throw new Error('JSON 文件需要包含 id 和 label_zh 字段');
      }
      await axios.post('/api/finishes', {
        id: data.id,
        label_zh: data.label_zh,
        gate_profile: data.gate_profile || 'mid_matte',
        lighting_profile: data.lighting_profile || 'mid',
        view_exposure: data.view_exposure ?? -0.3,
        hdri_strength: data.hdri_strength ?? 0.4,
        world_strength: data.world_strength ?? 0.2,
        principled: {
          base_color: data.principled?.base_color || [0.5, 0.5, 0.5, 1],
          roughness: data.principled?.roughness ?? 0.5,
          metallic: data.principled?.metallic ?? 0,
          specular_ior_level: data.principled?.specular_ior_level ?? 0.5,
          coat_weight: data.principled?.coat_weight ?? 0,
          coat_roughness: data.principled?.coat_roughness ?? 0.3,
          coat_ior: data.principled?.coat_ior ?? 1.5,
        },
      });
      setUploadFile(null);
      load();
    } catch (err: any) {
      setError(err.message || '上传失败');
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此材质？')) return;
    try { await axios.delete(`/api/finishes/${id}`); load(); }
    catch { /* ignore */ }
  };

  const colorSwatch = (c: number[]) => {
    const r = Math.round((c[0] || 0) * 255);
    const g = Math.round((c[1] || 0) * 255);
    const b = Math.round((c[2] || 0) * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Category mapping handlers
  const handleEditMapping = (key: string, current: string) => {
    setEditing(key);
    setPending(current);
  };

  const handleSaveMapping = async (key: string) => {
    if (!pending) return;
    try {
      await axios.put(`/api/category-finishes/${key}`, { finish_id: pending });
      setMappings(prev => prev.map(m =>
        m.category_key === key ? { ...m, finish_id: pending, overridden: true } : m
      ));
      setEditing(null);
      setMapMsg(`已更新：${key} → ${finishes.find(f => f.id === pending)?.label_zh || pending}`);
      setTimeout(() => setMapMsg(''), 3000);
    } catch { /* ignore */ }
  };

  const handleResetMapping = async (key: string) => {
    try {
      await axios.delete(`/api/category-finishes/${key}`);
      const mr = await axios.get('/api/category-finishes');
      setMappings(mr.data.mappings || []);
      setMapMsg(`已重置：${key}`);
      setTimeout(() => setMapMsg(''), 3000);
    } catch { /* ignore */ }
  };

  const finishName = (id: string) => finishes.find(f => f.id === id)?.label_zh || id;
  const finishColor = (id: string) => {
    const f = finishes.find(f => f.id === id);
    if (!f?.principled?.base_color) return '#ccc';
    return colorSwatch(f.principled.base_color);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">材质库</h1>
      </div>

      {/* Upload */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">上传材质文件</h2>
        <p className="text-xs text-gray-400 mb-3">上传渲染工程师标定好的 finish JSON 文件</p>
        {error && <div className="bg-red-50 text-red-700 p-2 rounded text-xs mb-2">{error}</div>}
        <div className="flex items-center gap-3">
          <input type="file" accept=".json" onChange={e => setUploadFile(e.target.files?.[0] || null)}
            className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          <button onClick={handleUpload} disabled={!uploadFile || uploading}
            className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {uploading ? '上传中...' : '上传'}
          </button>
        </div>
      </div>

      {/* Finish list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : finishes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>暂无材质</p>
          <p className="text-xs mt-1">上传渲染工程师标定的 JSON 文件</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {finishes.map(f => (
            <div key={f.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="h-20 flex items-center justify-center" style={{
                background: `linear-gradient(135deg, ${colorSwatch(f.principled.base_color)}22, ${colorSwatch(f.principled.base_color)}88)`,
              }}>
                <div className="w-10 h-10 rounded-full border-2 border-white shadow-md"
                     style={{ background: colorSwatch(f.principled.base_color) }} />
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm text-gray-900">{f.label_zh}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{f.id}</p>
                <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
                  <span>粗糙度 {f.principled.roughness.toFixed(2)}</span>
                  <span>金属度 {f.principled.metallic.toFixed(2)}</span>
                  <span>涂层 {f.principled.coat_weight.toFixed(2)}</span>
                </div>
                {f.texture_profile && (
                  <div className="mt-1.5 text-[10px] text-blue-600 truncate">
                    纹理: {textureProfiles.find(t => t.id === f.texture_profile)?.id || f.texture_profile}
                    {f.texture_intensity !== undefined && ` ×${f.texture_intensity.toFixed(2)}`}
                  </div>
                )}
                <div className="mt-2">
                  <button onClick={() => handleDelete(f.id)}
                    className="text-xs text-red-500 hover:underline">删除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Texture Profiles */}
      {textureProfiles.length > 0 && (
        <div className="bg-white rounded-lg shadow border mb-6">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">纹理库</h2>
            <span className="text-xs text-gray-400">{textureProfiles.length} 个纹理</span>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {textureProfiles.map(tp => (
              <div key={tp.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                {tp.preview_url ? (
                  <div className="aspect-[4/3] bg-gray-100">
                    <img src={tp.preview_url} alt={tp.label_zh || tp.id}
                      className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-300">{(tp.label_zh || tp.id).charAt(0)}</span>
                  </div>
                )}
                <div className="p-2.5">
                  <div className="font-medium text-sm text-gray-900">{tp.label_zh || tp.id}</div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">{tp.id}</div>
                  <div className="mt-1.5 text-[10px] text-gray-500">
                    {tp.bakecoat_procedural?.bump && <span>bump ×{tp.bakecoat_procedural.bump.strength?.toFixed(3)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category mapping */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">产品分类材质分配</h2>
          {mapMsg && <span className="text-xs text-blue-600">{mapMsg}</span>}
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left">
              <th className="p-3 border-b text-xs font-medium text-gray-500">分类</th>
              <th className="p-3 border-b text-xs font-medium text-gray-500">当前材质</th>
              <th className="p-3 border-b text-xs font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map(m => (
              <tr key={m.category_key} className="border-b hover:bg-gray-50">
                <td className="p-3 font-mono text-xs">{m.category_key}</td>
                <td className="p-3">
                  {editing === m.category_key ? (
                    <div className="flex items-center gap-2">
                      <select value={pending} onChange={e => setPending(e.target.value)}
                        className="text-xs border rounded px-2 py-1">
                        {finishes.map(f => (
                          <option key={f.id} value={f.id}>{f.label_zh}</option>
                        ))}
                      </select>
                      <button onClick={() => handleSaveMapping(m.category_key)}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">保存</button>
                      <button onClick={() => setEditing(null)}
                        className="px-2 py-1 bg-gray-100 text-xs rounded hover:bg-gray-200">取消</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full inline-block border"
                            style={{ background: finishColor(m.finish_id) }} />
                      <span>{finishName(m.finish_id)}</span>
                      {m.overridden && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-50 text-yellow-600 rounded">自定义</span>}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  {editing !== m.category_key && (
                    <div className="flex gap-2">
                      <button onClick={() => handleEditMapping(m.category_key, m.finish_id)}
                        className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">编辑</button>
                      {m.overridden && (
                        <button onClick={() => handleResetMapping(m.category_key)}
                          className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">重置</button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
