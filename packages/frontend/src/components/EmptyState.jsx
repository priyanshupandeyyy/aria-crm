export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Icon size={24} className="text-gray-400" />
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>

      {description && (
        <p className="mt-1 text-sm text-gray-400 max-w-sm">{description}</p>
      )}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-4 py-2 text-sm font-medium text-white rounded-lg bg-brand-primary hover:opacity-90 transition-opacity"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
