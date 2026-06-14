const sizes = {
  sm: 'w-6 h-6 border-2',
  md: 'w-10 h-10 border-[3px]',
  lg: 'w-14 h-14 border-4',
};

export default function LoadingSpinner({ size = 'md', message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div
        className={`animate-spin rounded-full border-brand-accent border-t-transparent ${sizes[size]}`}
      />
      {message && (
        <p className="mt-4 text-sm text-gray-500">{message}</p>
      )}
    </div>
  );
}
