import { useEffect, useState } from 'react';
import axios from 'axios';

interface Finish {
  id: string; label_zh: string;
  texture_profile?: string;
  principled: { base_color: number[] };
}

interface TextureProfile {
  id: string; label_zh?: string;
}

export function PreviewPanel() {
  const [finishes, setFinishes] = useState<Finish[]>([]);
  const [textures, setTextures] = useState<TextureProfile[]>([]);
  const [selectedFinish, setSelectedFinish] = useState('');
  const [selectedTexture, setSelectedTexture] = useState('');
  const [rendering, setRendering] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    Promise.all([
      axios.get('/api/finishes'),
      axios.get('/api/texture-profiles').catch(() => ({ data: { profiles: [] } })),
    ]).then(([fr, tr]) => {
      setFinishes(fr.data.finishes || []);
      setTextures(tr.data.profiles || []);
      if (fr.data.finishes?.length) setSelectedFinish(fr.data.finishes[0].id);
    }).catch(() => {});
  }, []);

  const handleRender = async () => {
    if (!selectedFinish) return;
    setRendering(true);
    setError('');
    setImageUrl('');
    try {
      const res = await axios.get('/api/preview/render', {
        params: {
          finish_id: selectedFinish,
          texture_profile_id: selectedTexture || undefined,
          samples: 128,
        },
      });
      setImageUrl(res.data.image_url);
      setLoadKey(k => k + 1);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || '渲染失败');
    }
    setRendering(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-3">材质与纹理组合预览</div>

        <div className="flex items-end gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">材质</label>
            <select value={selectedFinish} onChange={e => setSelectedFinish(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white w-48">
              {finishes.map(f => (
                <option key={f.id} value={f.id}>{f.label_zh} ({f.id})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">纹理（可选）</label>
            <select value={selectedTexture} onChange={e => setSelectedTexture(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white w-48">
              <option value="">无纹理 (plain BSDF)</option>
              {textures.map(t => (
                <option key={t.id} value={t.id}>{t.label_zh || t.id}</option>
              ))}
            </select>
          </div>
          <button onClick={handleRender} disabled={rendering || !selectedFinish}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {rendering ? '渲染中... (~3s)' : '预览'}
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm mb-3">{error}</div>}

        {imageUrl && (
          <div className="mt-4">
            <div className="text-sm text-gray-500 mb-2">
              {finishes.find(f => f.id === selectedFinish)?.label_zh || selectedFinish}
              {selectedTexture && ` + ${textures.find(t => t.id === selectedTexture)?.label_zh || selectedTexture}`}
            </div>
            <img key={`preview-${loadKey}`} src={imageUrl}
              className="max-w-md rounded-lg border shadow-lg bg-white"
              onError={() => setError('图片加载失败')}
              style={{ minHeight: 200, minWidth: 200 }} />
          </div>
        )}
      </div>
    </div>
  );
}
