import { useState, useEffect } from 'react';
import { listAssets, deleteAsset, type GalleryAsset } from '../api/client';

export function Gallery() {
  const [assets, setAssets] = useState<GalleryAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const pageSize = 20;

  const load = () => {
    setLoading(true);
    listAssets(pageSize, page * pageSize).then(d => {
      setAssets(d.assets);
      setTotal(d.total);
    }).finally(() => setLoading(false));
  };
  useEffect(load, [page]);

  const toggleSelect = (id: string) => {
    setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const handleBatchDownload = () => {
    assets.filter(a => selected.has(a.id)).forEach(a => {
      if (a.file_url) window.open(a.file_url, '_blank');
    });
  };

  const handleBatchDelete = async () => {
    if (!confirm(`确定删除选中的 ${selected.size} 个资产？`)) return;
    for (const id of selected) {
      try { await deleteAsset(id); } catch { /* ignore */ }
    }
    setSelected(new Set());
    load();
  };

  if (loading) return <div className="text-gray-500">加载中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">资产库</h1>
          <p className="text-sm text-gray-500 mt-0.5">共 {total} 个渲染资产</p>
        </div>
        {selected.size > 0 && (
          <div className="flex gap-2">
            <button onClick={handleBatchDownload}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
              下载选中 ({selected.size})
            </button>
            <button onClick={handleBatchDelete}
              className="px-3 py-1.5 bg-red-50 text-red-700 text-sm rounded hover:bg-red-100">
              删除选中
            </button>
          </div>
        )}
      </div>

      {assets.length === 0 ? (
        <div className="text-gray-400 text-center py-12">暂无渲染资产</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {assets.map(a => (
              <div key={a.id}
                className={`bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer ${selected.has(a.id) ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => toggleSelect(a.id)}>
                <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                  {a.file_url?.match(/\.(png|jpg|jpeg|webp)$/i) ? (
                    <img src={a.file_url} alt={a.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-gray-400 text-4xl">🖼</div>
                  )}
                  <div className="absolute top-2 left-2">
                    <input type="checkbox" checked={selected.has(a.id)}
                      onChange={() => toggleSelect(a.id)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 accent-blue-600" />
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={a.file_url} download target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="bg-white text-gray-700 text-xs px-2 py-1 rounded shadow hover:bg-gray-100">
                      下载
                    </a>
                  </div>
                </div>
                <div className="p-2">
                  <div className="text-xs font-medium truncate">{a.title || '未命名'}</div>
                  <div className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>

          {total > pageSize && (
            <div className="flex justify-center gap-2 mt-6">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50">上一页</button>
              <span className="px-3 py-1 text-sm text-gray-500">{page + 1} / {Math.ceil(total / pageSize)}</span>
              <button onClick={() => setPage(page + 1)} disabled={(page + 1) * pageSize >= total}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50">下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
