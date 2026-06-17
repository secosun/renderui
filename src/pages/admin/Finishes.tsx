import { useEffect, useState } from 'react';
import axios from 'axios';

interface Finish {
  id: string;
  label_zh: string;
  gate_profile: string;
  lighting_profile: string;
  principled: {
    base_color: number[];
    roughness: number;
    metallic: number;
    coat_weight: number;
  };
}

export function AdminFinishes() {
  const [finishes, setFinishes] = useState<Finish[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await axios.get('/api/finishes');
      setFinishes(res.data.finishes || []);
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

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : finishes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>暂无材质</p>
          <p className="text-xs mt-1">上传渲染工程师标定的 JSON 文件</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                <div className="mt-2">
                  <button onClick={() => handleDelete(f.id)}
                    className="text-xs text-red-500 hover:underline">删除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
