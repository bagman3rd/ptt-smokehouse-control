export function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card p-5">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-black tracking-tight">{value}</div>
      {note ? <div className="mt-2 text-sm text-slate-500">{note}</div> : null}
    </div>
  );
}
