const colorMap = {
  red: 'bg-red-600 hover:bg-red-700',
  blue: 'bg-blue-600 hover:bg-blue-700',
  green: 'bg-green-600 hover:bg-green-700',
  brand: 'bg-brand-primary hover:opacity-90',
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  confirmColor = 'red',
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 animate-[fadeIn_0.15s_ease-out]">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>

        {message && (
          <p className="mt-2 text-sm text-gray-500">{message}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${colorMap[confirmColor] || colorMap.red}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
