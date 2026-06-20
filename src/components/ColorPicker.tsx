import { useState, useMemo } from 'react';
import type { CatalogColor } from '../api/client';

interface ColorPickerProps {
  colors: Record<string, CatalogColor>;
  series: Record<string, string>;
  availableKeys?: string[];
  value?: string;
  onChange: (key: string) => void;
}

const SERIES_ORDER = [
  'legacy', 'white_black', 'grey', 'brown',
  'yellow', 'orange', 'red', 'violet', 'blue', 'green',
];

export function ColorPicker({ colors, series, availableKeys, value, onChange }: ColorPickerProps) {
  const [search, setSearch] = useState('');
  const [activeSeries, setActiveSeries] = useState('');

  // Filter and group colors
  const grouped = useMemo(() => {
    const all = availableKeys
      ? availableKeys.map(k => colors[k]).filter(Boolean)
      : Object.values(colors);

    const filtered = all.filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      return c.label_zh.includes(q) || c.label_en.toLowerCase().includes(q) || c.key.toLowerCase().includes(q);
    });

    const groups: Record<string, CatalogColor[]> = {};
    for (const c of filtered) {
      const s = c.series || 'other';
      if (!groups[s]) groups[s] = [];
      groups[s].push(c);
    }
    return groups;
  }, [colors, availableKeys, search]);

  const displayedSeries = activeSeries ? [activeSeries] : SERIES_ORDER.filter(s => grouped[s]?.length);

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索色号或名称..."
          className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Series tabs */}
      {!search && (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveSeries('')}
            className={`text-[10px] px-2 py-0.5 rounded-full ${!activeSeries ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >全部</button>
          {SERIES_ORDER.filter(s => grouped[s]?.length).map(s => (
            <button
              type="button"
              key={s}
              onClick={() => setActiveSeries(s)}
              className={`text-[10px] px-2 py-0.5 rounded-full ${activeSeries === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >{series[s] || s}</button>
          ))}
        </div>
      )}

      {/* Color grid */}
      <div className="max-h-60 overflow-y-auto space-y-1.5">
        {displayedSeries.map(s => (
          <div key={s}>
            {!search && (
              <div className="text-[10px] text-gray-400 font-medium mb-1 sticky top-0 bg-white py-0.5">{series[s] || s}</div>
            )}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
              {(grouped[s] || []).map(c => {
                const selected = value === c.key;
                return (
                  <button
                    type="button"
                    key={c.key}
                    onClick={() => onChange(c.key)}
                    className={`
                      flex items-center gap-1.5 p-1.5 rounded-md text-left transition-all text-[10px]
                      ${selected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50 border border-transparent'}
                    `}
                    title={`${c.label_en} ${c.label_zh}`}
                  >
                    <span
                      className="inline-block w-4 h-4 rounded flex-shrink-0 border border-gray-200"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="truncate text-gray-700 leading-tight">
                      {c.label_en || c.key}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {displayedSeries.length === 0 && (
          <div className="text-center py-6 text-gray-400 text-xs">无匹配颜色</div>
        )}
      </div>

      {/* Selected preview */}
      {value && colors[value] && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <span
            className="inline-block w-8 h-8 rounded-lg border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: colors[value].hex }}
          />
          <div className="text-xs">
            <div className="font-medium text-gray-800">{colors[value].label_en} — {colors[value].label_zh}</div>
            <div className="text-gray-400 font-mono">{colors[value].hex}</div>
          </div>
        </div>
      )}
    </div>
  );
}
