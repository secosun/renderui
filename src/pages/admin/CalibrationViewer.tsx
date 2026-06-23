import { useState, useEffect, useRef, type ReactNode } from 'react';
import axios from 'axios';

interface PhaseBest {
  roughness?: number;
  metallic?: number;
  specular?: number;
  coat_weight?: number;
  coat_roughness?: number;
  bump_mult?: number;
  anisotropic?: number;
  anisotropic_rotation?: number;
  micro_scale?: number;
  micro_detail?: number;
  fine_scale?: number;
  rough_mix?: number;
  mapping_scale_x?: number;
  score?: number;
  phase?: string;
  best_trial?: number;
  tag?: string;
}

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
  calibration_phases?: {
    mode?: string;
    brush_mode?: string;
    texture_skipped?: boolean;
    texture_skip_reason?: string;
    texture_delegated_finish_id?: string;
    pbr?: PhaseBest;
    texture?: PhaseBest;
  };
  confirm_stage?: {
    top_k: number;
    samples: number;
    best_source_trial?: number;
    candidates: { source_trial: number; search_score: number; confirm_score: number; path?: string }[];
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

interface TrialImage {
  filename: string;
  trial_id: string;
  score: number | null;
  phase?: string;
  is_best?: boolean;
}

interface Mapping {
  category_key: string;
  finish_id: string;
  overridden: boolean;
}

interface CategoryCandidate {
  candidate_id: string;
  stage: number;
  trial: number;
  score: number;
  auto_rank: number;
  params: Record<string, number>;
  image: string;
  dims?: Record<string, number>;
}

interface TextureCalibrationReport {
  finish_id?: string;
  calibration_type?: string;
  reference_path?: string;
  n_trials_completed?: number;
  n_trials_requested?: number;
  search_samples?: number;
  elapsed_s?: number;
  best_score?: number;
  best_trial?: number;
  best_params?: Record<string, number>;
  trial_scores?: number[];
  review_images?: Record<string, string>;
  beauty_review_note?: string;
  proxy_review_note?: string;
  substrate_meta?: {
    substrate_finish_id?: string;
    paint_finish_id?: string;
    model?: string;
  };
}

interface CategoryReport {
  category: string;
  run_id: string;
  camera_mode: string;
  model_path?: string;
  use_vlm?: boolean;
  elapsed_s?: number;
  total_trials?: number;
  review_stage?: number;
  auto_best?: { score: number; params: Record<string, number>; image?: string };
  candidates?: CategoryCandidate[];
  human_pick?: { candidate_id: string; timestamp?: string };
  baseline_cv_score?: number;
  competitor_coarse_ok?: boolean;
  competitor_fine_ok?: boolean;
}

export function AdminCalibrationViewer() {
  const [finishName, setFinishName] = useState('');
  const [report, setReport] = useState<CalibrationReport | null>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [finishes, setFinishes] = useState<{ id: string; label_zh: string; deprecated?: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'viewer' | 'texture' | 'category' | 'mapping'>('viewer');
  const [trialImages, setTrialImages] = useState<TrialImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [navImages, setNavImages] = useState<TrialImage[]>([]);
  const [picking, setPicking] = useState(false);
  const [pickMsg, setPickMsg] = useState('');
  const [loadKey, setLoadKey] = useState(0);
  const [categoryName, setCategoryName] = useState('');
  const [cameraMode, setCameraMode] = useState<'fullshot' | 'detail'>('fullshot');
  const [categoryReport, setCategoryReport] = useState<CategoryReport | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [categoryPickMsg, setCategoryPickMsg] = useState('');
  const [categoryLoadKey, setCategoryLoadKey] = useState(0);
  const [recentCategories, setRecentCategories] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('calv_recent_cat') || '[]'); } catch { return []; }
  });
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('calv_recent') || '[]'); } catch { return []; }
  });
  const [recentTexture, setRecentTexture] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('calv_recent_tex') || '[]'); } catch { return []; }
  });
  const [textureFinishName, setTextureFinishName] = useState('');
  const [textureReport, setTextureReport] = useState<TextureCalibrationReport | null>(null);
  const [textureTrials, setTextureTrials] = useState<TrialImage[]>([]);
  const [textureLoading, setTextureLoading] = useState(false);
  const [textureError, setTextureError] = useState('');
  const [textureLoadKey, setTextureLoadKey] = useState(0);
  const [textureFinishIds, setTextureFinishIds] = useState<Set<string>>(new Set());
  const [materialFinishIds, setMaterialFinishIds] = useState<Set<string>>(new Set());
  const [infoMsg, setInfoMsg] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    axios.get('/api/category-finishes').then(r => setMappings(r.data.mappings || [])).catch(() => {});
    axios.get('/api/calibration-reports/texture/index')
      .then(r => setTextureFinishIds(new Set(r.data.finish_ids || [])))
      .catch(() => {});
    axios.get('/api/finishes')
      .then(async (r) => {
        const list = (r.data.finishes || []).filter((f: { deprecated?: boolean }) => !f.deprecated);
        setFinishes(list);
        const mat = new Set<string>();
        await Promise.all(list.map(async (f: { id: string }) => {
          try {
            const av = await axios.get(`/api/calibration-reports/${f.id}/availability`);
            if (av.data.material) mat.add(f.id);
          } catch { /* ignore */ }
        }));
        setMaterialFinishIds(mat);
      })
      .catch(() => {});
  }, []);

  const saveRecent = (name: string) => {
    const next = [name, ...recent.filter(n => n !== name)].slice(0, 10);
    setRecent(next);
    localStorage.setItem('calv_recent', JSON.stringify(next));
  };

  const saveRecentCategory = (name: string) => {
    const next = [name, ...recentCategories.filter(n => n !== name)].slice(0, 10);
    setRecentCategories(next);
    localStorage.setItem('calv_recent_cat', JSON.stringify(next));
  };

  const saveRecentTexture = (name: string) => {
    const next = [name, ...recentTexture.filter(n => n !== name)].slice(0, 10);
    setRecentTexture(next);
    localStorage.setItem('calv_recent_tex', JSON.stringify(next));
  };

  const loadTextureReportFor = async (name: string) => {
    if (!name) return false;
    setTextureLoading(true);
    setTextureError('');
    try {
      const [reportRes, trialsRes] = await Promise.all([
        axios.get(`/api/calibration-reports/texture/${name}`),
        axios.get(`/api/calibration-reports/texture/${name}/trials`).catch(() => ({ data: { images: [] } })),
      ]);
      setTextureReport(reportRes.data);
      setTextureTrials(trialsRes.data.images || []);
      setTextureFinishName(name);
      saveRecentTexture(name);
      setTab('texture');
      setTextureLoadKey(k => k + 1);
      return true;
    } catch (err: any) {
      setTextureError(err.response?.status === 404
        ? `未找到 "${name}" 的纹理校准，请先运行 calibrate.py --scope texture --finish-id ${name} --reference <蚁力crop>`
        : `加载失败: ${err.message}`);
      setTextureReport(null);
      return false;
    } finally {
      setTextureLoading(false);
    }
  };

  const loadTextureReport = async () => {
    await loadTextureReportFor(textureFinishName.trim());
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const finishParam = params.get('finish');
    if (tabParam === 'texture' && finishParam) {
      setTextureFinishName(finishParam);
      setFinishName(finishParam);
      setTab('texture');
      setTimeout(() => loadTextureReportFor(finishParam), 0);
    }
  }, []);

  const loadAnyFinishReport = async () => {
    const name = finishName.trim();
    if (!name) return;
    setInfoMsg('');
    setError('');
    try {
      const av = await axios.get(`/api/calibration-reports/${name}/availability`);
      const hasMat = Boolean(av.data.material);
      const hasTex = Boolean(av.data.texture);
      if (hasTex && !hasMat) {
        setFinishName(name);
        setInfoMsg(`「${name}」仅有纹理校准（蚁力参考图），已打开纹理对比视图。`);
        await loadTextureReportFor(name);
        return;
      }
      if (hasMat) {
        await loadReport();
        return;
      }
      if (hasTex) {
        setInfoMsg(`「${name}」同时可查看纹理校准，材质球 PBR 报告在「材质校准」页。`);
        await loadTextureReportFor(name);
        return;
      }
      setError(`未找到 "${name}" 的校准输出。材质: calibrate.py --scope material；纹理: --scope texture --reference <crop>`);
    } catch (err: any) {
      setError(`加载失败: ${err.message}`);
    }
  };

  const loadCategoryReport = async () => {
    const name = categoryName.trim();
    if (!name) return;
    setCategoryLoading(true);
    setCategoryError('');
    setSelectedCandidate(null);
    setCategoryPickMsg('');
    try {
      const res = await axios.get(`/api/category-calibration-reports/${name}`, {
        params: { camera_mode: cameraMode },
      });
      setCategoryReport(res.data);
      saveRecentCategory(name);
      setTab('category');
      setCategoryLoadKey(k => k + 1);
    } catch (err: any) {
      setCategoryError(err.response?.status === 404
        ? `未找到 "${name}" 的类目校准报告，请先运行 calibrate.py --mode category --category ${name}`
        : `加载失败: ${err.message}`);
      setCategoryReport(null);
    }
    setCategoryLoading(false);
  };

  const loadReport = async () => {
    const name = finishName.trim();
    if (!name) return;
    setLoading(true);
    setError('');
    setSelectedImage(null);
    setNavImages([]);
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
      if (err.response?.status === 404) {
        const opened = await loadTextureReportFor(name);
        if (opened) {
          setInfoMsg(`「${name}」无材质球 PBR 报告，已切换到纹理校准对比。`);
          setError('');
          return;
        }
      }
      setError(err.response?.status === 404
        ? `未找到 "${name}" 的材质校准报告。若只跑了纹理校准，请点「纹理校准」页签，或使用下方智能查看。`
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

  // Keyboard navigation: ← → within current gallery section
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedImage || navImages.length === 0) return;
      const idx = navImages.findIndex(i => i.filename === selectedImage);
      if (idx === -1) return;
      if (e.key === 'ArrowRight') {
        setSelectedImage(navImages[(idx + 1) % navImages.length].filename);
      } else if (e.key === 'ArrowLeft') {
        setSelectedImage(navImages[(idx - 1 + navImages.length) % navImages.length].filename);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedImage, navImages]);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">校准管理</h1>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 border-b pb-2">
        <button onClick={() => setTab('viewer')}
          className={`px-4 py-2 text-sm rounded-t ${tab === 'viewer' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-600'}`}>
          材质校准
        </button>
        <button onClick={() => setTab('texture')}
          className={`px-4 py-2 text-sm rounded-t ${tab === 'texture' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-600'}`}>
          纹理校准
        </button>
        <button onClick={() => setTab('category')}
          className={`px-4 py-2 text-sm rounded-t ${tab === 'category' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-600'}`}>
          类目校准
        </button>
        <button onClick={() => setTab('mapping')}
          className={`px-4 py-2 text-sm rounded-t ${tab === 'mapping' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-600'}`}>
          产品分类材质分配
        </button>
      </div>

      {tab === 'viewer' && (
        <>
          {/* Load bar */}
          <div className="mb-4">
            <div className="flex flex-nowrap items-center gap-3">
              <div className="flex flex-nowrap gap-2 items-center min-w-0">
                <select value={finishName} onChange={e => setFinishName(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm w-64 shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                  <option value="">— 选择材质 —</option>
                  {finishes.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.label_zh} ({f.id})
                      {textureFinishIds.has(f.id) && !materialFinishIds.has(f.id) ? ' · 纹理' : ''}
                      {materialFinishIds.has(f.id) ? ' · 材质' : ''}
                    </option>
                  ))}
                </select>
                <input value={finishName} onChange={e => setFinishName(e.target.value)}
                  placeholder="或直接输入 finish id"
                  className="px-3 py-2 border rounded-lg text-sm w-40 shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <button onClick={loadAnyFinishReport} disabled={loading || textureLoading}
                className="shrink-0 whitespace-nowrap px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading || textureLoading ? '加载中...' : '查看'}
              </button>
            </div>
            {finishName && textureFinishIds.has(finishName) && !materialFinishIds.has(finishName) && (
              <p className="text-xs text-amber-700 mt-2">
                {finishName} 已跑纹理校准，查看结果请用「纹理校准」页签或直接点「查看」（将自动跳转）。
              </p>
            )}
            {recent.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-xs text-gray-400">最近:</span>
                {recent.map(n => (
                  <button key={n} onClick={() => { setFinishName(n); setTimeout(loadReport, 0); }}
                    className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">{n}</button>
                ))}
              </div>
            )}
          </div>

          {infoMsg && <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-sm rounded">{infoMsg}</div>}

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
                  <div><div className="text-xs text-gray-400">模式</div><div className="text-lg font-semibold">
                    {report.calibration_phases?.texture_skip_reason === 'reference_texture_module'
                      ? '材质球 PBR'
                      : (report.calibration_phases?.mode === 'two_phase' ? '两阶段（球内）' : '单阶段')}
                  </div></div>
                  <div><div className="text-xs text-gray-400">搜索采样</div><div className="text-lg font-semibold">{report.search_samples || 256}</div></div>
                  <div><div className="text-xs text-gray-400">确认采样</div><div className="text-lg font-semibold">{report.confirm_samples || '-'}</div></div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  来源 {report.selected_from || 'search'}
                  {report.calibration_phases?.pbr?.score !== undefined && (
                    <span> · PBR {report.calibration_phases.pbr.score.toFixed(2)}</span>
                  )}
                  {report.calibration_phases?.texture?.score !== undefined && (
                    <span> · 纹理 {report.calibration_phases.texture.score.toFixed(2)}</span>
                  )}
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

              {/* Material ball: PBR (+ confirm). Texture → Texture tab / TextureModule */}
              <PhaseCalibrationReview
                report={report}
                trialImages={trialImages}
                loadKey={loadKey}
                selectedImage={selectedImage}
                onSelectImage={(fn, sectionImages) => {
                  setSelectedImage(fn);
                  setNavImages(sectionImages);
                }}
                onGoTexture={() => {
                  if (report.finish_id) {
                    setTextureFinishName(report.finish_id);
                    loadTextureReportFor(report.finish_id);
                  }
                }}
                hasTextureReport={report.finish_id ? textureFinishIds.has(report.finish_id) : false}
                picking={picking}
                pickMsg={pickMsg}
                onPick={async (filename) => {
                  if (!report.finish_id) return;
                  setPicking(true); setPickMsg('');
                  try {
                    await axios.post(`/api/calibration-reports/${report.finish_id}/select-trial`,
                      { filename });
                    setPickMsg('已保存为人眼最佳');
                  } catch (err: any) {
                    setPickMsg('保存失败: ' + (err.response?.data?.detail || err.message));
                  }
                  setPicking(false);
                }}
              />

              {/* Texture profile combo preview (post-calibration) */}
              {report.finish_id && (
                <TexturePreview finishId={report.finish_id} />
              )}

              {/* Product transfer validation (baseline vs candidate) */}
              {report.validation && (
                <div key={`validation-${loadKey}`} className="bg-white rounded-lg shadow p-4">
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

      {tab === 'category' && (
        <>
          <div className="mb-4">
            <div className="flex flex-nowrap items-center gap-3">
              <select value={categoryName} onChange={e => setCategoryName(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm w-64 shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                <option value="">— 选择产品类目 —</option>
                {mappings.map(m => (
                  <option key={m.category_key} value={m.category_key}>{m.category_key}</option>
                ))}
              </select>
              <input value={categoryName} onChange={e => setCategoryName(e.target.value)}
                placeholder="或直接输入 category key"
                className="px-3 py-2 border rounded-lg text-sm w-48 shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <select value={cameraMode} onChange={e => setCameraMode(e.target.value as 'fullshot' | 'detail')}
                className="px-3 py-2 border rounded-lg text-sm shrink-0 bg-white">
                <option value="fullshot">fullshot</option>
                <option value="detail">detail</option>
              </select>
              <button onClick={loadCategoryReport} disabled={categoryLoading}
                className="shrink-0 whitespace-nowrap px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {categoryLoading ? '加载中...' : '查看'}
              </button>
            </div>
            {recentCategories.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-xs text-gray-400">最近:</span>
                {recentCategories.map(n => (
                  <button key={n} onClick={() => { setCategoryName(n); setTimeout(loadCategoryReport, 0); }}
                    className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">{n}</button>
                ))}
              </div>
            )}
          </div>

          {categoryError && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded">{categoryError}</div>}

          {!categoryReport && !categoryLoading && !categoryError && (
            <div className="text-center py-16 text-gray-400 text-sm">
              <p className="mb-1">选择产品类目查看校准候选</p>
              <p className="text-xs">python scripts/calibrate.py --mode category --category &lt;key&gt; --no-auto-write</p>
            </div>
          )}

          {categoryReport && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div><span className="text-gray-400">类目</span> <span className="font-mono">{categoryReport.category}</span></div>
                  <div><span className="text-gray-400">相机</span> {categoryReport.camera_mode}</div>
                  <div><span className="text-gray-400">自动最佳</span> {categoryReport.auto_best?.score?.toFixed(2)}</div>
                  <div><span className="text-gray-400">试验</span> {categoryReport.total_trials}</div>
                  <div><span className="text-gray-400">耗时</span> {categoryReport.elapsed_s}s</div>
                  {categoryReport.human_pick && (
                    <div className="text-green-700">已人眼选定: {categoryReport.human_pick.candidate_id}</div>
                  )}
                </div>
              </div>

              {selectedCandidate && categoryReport.candidates && (
                <div className="bg-white rounded-lg shadow p-4">
                  {(() => {
                    const cand = categoryReport.candidates!.find(c => c.candidate_id === selectedCandidate);
                    if (!cand?.image) return null;
                    const cat = categoryReport.category;
                    const mode = categoryReport.camera_mode || cameraMode;
                    return (
                      <>
                        <img key={`cat-${categoryLoadKey}-${cand.image}`}
                          src={`/api/category-calibration-reports/${cat}/images/${cand.image}?camera_mode=${mode}&_t=${categoryLoadKey}`}
                          alt={cand.candidate_id}
                          className="w-full max-w-2xl mx-auto rounded-lg border shadow-lg" />
                        <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
                          <span className="text-xs text-gray-400">{cand.candidate_id} · score {cand.score.toFixed(2)}</span>
                          <button onClick={async () => {
                            setPicking(true); setCategoryPickMsg('');
                            try {
                              await axios.post(`/api/category-calibration-reports/${cat}/select-candidate`, {
                                candidate_id: selectedCandidate,
                                camera_mode: mode,
                              });
                              setCategoryPickMsg('已写入 product_presets.json');
                              loadCategoryReport();
                            } catch (err: any) {
                              setCategoryPickMsg('保存失败: ' + (err.response?.data?.detail || err.message));
                            }
                            setPicking(false);
                          }} disabled={picking}
                            className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                            {picking ? '保存中...' : '选为人眼最佳并写入 preset'}
                          </button>
                        </div>
                        {categoryPickMsg && <div className="text-center text-xs mt-2 text-green-600">{categoryPickMsg}</div>}
                        <div className="mt-3 text-xs text-gray-500 font-mono break-all">
                          {Object.entries(cand.params).slice(0, 8).map(([k, v]) => `${k}=${v}`).join(' · ')}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-3">
                  Top-{categoryReport.candidates?.length || 0} 候选 (Stage {categoryReport.review_stage})
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {(categoryReport.candidates || []).map(cand => (
                    <button key={cand.candidate_id}
                      onClick={() => setSelectedCandidate(
                        selectedCandidate === cand.candidate_id ? null : cand.candidate_id
                      )}
                      className={`relative rounded-lg border-2 overflow-hidden text-left transition-colors ${
                        selectedCandidate === cand.candidate_id ? 'border-blue-600 ring-2 ring-blue-300' : 'border-gray-200 hover:border-blue-400'
                      }`}>
                      {cand.auto_rank === 1 && (
                        <span className="absolute top-1 left-1 z-10 text-[10px] px-1 py-0.5 bg-amber-400 text-amber-900 rounded">AUTO #1</span>
                      )}
                      {cand.image ? (
                        <img src={`/api/category-calibration-reports/${categoryReport.category}/images/${cand.image}?camera_mode=${categoryReport.camera_mode || cameraMode}&_t=${categoryLoadKey}`}
                          alt={cand.candidate_id}
                          className="w-full aspect-square object-cover bg-gray-50"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-xs text-gray-400">无图</div>
                      )}
                      <div className="p-2 text-xs">
                        <div className="font-mono">{cand.candidate_id}</div>
                        <div className="text-gray-500">{cand.score.toFixed(2)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'texture' && (
        <>
          <div className="mb-4">
            <div className="flex flex-nowrap items-center gap-3">
              <select value={textureFinishName} onChange={e => setTextureFinishName(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm w-64 shrink-0 bg-white">
                <option value="">— 选择材质 —</option>
                {finishes.map(f => (
                  <option key={f.id} value={f.id}>{f.label_zh} ({f.id})</option>
                ))}
              </select>
              <input value={textureFinishName} onChange={e => setTextureFinishName(e.target.value)}
                placeholder="finish id"
                className="px-3 py-2 border rounded-lg text-sm w-40 shrink-0" />
              <button onClick={loadTextureReport} disabled={textureLoading}
                className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {textureLoading ? '加载中...' : '查看'}
              </button>
            </div>
            {recentTexture.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-xs text-gray-400">最近:</span>
                {recentTexture.map(n => (
                  <button key={n} onClick={() => { setTextureFinishName(n); setTimeout(loadTextureReport, 0); }}
                    className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">{n}</button>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">
              命令: calibrate.py --scope texture --finish-id &lt;id&gt; --reference outputs/yili_crops/&lt;id&gt;/&lt;id&gt;_crop.png
            </p>
          </div>

          {textureError && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded">{textureError}</div>}

          {!textureReport && !textureLoading && !textureError && (
            <div className="text-center py-16 text-gray-400 text-sm">
              <p>选择 finish 查看纹理校准 Beauty / 参考对比</p>
            </div>
          )}

          {textureReport && textureReport.finish_id && (
            <TextureCalibrationReview
              report={textureReport}
              trials={textureTrials}
              loadKey={textureLoadKey}
            />
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
  finishes: { id: string; label_zh: string; deprecated?: boolean }[];
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


function calImageUrl(finishId: string, filename: string, review = true): string {
  const path = review ? reviewFilename(filename) : filename;
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `/api/calibration-reports/${finishId}/images/${encoded}`;
}

function reviewFilename(base: string): string {
  const i = base.lastIndexOf('.');
  if (i === -1) return `${base}_review`;
  return `${base.slice(0, i)}_review${base.slice(i)}`;
}

function parseTrialParams(trialId: string): [string, string][] {
  const m = trialId.match(/^\w+_\d+_(.+)$/);
  if (!m) return [];
  const suffix = m[1];
  const parts = suffix.split('_');
  const result: [string, string][] = [];
  const labelMap: Record<string, string> = {
    r: 'roughness', m: 'metallic', s: 'specular',
    a: 'aniso', cw: 'coat', cr: 'coat_r',
    bm: 'bump', rm: 'rough_mix', sx: 'scale_x',
    rw: 'ramp_w', av: 'aniso_v',
  };
  for (const p of parts) {
    const kv = p.match(/^([a-z]+)([\d.]+)$/);
    if (kv) {
      const key = labelMap[kv[1]] || kv[1];
      result.push([key, kv[2]]);
    }
  }
  return result;
}

function inferTrialPhase(img: TrialImage): string {
  if (img.phase) return img.phase;
  if (img.filename.startsWith('pbr/') || img.trial_id.startsWith('pbr_')) return 'pbr';
  if (img.filename.startsWith('texture/') || img.trial_id.startsWith('tex_')) return 'texture';
  if (img.trial_id.startsWith('confirm_t')) return 'confirm';
  return 'legacy';
}

function phaseBestTrialPrefix(
  phase: 'pbr' | 'texture',
  images: TrialImage[],
  phaseBest?: PhaseBest,
): string | null {
  if (phaseBest?.best_trial !== undefined) {
    const prefix = `${phase === 'pbr' ? 'pbr' : 'tex'}_${String(phaseBest.best_trial).padStart(3, '0')}`;
    if (images.some(i => i.trial_id.startsWith(prefix))) return prefix;
  }
  if (phase === 'pbr' && phaseBest?.roughness !== undefined) {
    let best: TrialImage | null = null;
    let bestDiff = Infinity;
    for (const img of images) {
      const m = img.trial_id.match(/^(pbr_\d+)_r([\d.]+)/);
      if (!m) continue;
      const diff = Math.abs(parseFloat(m[2]) - phaseBest.roughness);
      if (diff < bestDiff) { bestDiff = diff; best = img; }
    }
    if (best && bestDiff < 0.01) {
      const m = best.trial_id.match(/^(pbr_\d+)/);
      return m ? m[1] : null;
    }
  }
  if (phase === 'texture' && phaseBest?.bump_mult !== undefined) {
    let best: TrialImage | null = null;
    let bestDiff = Infinity;
    for (const img of images) {
      const m = img.trial_id.match(/^(tex_\d+)_bm([\d.]+)/);
      if (!m) continue;
      const diff = Math.abs(parseFloat(m[2]) - phaseBest.bump_mult);
      if (diff < bestDiff) { bestDiff = diff; best = img; }
    }
    if (best && bestDiff < 0.05) {
      const m = best.trial_id.match(/^(tex_\d+)/);
      return m ? m[1] : null;
    }
  }
  return null;
}

function splitTrialImages(images: TrialImage[]) {
  const pbr: TrialImage[] = [];
  const texture: TrialImage[] = [];
  const confirm: TrialImage[] = [];
  const legacy: TrialImage[] = [];
  for (const img of images) {
    const phase = inferTrialPhase(img);
    if (phase === 'pbr') pbr.push(img);
    else if (phase === 'texture') texture.push(img);
    else if (phase === 'confirm') confirm.push(img);
    else legacy.push(img);
  }
  return { pbr, texture, confirm, legacy };
}

function PhaseParamsBar({ label, params, keys }: {
  label: string;
  params?: PhaseBest;
  keys: { key: keyof PhaseBest; fmt?: (v: number) => string }[];
}) {
  if (!params) return null;
  const items = keys
    .map(({ key, fmt }) => {
      const v = params[key];
      if (v === undefined || v === null) return null;
      const text = typeof v === 'number' ? (fmt ? fmt(v) : v.toFixed(3)) : String(v);
      return `${key}=${text}`;
    })
    .filter(Boolean);
  if (!items.length) return null;
  return (
    <div className="mb-3 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 font-mono">
      <span className="text-slate-400 mr-2">{label}</span>
      {items.join(' · ')}
      {params.score !== undefined && (
        <span className="ml-2 text-blue-600">score {params.score.toFixed(2)}</span>
      )}
    </div>
  );
}

function CalTrialThumb({
  finishId,
  img,
  selected,
  highlight,
  onClick,
}: {
  finishId: string;
  img: TrialImage;
  selected: boolean;
  highlight?: boolean;
  onClick: () => void;
}) {
  const [src, setSrc] = useState(() => calImageUrl(finishId, img.filename, true));
  return (
    <button type="button" onClick={onClick}
      className={`relative rounded-lg border-2 overflow-hidden hover:border-blue-400 transition-colors ${
        selected ? 'border-blue-600 ring-2 ring-blue-300' : 'border-gray-200'
      }`}>
      {highlight && (
        <div className="absolute top-1 right-1 z-10 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center shadow">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-white" fill="currentColor">
            <path d="M13.5 4.5L6 12l-3.5-3.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
      <img
        src={src}
        alt={img.filename}
        className="w-full aspect-square object-cover bg-gray-100"
        onError={() => setSrc(calImageUrl(finishId, img.filename, false))}
      />
      {img.score !== null && img.score !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 text-center truncate">
          {img.score.toFixed(2)}
        </div>
      )}
    </button>
  );
}

function TrialGallerySection({
  finishId,
  title,
  step,
  images,
  gridPhase,
  loadKey,
  selectedImage,
  onSelectImage,
  lockedParams,
  highlightTrialId,
  emptyHint,
}: {
  finishId: string;
  title: string;
  step: number;
  images: TrialImage[];
  gridPhase?: string;
  loadKey: number;
  selectedImage: string | null;
  onSelectImage: (fn: string | null, section: TrialImage[]) => void;
  lockedParams?: ReactNode;
  highlightTrialId?: string | null;
  emptyHint?: string;
}) {
  const [showGrid, setShowGrid] = useState(false);
  if (images.length === 0 && !lockedParams) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{step}</span>
          <div className="text-xs font-semibold text-gray-500 uppercase">{title}</div>
          {images.length > 0 && (
            <span className="text-xs text-gray-400">({images.length})</span>
          )}
        </div>
        {gridPhase && images.length > 0 && (
          <button type="button" onClick={() => setShowGrid(!showGrid)}
            className="text-xs text-blue-600 hover:underline">
            {showGrid ? '关闭汇总图' : '查看汇总图'}
          </button>
        )}
      </div>

      {lockedParams}

      {showGrid && gridPhase && (
        <img
          src={`/api/calibration-reports/${finishId}/grid?phase=${gridPhase}&_t=${loadKey}`}
          alt={`${title} grid`}
          className="w-full rounded-lg border mb-4"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}

      {(() => {
        const sel = selectedImage && images.find(i => i.filename === selectedImage);
        if (!sel) return null;
        const params = parseTrialParams(sel.trial_id);
        return (
          <div className="mb-4 flex gap-4 items-start">
            <div className="shrink-0 w-full max-w-lg">
              <img
                key={`sel-${loadKey}-${selectedImage}`}
                src={calImageUrl(finishId, selectedImage, true)}
                alt={selectedImage}
                className="w-full rounded-lg border shadow-lg bg-gray-50"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = calImageUrl(finishId, selectedImage, false);
                }}
              />
            </div>
            {params.length > 0 && (
              <div className="text-xs font-mono bg-gray-50 rounded-lg border p-3 min-w-32 whitespace-nowrap">
                <div className="text-gray-500 uppercase font-semibold mb-1.5 not-mono">参数</div>
                {params.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-0.5">
                    <span className="text-gray-400">{k}</span>
                    <span className="text-gray-700 font-medium">{v}</span>
                  </div>
                ))}
                {sel.score !== null && sel.score !== undefined && (
                  <div className="flex justify-between gap-4 py-0.5 border-t border-gray-200 mt-1.5 pt-1.5">
                    <span className="text-gray-400">score</span>
                    <span className="text-blue-600 font-semibold">{sel.score.toFixed(4)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {images.length > 0 ? (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {images.map(img => (
            <CalTrialThumb
              key={img.filename}
              finishId={finishId}
              img={img}
              selected={selectedImage === img.filename}
              highlight={!!highlightTrialId && img.trial_id.startsWith(highlightTrialId)}
              onClick={() => onSelectImage(
                selectedImage === img.filename ? null : img.filename,
                images,
              )}
            />
          ))}
        </div>
      ) : (
        emptyHint && <div className="text-center py-4 text-gray-400 text-sm">{emptyHint}</div>
      )}
    </div>
  );
}

function PhaseCalibrationReview({
  report,
  trialImages,
  loadKey,
  selectedImage,
  onSelectImage,
  picking,
  pickMsg,
  onPick,
  onGoTexture,
  hasTextureReport,
}: {
  report: CalibrationReport;
  trialImages: TrialImage[];
  loadKey: number;
  selectedImage: string | null;
  onSelectImage: (fn: string | null, section: TrialImage[]) => void;
  picking: boolean;
  pickMsg: string;
  onPick: (filename: string) => void;
  onGoTexture?: () => void;
  hasTextureReport?: boolean;
}) {
  const finishId = report.finish_id || '';
  const { pbr, texture, confirm, legacy } = splitTrialImages(trialImages);
  const isTwoPhase = report.calibration_phases?.mode === 'two_phase' || pbr.length > 0 || texture.length > 0;

  const bestConfirm = report.confirm_stage?.candidates?.length
    ? report.confirm_stage.candidates.reduce((a, b) =>
        (a.confirm_score || 0) >= (b.confirm_score || 0) ? a : b
      )
    : null;
  const confirmTrial = report.confirm_stage?.best_source_trial ?? bestConfirm?.source_trial;
  const bestConfirmId = confirmTrial !== undefined
    ? `confirm_t${String(confirmTrial).padStart(3, '0')}`
    : null;
  const bestPbrId = phaseBestTrialPrefix('pbr', pbr, report.calibration_phases?.pbr);
  const bestTexId = phaseBestTrialPrefix('texture', texture, report.calibration_phases?.texture);

  const brushMode = report.calibration_phases?.brush_mode || '';
  const isWaveBrush = brushMode === 'wave';
  const textureSkipped = Boolean(report.calibration_phases?.texture_skipped);
  const texSkipReason = report.calibration_phases?.texture_skip_reason || '';
  const textureDelegated =
    textureSkipped &&
    (texSkipReason === 'reference_texture_module' || texSkipReason === 'texture_profile');
  const phase2Title = textureDelegated
    ? '漆面纹理（TextureModule · 独立模块）'
    : (isWaveBrush ? '程序化方向纹理' : '纹理细节');
  const texKeys: { key: keyof PhaseBest; fmt?: (v: number) => string }[] = isWaveBrush
    ? [
        { key: 'bump_mult', fmt: v => `×${v.toFixed(2)}` },
        { key: 'mapping_scale_x', fmt: v => v.toFixed(0) },
      ]
    : [
        { key: 'bump_mult', fmt: v => `×${v.toFixed(2)}` },
        { key: 'micro_scale', fmt: v => v.toFixed(0) },
        { key: 'fine_scale', fmt: v => v.toFixed(0) },
        { key: 'rough_mix' },
      ];
  const textureEmptyHint = textureSkipped
    ? (texSkipReason === 'reference_texture_module'
      ? `球体阶段仅校准铝基材+漆层 PBR；漆面纹理（${finishId}）在上方「纹理校准」标签查看 reference trial 与三栏对比图`
      : texSkipReason === 'texture_profile'
        ? `球体不写 bakecoat 纹理；${finishId} 漆面参数在「纹理校准」标签（蚁力 reference）`
        : texSkipReason === 'skip_texture'
          ? 'Phase 2 已跳过（--skip-texture 或 legacy 单阶段）'
          : 'Phase 2 已跳过（无 bakecoat 或已绑定 texture_profile）')
    : (isWaveBrush
      ? '无方向纹理 trial 图（texture/ 目录为空或未挂载 calibrate_out）'
      : '无球内纹理 trial 图');

  const pbrKeys: { key: keyof PhaseBest; fmt?: (v: number) => string }[] = [
    { key: 'roughness' }, { key: 'metallic' }, { key: 'specular' },
    { key: 'anisotropic' }, { key: 'coat_weight' },
  ];
  const lockedPbrKeys = brushMode
    ? pbrKeys.filter(k => k.key !== 'anisotropic')
    : pbrKeys;

  const pickable = selectedImage && (
    selectedImage.includes('trial_') || selectedImage.includes('pbr_')
    || selectedImage.includes('tex_') || selectedImage.includes('confirm_')
  );

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-gray-500 uppercase px-1">分阶段复核</div>

      {isTwoPhase ? (
        <>
          <TrialGallerySection
            finishId={finishId}
            step={1}
            title="PBR 宏观（材质球）"
            images={pbr}
            gridPhase="pbr"
            loadKey={loadKey}
            selectedImage={selectedImage}
            onSelectImage={onSelectImage}
            lockedParams={
              <PhaseParamsBar label="Phase 1 最优" params={report.calibration_phases?.pbr} keys={pbrKeys} />
            }
            emptyHint="无 PBR trial 图（可能为旧版平铺目录或未挂载 calibrate_out）"
            highlightTrialId={bestPbrId}
          />

          {textureDelegated ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700">
              <div className="font-medium mb-1">纹理不在材质球阶段校准</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                按当前设计，球体只负责 PBR（铝基材 + 漆层）；<strong>{finishId}</strong> 的漆面纹理由
                <strong> TextureModule</strong>（平板 + 蚁力参考图）独立搜索，trial 与三栏对比在「纹理校准」页签。
              </p>
              {onGoTexture && (
                <button
                  type="button"
                  onClick={onGoTexture}
                  className="mt-3 text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {hasTextureReport ? '打开纹理校准结果' : '前往纹理校准页签'}
                </button>
              )}
            </div>
          ) : (
            <TrialGallerySection
              finishId={finishId}
              step={2}
              title={phase2Title}
              images={texture}
              gridPhase="texture"
              loadKey={loadKey}
              selectedImage={selectedImage}
              onSelectImage={onSelectImage}
              lockedParams={
                <>
                  <PhaseParamsBar label="锁定 PBR" params={report.calibration_phases?.pbr} keys={lockedPbrKeys} />
                  <PhaseParamsBar label={isWaveBrush ? 'Phase 2 方向纹理最优' : 'Phase 2 最优'} params={report.calibration_phases?.texture} keys={texKeys} />
                </>
              }
              emptyHint={textureEmptyHint}
              highlightTrialId={bestTexId}
            />
          )}

          <TrialGallerySection
            finishId={finishId}
            step={textureDelegated ? 2 : 3}
            title={`确认 @ ${report.confirm_stage?.samples || 1024}spp`}
            images={confirm}
            loadKey={loadKey}
            selectedImage={selectedImage}
            onSelectImage={onSelectImage}
            highlightTrialId={bestConfirmId}
            emptyHint="无 confirm 图（可能使用了 --skip-confirm）"
          />
        </>
      ) : (
        <TrialGallerySection
          finishId={finishId}
          step={1}
          title="搜索 Trial"
          images={legacy.length ? legacy : trialImages}
          loadKey={loadKey}
          selectedImage={selectedImage}
          onSelectImage={onSelectImage}
          emptyHint="trial 图片未找到（镜像资产未挂载）"
        />
      )}

      {report.confirm_stage?.candidates?.length ? (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-3">
            确认分数表 (Top-{report.confirm_stage.top_k})
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs">
                <th className="pb-2">Trial</th>
                <th className="pb-2">搜索分</th>
                <th className="pb-2">确认分</th>
              </tr>
            </thead>
            <tbody>
              {report.confirm_stage.candidates.map(c => (
                <tr key={c.source_trial} className="border-b border-gray-50">
                  <td className="py-1.5">#{c.source_trial}</td>
                  <td className="py-1.5 font-mono">{c.search_score.toFixed(3)}</td>
                  <td className="py-1.5 font-mono font-semibold">{c.confirm_score.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selectedImage && pickable && (
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={() => onPick(selectedImage)} disabled={picking}
            className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
            {picking ? '保存中...' : '选择为人眼最佳'}
          </button>
          {pickMsg && <span className="text-xs text-green-600">{pickMsg}</span>}
        </div>
      )}

      {!isTwoPhase && trialImages.length > 0 && (
        <div className="text-center">
          <a href={`/api/calibration-reports/${finishId}/grid`} target="_blank" rel="noreferrer"
            className="text-xs text-blue-600 hover:underline">查看全量汇总图</a>
        </div>
      )}
    </div>
  );
}


function TextureCalibrationReview({
  report,
  trials,
  loadKey,
}: {
  report: TextureCalibrationReport;
  trials: TrialImage[];
  loadKey: number;
}) {
  const finishId = report.finish_id || '';
  const review = report.review_images || {};
  const imgUrl = (name: string) =>
    `/api/calibration-reports/texture/${finishId}/images/${name}?_t=${loadKey}`;

  const texParamKeys: { key: string; label: string }[] = [
    { key: 'bump_strength', label: 'Bump' },
    { key: 'micro_scale', label: 'Micro scale' },
    { key: 'micro_detail', label: 'Micro detail' },
    { key: 'fine_scale', label: 'Fine scale' },
    { key: 'fine_detail', label: 'Fine detail' },
    { key: 'rough_mix_factor', label: 'Rough mix' },
    { key: 'rough_ramp_to_min', label: 'Ramp min' },
    { key: 'rough_ramp_to_max', label: 'Ramp max' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-3">纹理校准概览</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><div className="text-xs text-gray-400">Finish</div><div className="font-semibold">{finishId}</div></div>
          <div><div className="text-xs text-gray-400">Best score</div><div className="font-semibold font-mono">{report.best_score?.toFixed(4) ?? '-'}</div></div>
          <div><div className="text-xs text-gray-400">Best trial</div><div className="font-semibold">#{report.best_trial ?? '-'}</div></div>
          <div><div className="text-xs text-gray-400">Trials</div><div className="font-semibold">{report.n_trials_completed ?? '-'}</div></div>
        </div>
        {report.reference_path && (
          <div className="mt-2 text-xs text-gray-400 truncate">参考: {report.reference_path}</div>
        )}
        {report.substrate_meta?.substrate_finish_id && (
          <div className="mt-1 text-xs text-gray-500">
            铝基材: {report.substrate_meta.substrate_finish_id} · 漆面: {report.substrate_meta.paint_finish_id || finishId}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Beauty vs 参考对比</div>
        <p className="text-xs text-gray-400 mb-3">
          合成图可能抹平细颗粒，请点开下方单张 Beauty / Roughness 查看。右栏为伪彩色粗糙度可视化（蓝低黄高）。
        </p>
        {(report.beauty_review_note || report.proxy_review_note) && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-2 mb-3 space-y-1">
            {report.beauty_review_note && <p>{report.beauty_review_note}</p>}
            {report.proxy_review_note && <p>{report.proxy_review_note}</p>}
          </div>
        )}
        {review.compare_triple ? (
          <img src={imgUrl(review.compare_triple)} alt="compare triple"
            className="w-full rounded border bg-black mb-3" />
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {review.reference && (
              <div>
                <div className="text-xs text-gray-500 mb-1">参考</div>
                <img src={imgUrl(review.reference)} className="w-full rounded border" alt="reference" />
              </div>
            )}
            {review.beauty_best && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Beauty（审查）</div>
                <img src={imgUrl(review.beauty_best)} className="w-full rounded border bg-gray-900" alt="beauty" />
              </div>
            )}
            {review.proxy_best && (
              <div>
                <div className="text-xs text-gray-500 mb-1">粗糙度伪彩色</div>
                <img src={imgUrl(review.proxy_best)} className="w-full rounded border bg-black" alt="proxy" />
              </div>
            )}
        </div>
        {review.compare_beauty_ref && (
          <div className="mt-3">
            <div className="text-xs text-gray-500 mb-1">参考 vs Beauty</div>
            <img src={imgUrl(review.compare_beauty_ref)} className="w-full max-w-2xl rounded border" alt="compare pair" />
          </div>
        )}
      </div>

      {report.best_params && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-3">最优 bakecoat 参数</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm font-mono">
            {texParamKeys.map(({ key, label }) => {
              const v = report.best_params?.[key];
              if (v === undefined) return null;
              return (
                <div key={key} className="bg-gray-50 rounded px-2 py-1">
                  <span className="text-gray-500 text-xs">{label}</span>
                  <div>{typeof v === 'number' ? v.toFixed(4) : v}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {trials.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-3">
            搜索 Trial（Roughness 代理 pass）
          </div>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {trials.map(t => (
              <div key={t.filename}
                className={`rounded border overflow-hidden ${t.is_best ? 'ring-2 ring-green-500' : ''}`}>
                <img src={imgUrl(t.filename)} alt={t.trial_id}
                  className="w-full aspect-square object-cover bg-black" />
                <div className="p-1 text-[10px] text-center text-gray-500">
                  {t.trial_id.replace('trial_', '#')}
                  {t.score != null && <span className="font-mono"> · {t.score.toFixed(3)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function TexturePreview({ finishId }: { finishId: string }) {
  const [textures, setTextures] = useState<{ id: string; label_zh?: string }[]>([]);
  const [selectedTex, setSelectedTex] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    axios.get('/api/texture-profiles')
      .then(r => setTextures(r.data.profiles || []))
      .catch(() => {});
  }, []);

  const handlePreview = async () => {
    if (!selectedTex) return;
    setLoading(true);
    setError('');
    setPreviewUrl('');
    try {
      const res = await axios.get('/api/preview/render', {
        params: { finish_id: finishId, texture_profile_id: selectedTex, samples: 128 },
      });
      setPreviewUrl(res.data.image_url);
      setPreviewKey(k => k + 1);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || '渲染失败');
    }
    setLoading(false);
  };

  if (textures.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-xs font-semibold text-gray-500 uppercase mb-3">纹理组合</div>
      <div className="flex items-end gap-3 mb-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">切换纹理</label>
          <select value={selectedTex} onChange={e => setSelectedTex(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white w-48">
            <option value="">— 选择纹理 —</option>
            {textures.map(t => (
              <option key={t.id} value={t.id}>{t.label_zh || t.id}</option>
            ))}
          </select>
        </div>
        <button onClick={handlePreview} disabled={loading || !selectedTex}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {loading ? '渲染中...' : '预览'}
        </button>
      </div>
      {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
      {previewUrl && (
        <div>
          <div className="text-xs text-gray-500 mb-1">{finishId} + {selectedTex}</div>
          <img key={`texprev-${previewKey}`} src={previewUrl}
            className="w-48 rounded-lg border shadow-sm bg-white" />
        </div>
      )}
    </div>
  );
}
