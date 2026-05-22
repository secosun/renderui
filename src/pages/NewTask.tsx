import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { listScenes, uploadModel, createTask, type Scene } from '../api/client';

const ALLOWED_TYPES = '.fcstd,.obj,.stl,.step,.stp,.fbx,.glb,.blend';

const CAMERA_ANGLES = [
  { value: 'three_quarter', label: '3/4 视角', description: '标准电商主图视角' },
  { value: 'front', label: '正面', description: '正面展示' },
  { value: 'side', label: '侧面', description: '侧面轮廓展示' },
  { value: 'top_down', label: '俯视', description: '俯视展示' },
  { value: 'detail', label: '细节特写', description: '局部放大特写' },
  { value: 'back', label: '背面', description: '背面展示' },
];

export function NewTask() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sceneId, setSceneId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [usePrompt, setUsePrompt] = useState(false);
  const [error, setError] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedAngles, setSelectedAngles] = useState<string[]>(['three_quarter']);
  const [uploadedModelUrl, setUploadedModelUrl] = useState('');
  const [modelId, setModelId] = useState('');
  const [taskName, setTaskName] = useState('');
  const [outputFormat, setOutputFormat] = useState('');

  useEffect(() => { listScenes().then(setScenes); }, []);

  const toggleAngle = (angle: string) => {
    setSelectedAngles(prev =>
      prev.includes(angle) ? prev.filter(a => a !== angle) : [...prev, angle]
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setUploadedModelUrl('');
    setModelId('');
    if (f) {
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (ext === 'glb' || ext === 'gltf') {
        const url = URL.createObjectURL(f);
        setUploadedModelUrl(url);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!file) { setError('请选择 3D 模型文件'); return; }
    if (!sceneId && !prompt) { setError('请选择场景预设或输入文字描述'); return; }

    setUploading(true);
    try {
      const result = await uploadModel(file);
      const storagePath = result.storage_path;
      setModelId(result.model_id);

      if (result.file_type === 'glb' || result.file_type === 'gltf') {
        setUploadedModelUrl(`/uploads/${storagePath}`);
      }

      setCreating(true);
      const cameraStyles = batchMode ? selectedAngles : undefined;
      const task = await createTask(
        result.model_id,
        usePrompt ? undefined : sceneId,
        usePrompt ? prompt : undefined,
        cameraStyles,
        taskName || undefined,
        outputFormat || undefined,
      );
      navigate(`/tasks/${task.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || '创建任务失败');
    } finally {
      setUploading(false);
      setCreating(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">新建渲染任务</h1>
      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* File upload */}
        <div className="bg-white p-6 rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">上传 3D 模型</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 cursor-pointer"
               onClick={() => fileRef.current?.click()}>
            {file ? (
              <div>
                <p className="text-blue-600 font-medium">{file.name}</p>
                <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <p className="text-gray-400">点击选择模型文件<br /><span className="text-xs">支持 {ALLOWED_TYPES}</span></p>
            )}
          </div>
          <input ref={fileRef} type="file" accept={ALLOWED_TYPES} className="hidden"
                 onChange={handleFileChange} />

          {/* 3D Preview for GLB files */}
          {uploadedModelUrl && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">模型预览</h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden" style={{ height: '300px' }}>
                <model-viewer
                  src={uploadedModelUrl}
                  alt="3D Model Preview"
                  auto-rotate
                  camera-controls
                  style={{ width: '100%', height: '100%' }}
                  shadow-intensity="1"
                  exposure="0.8"
                ></model-viewer>
              </div>
            </div>
          )}
        </div>

        {/* Task name */}
        <div className="bg-white p-6 rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">任务名称（选填）</label>
          <input value={taskName} onChange={e => setTaskName(e.target.value)}
            placeholder="例如：铝合金型材主图渲染"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
        </div>

        {/* Scene or Prompt */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <div className="flex gap-4">
            <button type="button" onClick={() => setUsePrompt(false)}
              className={`px-4 py-2 rounded text-sm ${!usePrompt ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              选择场景预设
            </button>
            <button type="button" onClick={() => setUsePrompt(true)}
              className={`px-4 py-2 rounded text-sm ${usePrompt ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              文字描述意图
            </button>
          </div>

          {!usePrompt ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">场景预设</label>
              <select value={sceneId} onChange={e => setSceneId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">-- 请选择 --</option>
                {scenes.map(s => (
                  <option key={s.id} value={s.id}>{s.name} — {s.description}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">渲染需求描述</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} maxLength={500}
                placeholder='例如："枪灰色金属质感，3/4视角，电商白底图"'
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              <p className="text-xs text-gray-400 mt-1">{prompt.length}/500</p>
            </div>
          )}
        </div>

        {/* Output format */}
        <div className="bg-white p-6 rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">输出格式</label>
          <div className="flex gap-4">
            {[
              { value: '', label: '默认 (PNG)' },
              { value: 'png', label: 'PNG' },
              { value: 'jpg', label: 'JPEG' },
              { value: 'webp', label: 'WebP' },
              { value: 'exr', label: 'EXR' },
            ].map(fmt => (
              <label key={fmt.value} className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer text-sm
                ${outputFormat === fmt.value ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="format" value={fmt.value}
                  checked={outputFormat === fmt.value}
                  onChange={e => setOutputFormat(e.target.value)}
                  className="sr-only" />
                {fmt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Batch mode toggle */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={batchMode}
                onChange={e => setBatchMode(e.target.checked)} />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-700">批量多角度渲染</span>
          </div>

          {batchMode && (
            <div>
              <p className="text-xs text-gray-500 mb-3">选择要渲染的角度（至少选择一个）</p>
              <div className="grid grid-cols-2 gap-2">
                {CAMERA_ANGLES.map(angle => (
                  <label key={angle.value}
                    className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-colors
                      ${selectedAngles.includes(angle.value)
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={selectedAngles.includes(angle.value)}
                      onChange={() => toggleAngle(angle.value)}
                      className="rounded text-blue-600 focus:ring-blue-500" />
                    <div>
                      <span className="text-sm font-medium">{angle.label}</span>
                      <p className="text-xs text-gray-400">{angle.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {batchMode && selectedAngles.length > 0 && (
                <p className="text-xs text-blue-600 mt-2">将渲染 {selectedAngles.length} 个角度</p>
              )}
            </div>
          )}
        </div>

        <button type="submit" disabled={uploading || creating || (batchMode && selectedAngles.length === 0)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
          {uploading ? '上传模型中...' : creating ? '创建任务中...' : '创建渲染任务'}
        </button>
      </form>
    </div>
  );
}
