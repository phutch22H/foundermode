interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

export default function MetricCard({ label, value, sub }: MetricCardProps) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-3xl font-semibold text-neutral-50 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-neutral-600 mt-1.5">{sub}</p>}
    </div>
  );
}
