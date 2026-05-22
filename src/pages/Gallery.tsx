import { useState, useEffect } from 'react';
import { listAssets, deleteAsset, type GalleryAsset } from '../api/client';

export function Gallery() {
  const [assets, setAssets] = useState<GalleryAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const load = () => {
    setLoading(true);
    listAssets(pageSize, page * pageSize).then(d => {
      setAssets(d.assets);
      setTotal(d.total);
    }).finally(() => setLoading(false));
  };
  useEffect(load, [page]);

  const handleDelete = async (assetId: string) => {
    if (!confirm('确定删除此资产？')) return;
    await deleteAsset(assetId);
    load();
  };

  if (loading) return <div className="text-gray-500">加载中...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">资产库</h1>
      <p className="text-sm text-gray-500 mb-4">共 {total} 个渲染资产</p>

      {assets.length === 0 ? (
        <div className="text-gray-400 text-center py-12">暂无渲染资产，完成渲染任务后资产将出现在这里</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {assets.map(a => (
              <div key={a.id} className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                  {a.thumbnail_url ? (
                    <img src={a.thumbnail_url} alt={a.title} className="w-full h-full object-cover" />
                  ) : a.file_url?.match(/\.(png|jpg|jpeg|webp)$/i) ? (
                    <img src={a.file_url} alt={a.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-gray-400 text-4xl">🖼</div>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDelete(a.id)} className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600">删除</button>
                  </div>
                </div>
                <div className="p-2">
                  <div className="text-xs font-medium truncate">{a.title || '未命名'}</div>
                  <div className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex justify-center gap-2 mt-6">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 text-sm border rounded disabled:opacity-50">上一页</button>
              <span className="px-3 py-1 text-sm text-gray-500">{page + 1} / {Math.ceil(total / pageSize)}</span>
              <button onClick={() => setPage(page + 1)} disabled={(page + 1) * pageSize >= total} className="px-3 py-1 text-sm border rounded disabled:opacity-50">下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
