export default function StatCard({ title, value, subtitle, icon: Icon, color = '#D4A853', loading = false }) {
  const isSkeleton = loading || value === undefined || value === '—' || value === '';

  if (isSkeleton) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 relative overflow-hidden">
        <div className="animate-pulse">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-gray-100" />
          <div className="h-9 bg-gray-200 rounded-md w-20 mt-1 mb-1" />
          <div className="h-4 bg-gray-100 rounded w-28 mt-2" />
          {subtitle && <div className="h-3 bg-gray-50 rounded w-32 mt-3" />}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 relative overflow-hidden">
      {/* Icon badge */}
      {Icon && (
        <div
          className="absolute top-4 right-4 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}18` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
      )}

      {/* Value */}
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>

      {/* Title */}
      <p className="text-sm font-medium text-gray-500 mt-1">{title}</p>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-gray-400 mt-2">{subtitle}</p>
      )}
    </div>
  );
}
