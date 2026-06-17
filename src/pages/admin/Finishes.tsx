import { useEffect, useState } from 'react';
import axios from 'axios';
import { ModelViewer } from '../../components/ModelViewer';

interface Finish {
  id: string;
  label_zh: string;
  gate_profile: string;
  lighting_profile: string;
  view_exposure: number;
  hdri_strength: number;
  world_strength: number;
  principled: {
    base_color: number[];
    roughness: number;
    metallic: number;
    specular_ior_level: number;
    coat_weight: number;
    coat_roughness: number;
    coat_ior: number;
    anisotropic?: number;
    anisotropic_rotation?: number;
  };
}

const DEFAULT_FINISH: Finish = {
  id: '', label_zh: '', gate_profile: 'mid_matte',
  lighting_profile: 'mid', view_exposure: -0.3,
  hdri_strength: 0.4, world_strength: 0.2,
  principled: { base_color: [0.5, 0.5, 0.5, 1], roughness: 0.5, metallic: 0,
    specular_ior_level: 0.5, coat_weight: 0, coat_roughness: 0.3, coat_ior: 1.5 },
};

// Scene lighting profiles for preview
const SCENE_PREVIEWS = [
  { id: 'studio_champagne', name: '香槟金 暖色' },
  { id: 'studio_black_matte', name: '哑光黑 强光' },
  { id: 'studio_white_soft', name: '柔光白 均匀' },
];

export function AdminFinishes() {
  const [finishes, setFinishes] = useState<Finish[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Finish | null>(null);
  const [previewScene, setPreviewScene] = useState('studio_champagne');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await axios.get('/api/finishes');
      setFinishes(res.data.finishes || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id && finishes.some(f => f.id === editing.id)) {
        await axios.put(`/api/finishes/${editing.id}`, editing);
      } else {
        await axios.post('/api/finishes', editing);
      }
      setEditing(null);
      load();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此材质？')) return;
    try { await axios.delete(`/api/finishes/${id}`); load(); }
    catch { /* ignore */ }
  };

  const colorToHex = (c: number[]) => {
    const r = Math.round((c[0] || 0) * 255);
    const g = Math.round((c[1] || 0) * 255);
    const b = Math.round((c[2] || 0) * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const hexToColor = (hex: string): number[] => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b, 1];
  };

  // Build Three.js preview URL from the current editing finish
  const previewData = editing ? {
    src: '/uploads/preview_cube.obj',
    scale: [1, 1, 1] as [number, number, number],
    sceneId: previewScene,
  } : null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">材质管理</h1>
        <button onClick={() => setEditing({ ...DEFAULT_FINISH })}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + 新建材质
        </button>
      </div>

      {editing && (
        <div className="flex gap-6 mb-6">
          {/* Edit form */}
          <div className="w-1/2 bg-white rounded-lg shadow p-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing.id ? '编辑材质' : '新建材质'}</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">标识 ID</label>
                <input value={editing.id} onChange={e => setEditing({ ...editing, id: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">中文名称</label>
                <input value={editing.label_zh} onChange={e => setEditing({ ...editing, label_zh: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">曝光 (EV)</label>
                <input type="number" step={0.1} value={editing.view_exposure}
                  onChange={e => setEditing({ ...editing, view_exposure: +e.target.value })}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">HDRI 强度</label>
                <input type="number" step={0.05} value={editing.hdri_strength}
                  onChange={e => setEditing({ ...editing, hdri_strength: +e.target.value })}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* PBR Parameters */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">PBR 参数</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">基础颜色</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={colorToHex(editing.principled.base_color)}
                      onChange={e => setEditing({ ...editing, principled: { ...editing.principled, base_color: hexToColor(e.target.value) } })}
                      className="w-10 h-8 rounded border border-gray-300 cursor-pointer" />
                    <span className="text-xs text-gray-400 font-mono">{colorToHex(editing.principled.base_color)}</span>
                  </div>
                </div>

                {([
                  ['粗糙度', 'roughness', 0, 1, 0.01],
                  ['金属度', 'metallic', 0, 1, 0.01],
                  ['镜面 IOR', 'specular_ior_level', 0, 1, 0.01],
                  ['涂层权重', 'coat_weight', 0, 1, 0.01],
                  ['涂层粗糙度', 'coat_roughness', 0, 1, 0.01],
                  ['涂层 IOR', 'coat_ior', 1, 2, 0.01],
                ] as const).map(([label, key, min, max, step]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                    <div className="flex items-center gap-3">
                      <input type="range" min={min} max={max} step={step}
                        value={(editing.principled as any)[key]}
                        onChange={e => setEditing({ ...editing, principled: { ...editing.principled, [key]: +e.target.value } })}
                        className="flex-1 accent-blue-600" />
                      <span className="text-xs font-mono text-gray-500 w-10 text-right">
                        {(editing.principled as any)[key].toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleSave} disabled={saving || !editing.id || !editing.label_zh}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? '保存中...' : '保存材质'}
            </button>
          </div>

          {/* Live preview */}
          <div className="w-1/2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">实时预览</h3>
              <select value={previewScene} onChange={e => setPreviewScene(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white">
                {SCENE_PREVIEWS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: 400 }}>
              {previewData && (
                <ModelViewer
                  src={previewData.src}
                  scale={previewData.scale}
                  sceneId={previewData.sceneId}
                  autoRotate
                  cameraControls
                  className="w-full h-full"
                />
              )}
            </div>
            <p className="text-xs text-gray-400">参数调整实时更新，拖拽旋转查看不同角度</p>
          </div>
        </div>
      )}

      {/* Finish list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : finishes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>暂无材质</p>
          <p className="text-xs mt-1">点击"新建材质"创建第一个</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {finishes.map(f => (
            <div key={f.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="h-24 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${colorToHex(f.principled.base_color)}, #fff)` }}>
                <div className="w-12 h-12 rounded-full border-2 border-white shadow" style={{ background: colorToHex(f.principled.base_color) }} />
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm text-gray-900">{f.label_zh}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{f.id}</p>
                <div className="flex gap-2 mt-2 text-[10px] text-gray-500">
                  <span>Rough: {f.principled.roughness.toFixed(2)}</span>
                  <span>Metal: {f.principled.metallic.toFixed(2)}</span>
                  <span>Coat: {f.principled.coat_weight.toFixed(2)}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setEditing({ ...f })}
                    className="text-xs text-blue-600 hover:underline">编辑</button>
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
