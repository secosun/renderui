import { useState } from 'react';

const STEPS = [
  {
    title: '欢迎使用 CADRender',
    desc: '一站式参数化渲染平台，快速生成产品渲染图',
    icon: '🚀',
    target: 'hero',
  },
  {
    title: '第一步：选择模型',
    desc: '在模型库中浏览预设的参数化产品模板，点击进入配置',
    icon: '📦',
    target: 'models',
  },
  {
    title: '第二步：调整参数',
    desc: '修改尺寸参数，实时 3D 预览同步变化，选择渲染场景',
    icon: '⚙️',
    target: 'params',
  },
  {
    title: '第三步：提交渲染',
    desc: '一键提交，系统自动完成 FreeCAD 建模 → Blender 渲染全流程',
    icon: '🎨',
    target: 'render',
  },
  {
    title: '第四步：查看结果',
    desc: '渲染完成后在任务详情页预览和下载，所有结果自动存入资产库',
    icon: '✅',
    target: 'result',
  },
];

export function OnboardingGuide({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-[90vw]">
        <div className="text-4xl text-center mb-3">{s.icon}</div>
        <h3 className="text-lg font-bold text-center mb-2">{s.title}</h3>
        <p className="text-sm text-gray-500 text-center mb-6">{s.desc}</p>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i === step ? 'bg-blue-600 w-4' : 'bg-gray-300'}`} />
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onDone} className="text-sm text-gray-400 hover:text-gray-600 px-3">
            跳过
          </button>
          <div className="flex-1" />
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="text-sm px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              上一步
            </button>
          )}
          <button onClick={() => step < STEPS.length - 1 ? setStep(s => s + 1) : onDone()}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {step < STEPS.length - 1 ? '下一步' : '开始使用'}
          </button>
        </div>
      </div>
    </div>
  );
}
