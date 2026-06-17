import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { OnboardingGuide } from '../components/OnboardingGuide';

const CATEGORY_COLORS: Record<string, string> = {
  aluminum: 'from-blue-400 to-blue-600',
  steel: 'from-gray-400 to-gray-600',
  plastic: 'from-green-400 to-green-600',
  furniture: 'from-amber-400 to-amber-600',
  hardware: 'from-purple-400 to-purple-600',
  packaging: 'from-pink-400 to-pink-600',
  machinery: 'from-orange-400 to-orange-600',
};

const CATEGORY_LABELS: Record<string, string> = {
  aluminum: '铝型材', steel: '钢材', plastic: '塑料件',
  furniture: '家具', hardware: '五金件', packaging: '包装', machinery: '机械件',
};

export function Dashboard() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [showGuide, setShowGuide] = useState(() => {
    return !localStorage.getItem('cadrender_onboarding_done');
  });

  useEffect(() => {
    axios.get('/api/freecad/templates?limit=50')
      .then(res => { setTemplates(res.data.templates || []); })
      .catch(() => setError('加载模板失败'))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(templates.map((t: any) => t.category))).sort();
  }, [templates]);

  const filtered = useMemo(() => {
    return templates.filter((t: any) => {
      if (activeCategory && t.category !== activeCategory) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q)
        || t.description?.toLowerCase().includes(q)
        || t.tags?.some((tag: string) => tag.toLowerCase().includes(q));
    });
  }, [templates, searchQuery, activeCategory]);

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="aspect-[4/3] bg-gray-100 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          重试
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">模型库</h1>
        <p className="text-gray-500 mt-1">选择产品模型，调整参数，一键渲染</p>
      </div>

      {/* Search + Category */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索模型..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <Link to="/my-tasks" className="text-sm text-gray-500 hover:text-blue-600 whitespace-nowrap">
          查看我的任务 →
        </Link>
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveCategory('')}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              !activeCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >全部</button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors capitalize ${
                activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >{CATEGORY_LABELS[cat] || cat}</button>
          ))}
        </div>
      )}

      {/* Gallery */}
      {templates.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"/>
          </svg>
          <p className="text-gray-400">暂无可用模型模板</p>
          <p className="text-xs text-gray-400 mt-1">请联系管理员上传 FreeCAD 模板</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400">没有匹配的模型</p>
          <button onClick={() => { setSearchQuery(''); setActiveCategory(''); }}
            className="mt-2 text-sm text-blue-600 hover:underline">清除筛选</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((t: any) => (
            <ModelCard key={t.id} template={t} onClick={() => navigate(`/templates/${t.slug || t.id}`)} />
          ))}
        </div>
      )}
      {showGuide && <OnboardingGuide onDone={() => { localStorage.setItem('cadrender_onboarding_done', '1'); setShowGuide(false); }} />}
    </div>
  );
}

function ModelCard({ template, onClick }: { template: any; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);
  const gradient = CATEGORY_COLORS[template.category] || 'from-gray-300 to-gray-500';

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden text-left hover:shadow-md hover:-translate-y-0.5 transition-all group"
    >
      {/* Thumbnail */}
      <div className={`aspect-[4/3] bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden`}>
        {template.thumbnail_url && !imgError ? (
          <img
            src={template.thumbnail_url}
            alt={template.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-4xl font-bold text-white/30">
            {template.name?.charAt(0) || '?'}
          </span>
        )}
        {/* Category badge */}
        <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-white/90 text-gray-700">
          {CATEGORY_LABELS[template.category] || template.category}
        </span>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium bg-black/40 px-3 py-1.5 rounded-lg">
            选择参数并渲染
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 text-sm truncate">{template.name}</h3>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</p>
        {template.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {template.tags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
