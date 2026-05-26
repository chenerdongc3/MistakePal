export function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-950">
        {value}
      </p>
    </div>
  );
}
