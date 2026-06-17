interface TemplateCardProps {
  template: Template;
  selected: boolean;
  onSelect: (t: Template) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  aluminum: '铝型材',
  steel: '钢材',
  plastic: '塑料件',
  furniture: '家具',
  hardware: '五金件',
  packaging: '包装',
  machinery: '机械件',
};

const CATEGORY_COLORS: Record<string, string> = {
  aluminum: 'bg-blue-100 text-blue-700',
  steel: 'bg-gray-100 text-gray-700',
  plastic: 'bg-green-100 text-green-700',
  furniture: 'bg-amber-100 text-amber-700',
  hardware: 'bg-purple-100 text-purple-700',
  packaging: 'bg-pink-100 text-pink-700',
  machinery: 'bg-orange-100 text-orange-700',
};

export function TemplateCard({ template, selected, onSelect }: TemplateCardProps) {
  const colorClass = CATEGORY_COLORS[template.category] || 'bg-gray-100 text-gray-600';

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={`p-4 rounded-lg border text-left transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 shadow-sm'
          : 'border-gray-200 hover:border-blue-300 hover:shadow-sm hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-gray-900">{template.name}</div>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${colorClass}`}>
          {CATEGORY_LABELS[template.category] || template.category}
        </span>
      </div>
      <div className="text-sm text-gray-500 mt-1 line-clamp-2">{template.description}</div>
      {template.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {template.tags.slice(0, 4).map(tag => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{tag}</span>
          ))}
        </div>
      )}
    </button>
  );
}
