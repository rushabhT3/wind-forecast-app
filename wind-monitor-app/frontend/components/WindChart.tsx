"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { DataPoint } from "@/lib/api";

interface Props {
  actuals: DataPoint[];
  forecasts: DataPoint[];
}

interface MergedRow {
  time: string;
  actual?: number | null;
  forecast?: number | null;
}

function mergeData(actuals: DataPoint[], forecasts: DataPoint[]): MergedRow[] {
  const map = new Map<string, MergedRow>();

  for (const pt of actuals) {
    map.set(pt.time, { time: pt.time, actual: pt.value, forecast: null });
  }
  for (const pt of forecasts) {
    const existing = map.get(pt.time);
    if (existing) {
      existing.forecast = pt.value;
    } else {
      map.set(pt.time, { time: pt.time, actual: null, forecast: pt.value });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.time.localeCompare(b.time));
}

function formatTick(tick: string): string {
  try {
    return format(parseISO(tick), "dd/MM HH:mm");
  } catch {
    return tick;
  }
}

function formatMW(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return `${Math.round(v)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <p style={{ color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>
        {label ? formatTick(label) : ""} UTC
      </p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any) =>
        entry.value != null ? (
          <p key={entry.dataKey} style={{ color: entry.stroke, margin: "3px 0" }}>
            {entry.name}:{" "}
            <span style={{ fontWeight: 700 }}>{formatMW(entry.value)} MW</span>
          </p>
        ) : null
      )}
    </div>
  );
}

export default function WindChart({ actuals, forecasts }: Props) {
  const data = mergeData(actuals, forecasts);

  if (data.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 320,
          color: "#475569",
          fontSize: 15,
        }}
      >
        No data for the selected range.
      </div>
    );
  }

  // Reduce tick density based on data length
  const tickInterval = Math.max(1, Math.floor(data.length / 10));

  return (
    <ResponsiveContainer width="100%" height={420}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="time"
          tickFormatter={formatTick}
          tick={{ fontSize: 11, fill: "#64748b" }}
          interval={tickInterval}
          minTickGap={70}
        />
        <YAxis
          tickFormatter={formatMW}
          tick={{ fontSize: 11, fill: "#64748b" }}
          width={65}
          tickLine={false}
          axisLine={false}
          unit=" MW"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 13, paddingTop: 12, color: "#cbd5e1" }}
        />
        {/* Actual — solid blue */}
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual Generation"
          stroke="#60a5fa"
          strokeWidth={2.5}
          dot={false}
          connectNulls={true}
          isAnimationActive={false}
          activeDot={{ r: 5, fill: "#60a5fa", stroke: "#0f172a", strokeWidth: 2 }}
        />
        {/* Forecast — green dashed */}
        <Line
          type="monotone"
          dataKey="forecast"
          name="Forecasted Generation"
          stroke="#4ade80"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={false}
          connectNulls={true}
          isAnimationActive={false}
          activeDot={{ r: 5, fill: "#4ade80", stroke: "#0f172a", strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}