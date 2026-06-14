const statusStyles = {
  queued: 'bg-gray-500',
  draft: 'bg-gray-500',
  sent: 'bg-blue-500',
  sending: 'bg-blue-500 animate-pulse',
  delivered: 'bg-green-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  opened: 'bg-purple-500',
  clicked: 'bg-orange-500',
  active: 'bg-green-500',
  churned: 'bg-red-500',
};

export default function StatusBadge({ status }) {
  const style = statusStyles[status] || 'bg-gray-400';

  return (
    <span
      className={`inline-flex items-center text-white text-xs font-medium px-2 py-1 rounded-full ${style}`}
    >
      {status}
    </span>
  );
}
