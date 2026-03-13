"use client";

import type { DataPoint } from "@/lib/api";

interface Props {
  actuals: DataPoint[];
  forecasts: DataPoint[];
}

function mae(actuals: DataPoint[], forecasts: DataPoint[]): number | null {
  const fMap = new Map(forecasts.map((f) => [f.time, f.value]));
  const errs: number[] = [];
  for (const a of actuals) {
    const f = fMap.get(a.time);
    if (f !== undefined) errs.push(Math.abs(a.value - f));
  }
  if (errs.length === 0) return null;
  return errs.reduce((s, e) => s + e, 0) / errs.length;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-center">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-slate-100">{value}</p>
    </div>
  );
}

export default function StatsBar({ actuals, forecasts }: Props) {
  const maeVal = mae(actuals, forecasts);
  const avgActual =
    actuals.length > 0
      ? actuals.reduce((s, p) => s + p.value, 0) / actuals.length
      : null;
  const matchedPoints = forecasts.filter((f) =>
    actuals.some((a) => a.time === f.time)
  ).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        label="Actual Points"
        value={actuals.length.toLocaleString()}
      />
      <StatCard
        label="Forecast Points"
        value={forecasts.length.toLocaleString()}
      />
      <StatCard
        label="Avg Actual (MW)"
        value={avgActual !== null ? `${Math.round(avgActual).toLocaleString()}` : "—"}
      />
      <StatCard
        label="MAE (MW)"
        value={maeVal !== null ? `${Math.round(maeVal).toLocaleString()}` : "—"}
      />
    </div>
  );
}
