import type { Finish } from '../api/client';

interface FinishPickerProps {
  finishes: Finish[];
  availableIds?: string[];
  value?: string;
  onChange: (finishId: string) => void;
}

function rgbaToHex(rgba: number[]): string {
  const toSRGB = (c: number) => {
    if (c <= 0.0031308) return Math.round((c * 12.92) * 255);
    return Math.round((1.055 * (c ** (1 / 2.4)) - 0.055) * 255);
  };
  const r = toSRGB(rgba[0] || 0);
  const g = toSRGB(rgba[1] || 0);
  const b = toSRGB(rgba[2] || 0);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function FinishPicker({ finishes, availableIds, value, onChange }: FinishPickerProps) {
  const list = availableIds
    ? finishes.filter(f => availableIds.includes(f.id))
    : finishes;

  if (list.length === 0) {
    return <div className="text-xs text-gray-400 py-2">暂无可用表面处理</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {list.map(f => {
        const hex = rgbaToHex(f.principled?.base_color || [0.5, 0.5, 0.5, 1.0]);
        const selected = value === f.id;
        return (
          <button
            type="button"
            key={f.id}
            onClick={() => onChange(f.id)}
            className={`
              relative overflow-hidden rounded-lg border p-3 text-left transition-all
              ${selected ? 'ring-2 ring-blue-500 border-blue-400' : 'border-gray-200 hover:border-gray-300'}
            `}
          >
            {/* Color background */}
            <div
              className="absolute inset-0 opacity-15"
              style={{ backgroundColor: hex }}
            />
            {/* Content */}
            <div className="relative flex items-center gap-2">
              <span
                className="inline-block w-6 h-6 rounded-md border border-gray-200 flex-shrink-0 shadow-sm"
                style={{ backgroundColor: hex }}
              />
              <div>
                <div className="text-xs font-medium text-gray-800">{f.label_zh}</div>
                <div className="text-[10px] text-gray-400">{f.id}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
