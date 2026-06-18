import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface CalibrationReport {
  finish_id?: string;
  calibration_type?: string;
  n_trials_completed?: number;
  n_trials_requested?: number;
  search_samples?: number;
  confirm_samples?: number;
  selected_from?: string;
  elapsed_s?: number;
  best?: Record<string, number>;
  trial_stats?: Record<string, number>;
  trial_scores?: number[];
  confirm_stage?: {
    top_k: number;
    samples: number;
    candidates: { source_trial: number; search_score: number; confirm_score: number }[];
  };
  validation?: {
    passed?: boolean;
    reason?: string;
    model_path?: string;
    product_category?: string;
    baseline_path?: string;
    candidate_path?: string;
    baseline_cv?: number;
    candidate_cv?: number;
    cv_delta?: number;
    baseline_gate_ok?: boolean;
    candidate_gate_ok?: boolean;
  };
}

interface Mapping {
  category_key: string;
  finish_id: string;
  overridden: boolean;
}

export function AdminCalibrationViewer() {
  const [finishName, setFinishName] = useState('');
  const [report, setReport] = useState<CalibrationReport | null>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [finishes, setFinishes] = useState<{ id: string; label_zh: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'viewer' | 'mapping'>('viewer');
  const [trialImages, setTrialImages] = useState<{ filename: string; trial_id: string; score: number | null }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showFullGrid, setShowFullGrid] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pickMsg, setPickMsg] = useState('');
  const [loadKey, setLoadKey] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('calv_recent') || '[]'); } catch { return []; }
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    axios.get('/api/finishes').then(r => setFinishes(r.data.finishes || [])).catch(() => {});
    axios.get('/api/category-finishes').then(r => setMappings(r.data.mappings || [])).catch(() => {});
  }, []);

  const saveRecent = (name: string) => {
    const next = [name, ...recent.filter(n => n !== name)].slice(0, 10);
    setRecent(next);
    localStorage.setItem('calv_recent', JSON.stringify(next));
  };

  const loadReport = async () => {
    const name = finishName.trim();
    if (!name) return;
    setLoading(true);
    setError('');
    setSelectedImage(null);
    setShowFullGrid(false);
    try {
      const [reportRes, trialsRes] = await Promise.all([
        axios.get(`/api/calibration-reports/${name}`),
        axios.get(`/api/calibration-reports/${name}/trials`).catch(() => ({ data: { images: [] } })),
      ]);
      setReport(reportRes.data);
      setTrialImages(trialsRes.data.images || []);
      saveRecent(name);
      setTab('viewer');
      setLoadKey(k => k + 1);
    } catch (err: any) {
      setError(err.response?.status === 404
        ? `未找到 "${name}" 的校准报告，请先运行 calibrate.py --mode material --finish-id ${name}`
        : `加载失败: ${err.message}`);
      setReport(null);
    }
    setLoading(false);
  };

  const paramSpecs = [
    { key: 'roughness', label: 'Roughness', lo: 0.1, hi: 0.85 },
    { key: 'metallic', label: 'Metallic', lo: 0.0, hi: 1.0 },
    { key: 'specular', label: 'Specular', lo: 0.0, hi: 1.0 },
    { key: 'coat_weight', label: 'Coat Weight', lo: 0.0, hi: 1.0 },
    { key: 'coat_roughness', label: 'Coat Roughness', lo: 0.0, hi: 1.0 },
    { key: 'bump_mult', label: 'Bump Mult', lo: 0.75, hi: 1.35 },
  ];

  const drawHistogram = (scores: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 800; canvas.height = 160;
    ctx.clearRect(0, 0, 800, 160);
    const min = Math.min(...scores), max = Math.max(...scores);
    const bins = 10, binW = (max - min) / bins || 1;
    const counts = new Array(bins).fill(0);
    scores.forEach(s => counts[Math.min(bins - 1, Math.floor((s - min) / binW))]++);
    const maxCount = Math.max(...counts, 1);
    const plotW = 800 - 50, plotH = 140;
    const barW = plotW / bins;
    counts.forEach((c, i) => {
      const h = (c / maxCount) * plotH;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(45 + i * barW + 1, 150 - h, barW - 2, h);
    });
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= bins; i += Math.max(1, Math.floor(bins / 4))) {
      ctx.fillText((min + i * binW).toFixed(1), 45 + i * barW, 158);
    }
  };

  useEffect(() => {
    if (report?.trial_scores?.length) {
      setTimeout(() => drawHistogram(report.trial_scores!), 50);
    }
  }, [report]);

  // Keyboard navigation: ← → to switch trial images
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedImage || trialImages.length === 0) return;
      const idx = trialImages.findIndex(i => i.filename === selectedImage);
      if (idx === -1) return;
      if (e.key === 'ArrowRight') {
        const next = trialImages[(idx + 1) % trialImages.length];
        setSelectedImage(next.filename);
      } else if (e.key === 'ArrowLeft') {
        const prev = trialImages[(idx - 1 + trialImages.length) % trialImages.length];
        setSelectedImage(prev.filename);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedImage, trialImages]);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">材质校准</h1>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 border-b pb-2">
        <button onClick={() => setTab('viewer')}
          className={`px-4 py-2 text-sm rounded-t ${tab === 'viewer' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-600'}`}>
          校准报告
        </button>
        <button onClick={() => setTab('mapping')}
          className={`px-4 py-2 text-sm rounded-t ${tab === 'mapping' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-600'}`}>
          产品分类材质分配
        </button>
      </div>

      {tab === 'viewer' && (
        <>
          {/* Load bar */}
          <div className="flex items-start gap-3 mb-4">
            <div className="relative">
              <div className="flex gap-2 items-center">
                <select value={finishName} onChange={e => setFinishName(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                  <option value="">— 选择材质 —</option>
                  {finishes.map(f => (
                    <option key={f.id} value={f.id}>{f.label_zh} ({f.id})</option>
                  ))}
                </select>
                <input value={finishName} onChange={e => setFinishName(e.target.value)}
                  placeholder="或直接输入 finish id"
                  className="px-3 py-2 border rounded-lg text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <button onClick={loadReport} disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? '加载中...' : '查看'}
            </button>
            {recent.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-400">最近:</span>
                {recent.map(n => (
                  <button key={n} onClick={() => { setFinishName(n); setTimeout(loadReport, 0); }}
                    className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">{n}</button>
                ))}
              </div>
            )}
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>}

          {!report && !loading && !error && (
            <div className="text-center py-16 text-gray-400 text-sm">
              <p className="mb-1">输入 finish 名称查看材质校准结果</p>
              <p className="text-xs">校准命令: python scripts/calibrate.py --mode material --finish-id &lt;name&gt;</p>
            </div>
          )}

          {report && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-3">校准概览</div>
                <div className="grid grid-cols-4 gap-4">
                  <div><div className="text-xs text-gray-400">Finish</div><div className="text-lg font-semibold">{report.finish_id}</div></div>
                  <div><div className="text-xs text-gray-400">搜索采样</div><div className="text-lg font-semibold">{report.search_samples || 256}</div></div>
                  <div><div className="text-xs text-gray-400">确认采样</div><div className="text-lg font-semibold">{report.confirm_samples || '-'}</div></div>
                  <div><div className="text-xs text-gray-400">来源</div><div className="text-lg font-semibold">{report.selected_from || 'search'}</div></div>
                </div>
              </div>

              {/* Best params */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-3">最佳参数</div>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-gray-400 text-xs"><th className="pb-2">参数</th><th className="pb-2">值</th><th className="pb-2">范围</th></tr></thead>
                  <tbody>
                    {paramSpecs.map(s => {
                      const val = report.best?.[s.key];
                      if (val === undefined || val === null) return null;
                      const pct = ((val - s.lo) / (s.hi - s.lo) * 100).toFixed(0);
                      return (
                        <tr key={s.key} className="border-b border-gray-50">
                          <td className="py-1.5 text-gray-600">{s.label}</td>
                          <td className="py-1.5 font-mono">{typeof val === 'number' ? val.toFixed(4) : val}</td>
                          <td className="py-1.5 text-gray-400 text-xs">[{s.lo}, {s.hi}] — {pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {report.trial_stats && (
                  <div className="mt-2 text-sm text-gray-500">
                    Score: {report.best?.score?.toFixed(2)}  | trial mean={report.trial_stats.mean} std={report.trial_stats.std}
                    [{report.trial_stats.min}, {report.trial_stats.max}]
                  </div>
                )}
              </div>

              {/* Trial stats */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-3">搜索阶段统计</div>
                <div className="grid grid-cols-4 gap-3 mb-3">
                  {[
                    { k: 'n', l: 'Trial' }, { k: 'mean', l: '均值' }, { k: 'std', l: '标准差' }, { k: 'min', l: '最低' },
                    { k: 'p25', l: 'P25' }, { k: 'p75', l: 'P75' }, { k: 'max', l: '最高' },
                  ].map(s => {
                    const v = report.trial_stats?.[s.k];
                    return (
                      <div key={s.k}>
                        <div className="text-xs text-gray-400">{s.l}</div>
                        <div className="text-lg font-semibold">{v !== undefined ? (typeof v === 'number' ? v.toFixed(v < 10 ? 3 : 1) : v) : '-'}</div>
                      </div>
                    );
                  })}
                </div>
                <canvas ref={canvasRef} className="w-full h-20" style={{ maxHeight: 80 }} />
              </div>

              {/* Trial images gallery */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase">渲染对比</div>
                  <button onClick={() => setShowFullGrid(!showFullGrid)}
                    className="text-xs text-blue-600 hover:underline">
                    {showFullGrid ? '关闭汇总图' : '查看汇总图'}
                  </button>
                </div>

                {showFullGrid && (
                  <img src={`/api/calibration-reports/${report.finish_id}/grid`} alt="summary grid"
                    className="w-full rounded-lg border mb-4" />
                )}

                {selectedImage && (
                  <div className="mb-4">
                    <img key={`trial-${loadKey}-${selectedImage}`} src={`/api/calibration-reports/${report.finish_id}/images/${selectedImage}`}
                      alt={selectedImage} className="w-full max-w-lg mx-auto rounded-lg border shadow-lg" />
                    <div className="flex items-center justify-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">{selectedImage}</span>
                      <button onClick={async () => {
                        setPicking(true); setPickMsg('');
                        try {
                          await axios.post(`/api/calibration-reports/${report.finish_id}/select-trial`,
                            { filename: selectedImage });
                          setPickMsg('已保存为人眼最佳');
                        } catch (err: any) {
                          setPickMsg('保存失败: ' + (err.response?.data?.detail || err.message));
                        }
                        setPicking(false);
                      }} disabled={picking}
                        className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                        {picking ? '保存中...' : '选择为人眼最佳'}
                      </button>
                    </div>
                    {pickMsg && <div className="text-center text-xs mt-1 text-green-600">{pickMsg}</div>}
                  </div>
                )}

                {trialImages.length > 0 && (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {(() => {
                      // Best trial number from confirm stage
                      const bestTrialNum = report.confirm_stage?.candidates?.length
                        ? report.confirm_stage.candidates.reduce((a, b) =>
                            (a.confirm_score || 0) >= (b.confirm_score || 0) ? a : b
                          ).source_trial
                        : null;
                      const parseTrialNum = (fn: string) => {
                        const m = fn.match(/trial_(\d+)/);
                        return m ? parseInt(m[1]) : null;
                      };
                      return trialImages.map(img => {
                        const isBest = bestTrialNum !== null && parseTrialNum(img.filename) === bestTrialNum;
                        return (
                      <button key={img.filename} onClick={() => setSelectedImage(
                        selectedImage === img.filename ? null : img.filename
                      )}
                        className={`relative rounded-lg border-2 overflow-hidden hover:border-blue-400 transition-colors ${
                          selectedImage === img.filename ? 'border-blue-600 ring-2 ring-blue-300' : 'border-gray-200'
                        }`}>
                        {isBest && (
                          <div className="absolute top-1 right-1 z-10 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center shadow">
                            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-white" fill="currentColor">
                              <path d="M13.5 4.5L6 12l-3.5-3.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                        <img src={`/api/calibration-reports/${report.finish_id}/images/${img.filename}`}
                          alt={img.filename} className="w-full aspect-square object-cover" />
                        {img.score !== null && img.score !== undefined && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 text-center truncate">
                            {img.score.toFixed(2)}
                          </div>
                        )}
                      </button>
                        );
                      });
                    })()}
                  </div>
                )}

                {trialImages.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    trial 图片未找到（镜像资产未挂载）
                  </div>
                )}
              </div>

              {/* Confirm stage */}
              {report.confirm_stage?.candidates?.length && (
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-3">
                    确认阶段 (Top-{report.confirm_stage.top_k} @ {report.confirm_stage.samples}spp)
                  </div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-gray-400 text-xs"><th className="pb-2">Trial</th><th className="pb-2">搜索分</th><th className="pb-2">确认分</th></tr></thead>
                    <tbody>
                      {report.confirm_stage.candidates.map(c => (
                        <tr key={c.source_trial} className="border-b border-gray-50">
                          <td className="py-1.5">#{c.source_trial}</td>
                          <td className="py-1.5 font-mono">{c.search_score.toFixed(3)}</td>
                          <td className="py-1.5 font-mono">{c.confirm_score.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Product transfer validation (baseline vs candidate) */}
              {report.validation && (
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase">产品迁移验证</div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      report.validation.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {report.validation.reason || (report.validation.passed ? 'PASS' : 'FAIL')}
                    </span>
                  </div>
                  {report.validation.model_path && (
                    <div className="text-xs text-gray-400 mb-3 truncate" title={report.validation.model_path}>
                      模型: {report.validation.model_path}
                      {report.validation.product_category && ` · ${report.validation.product_category}`}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">校准前 (baseline)</div>
                      <img key={`baseline-${loadKey}`}
                        src={`/api/calibration-reports/${report.finish_id}/validation/product_baseline.png?_t=${loadKey}`}
                        alt="product baseline"
                        className="w-full rounded-lg border bg-gray-50"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      {report.validation.baseline_cv !== undefined && (
                        <div className="text-xs text-gray-400 mt-1">CV {report.validation.baseline_cv.toFixed(2)}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">校准后 (candidate)</div>
                      <img key={`candidate-${loadKey}`}
                        src={`/api/calibration-reports/${report.finish_id}/validation/product_candidate.png?_t=${loadKey}`}
                        alt="product candidate"
                        className="w-full rounded-lg border bg-gray-50"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      {report.validation.candidate_cv !== undefined && (
                        <div className="text-xs text-gray-400 mt-1">
                          CV {report.validation.candidate_cv.toFixed(2)}
                          {report.validation.cv_delta !== undefined && (
                            <span className={report.validation.cv_delta >= 0 ? ' text-green-600' : ' text-red-600'}>
                              {' '}(Δ {report.validation.cv_delta >= 0 ? '+' : ''}{report.validation.cv_delta.toFixed(2)})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'mapping' && (
        <div className="bg-white rounded-lg shadow border">
          <table className="w-full text-sm">
            <thead><tr className="text-left bg-gray-50"><th className="p-3 border-b font-medium text-gray-600">分类</th><th className="p-3 border-b font-medium text-gray-600">当前材质</th><th className="p-3 border-b font-medium text-gray-600">操作</th></tr></thead>
            <tbody>
              {mappings.map(m => (
                <MappingRow key={m.category_key} mapping={m} finishes={finishes}
                  onUpdate={() => axios.get('/api/category-finishes').then(r => setMappings(r.data.mappings || []))} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MappingRow({ mapping, finishes, onUpdate }: {
  mapping: Mapping;
  finishes: { id: string; label_zh: string }[];
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(mapping.finish_id);

  const handleSave = async () => {
    await axios.put(`/api/category-finishes/${mapping.category_key}`, { finish_id: pending });
    setEditing(false);
    onUpdate();
  };

  const handleReset = async () => {
    await axios.delete(`/api/category-finishes/${mapping.category_key}`);
    onUpdate();
  };

  const f = finishes.find(f => f.id === mapping.finish_id);
  const color = f?.principled?.base_color;
  const swatch = color ? `#${[0,1,2].map(i => Math.round((color[i]||0)*255).toString(16).padStart(2,'0')).join('')}` : '#ccc';

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="p-3 font-mono text-xs">{mapping.category_key}</td>
      <td className="p-3">
        {editing ? (
          <div className="flex items-center gap-2">
            <select value={pending} onChange={e => setPending(e.target.value)}
              className="text-xs border rounded px-2 py-1">
              {finishes.map(f => <option key={f.id} value={f.id}>{f.label_zh}</option>)}
            </select>
            <button onClick={handleSave}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">保存</button>
            <button onClick={() => setEditing(false)}
              className="px-2 py-1 bg-gray-100 text-xs rounded hover:bg-gray-200">取消</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block border" style={{ background: swatch }} />
            <span>{f?.label_zh || mapping.finish_id}</span>
            {mapping.overridden && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-50 text-yellow-600 rounded">自定义</span>}
          </div>
        )}
      </td>
      <td className="p-3">
        {!editing && (
          <div className="flex gap-2">
            <button onClick={() => { setPending(mapping.finish_id); setEditing(true); }}
              className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">编辑</button>
            {mapping.overridden && (
              <button onClick={handleReset}
                className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">重置</button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
