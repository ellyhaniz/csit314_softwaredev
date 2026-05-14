export default function StatCard({ label, value }) {
  return (
    <div className="border border-gray-200 rounded-lg p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
