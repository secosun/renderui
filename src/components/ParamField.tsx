interface ParamFieldProps {
  keyName: string;
  param: TemplateParam;
  value: number | string;
  required: boolean;
  onChange: (key: string, value: string) => void;
}

export function ParamField({ keyName, param, value, required, onChange }: ParamFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {param.title || keyName}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {param.unit && <span className="text-gray-400 font-normal ml-1">({param.unit})</span>}
      </label>

      {param.enum ? (
        <select
          value={String(value ?? param.default ?? '')}
          onChange={e => onChange(keyName, e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          {param.enum.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : param.type === 'number' || param.type === 'integer' ? (
        <div className="flex items-center gap-3">
          <input
            type="range"
            value={String(value ?? param.default ?? 0)}
            onChange={e => onChange(keyName, e.target.value)}
            min={param.minimum ?? 0}
            max={param.maximum ?? 100}
            step={param.type === 'integer' ? 1 : 0.5}
            className="flex-1 accent-blue-600"
          />
          <input
            type="number"
            value={String(value ?? param.default ?? '')}
            onChange={e => onChange(keyName, e.target.value)}
            min={param.minimum}
            max={param.maximum}
            step={param.type === 'integer' ? 1 : 0.5}
            className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      ) : (
        <input
          type="text"
          value={String(value ?? param.default ?? '')}
          onChange={e => onChange(keyName, e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      )}

      <div className="flex gap-3 text-xs text-gray-400 mt-1">
        {param.description && <span className="flex-1">{param.description}</span>}
        {param.minimum !== undefined && param.type !== 'string' && (
          <span>范围: {param.minimum} ~ {param.maximum}</span>
        )}
      </div>
    </div>
  );
}
