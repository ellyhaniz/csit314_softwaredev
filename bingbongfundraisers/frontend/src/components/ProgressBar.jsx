export default function ProgressBar({ current, target, height = 'h-1.5' }) {
  const pct = Math.min(100, target > 0 ? Math.round((current / target) * 100) : 0);
  return (
    <div className={`bg-gray-100 rounded-full w-full ${height}`}>
      <div
        className={`bg-gray-900 rounded-full ${height} transition-all duration-300`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
