interface Scene {
  id: string;
  name: string;
  description?: string;
}

interface ScenePickerProps {
  scenes: Scene[];
  value?: string;
  onChange: (sceneId: string) => void;
}

const SCENE_VISUALS: Record<string, { gradient: string; label: string }> = {
  studio_neutral: {
    gradient: 'from-gray-100 via-gray-200 to-gray-300',
    label: '中性',
  },
  studio_high_key: {
    gradient: 'from-white via-gray-50 to-gray-100',
    label: '明亮',
  },
  studio_dark: {
    gradient: 'from-gray-800 via-gray-600 to-gray-900',
    label: '暗调',
  },
  studio_soft: {
    gradient: 'from-blue-50 via-purple-50 to-pink-50',
    label: '柔和',
  },
  outdoor_overcast: {
    gradient: 'from-gray-300 via-blue-200 to-gray-400',
    label: '阴天',
  },
  outdoor_sunset: {
    gradient: 'from-orange-300 via-pink-400 to-purple-500',
    label: '暖阳',
  },
};

export function ScenePicker({ scenes, value, onChange }: ScenePickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {scenes.map(s => {
        const vis = SCENE_VISUALS[s.id] || { gradient: 'from-gray-100 to-gray-200', label: '' };
        const selected = value === s.id;
        return (
          <button
            type="button"
            key={s.id}
            onClick={() => onChange(s.id)}
            className={`
              rounded-lg border overflow-hidden text-left transition-all
              ${selected ? 'ring-2 ring-blue-500 border-blue-400' : 'border-gray-200 hover:shadow-sm'}
            `}
          >
            {/* Visual preview */}
            <div className={`h-14 bg-gradient-to-br ${vis.gradient} flex items-center justify-center`}>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/70 text-gray-700">
                {vis.label}
              </span>
            </div>
            {/* Info */}
            <div className="p-2">
              <div className="text-xs font-medium text-gray-800 truncate">{s.name}</div>
              {s.description && (
                <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{s.description}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
