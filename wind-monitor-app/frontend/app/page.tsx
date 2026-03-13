"use client";

import { useState, useCallback } from "react";
import { Wind, RefreshCw, AlertCircle, TrendingUp, Activity, Gauge, BarChart2 } from "lucide-react";
import { fetchChartData, type ChartResponse } from "@/lib/api";
import DatePicker from "@/components/DatePicker";
import HorizonSlider from "@/components/HorizonSlider";
import WindChart from "@/components/WindChart";

const JAN_MIN = "2024-01-01T00:00";
const JAN_MAX = "2024-01-31T23:30";
const DEFAULT_START = "2024-01-01T08:00";
const DEFAULT_END   = "2024-01-04T08:00";

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
      }}
    >
      <div
        style={{
          background: color + "22",
          borderRadius: 10,
          width: 42,
          height: 42,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ color: "#64748b", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>
          {label}
        </p>
        <p style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
          {value}
        </p>
        {sub && (
          <p style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>{sub}</p>
        )}
      </div>
    </div>
  );
}

function computeStats(data: ChartResponse) {
  const fMap = new Map(data.forecasts.map((f) => [f.time, f.value]));
  const errs: number[] = [];
  for (const a of data.actuals) {
    const f = fMap.get(a.time);
    if (f !== undefined) errs.push(Math.abs(a.value - f));
  }
  const mae = errs.length
    ? Math.round(errs.reduce((s, e) => s + e, 0) / errs.length)
    : null;
  const avgActual = data.actuals.length
    ? Math.round(data.actuals.reduce((s, p) => s + p.value, 0) / data.actuals.length)
    : null;
  const maxActual = data.actuals.length
    ? Math.round(Math.max(...data.actuals.map((p) => p.value)))
    : null;
  return { mae, avgActual, maxActual, matchedPts: errs.length };
}

export default function Home() {
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [endTime, setEndTime]     = useState(DEFAULT_END);
  const [horizon, setHorizon]     = useState(4);
  const [chartData, setChartData] = useState<ChartResponse | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const toIsoZ = (local: string) => `${local}:00Z`;

  const handleFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchChartData(toIsoZ(startTime), toIsoZ(endTime), horizon);
      setChartData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [startTime, endTime, horizon]);

  const stats = chartData ? computeStats(chartData) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#f1f5f9" }}>
      {/* ── Top nav bar ── */}
      <div
        style={{
          borderBottom: "1px solid #0f172a",
          background: "#020817",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          height: 58,
          gap: 12,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            borderRadius: 10,
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Wind size={18} color="white" />
        </div>
        <div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>
            UK Wind Forecast Monitor
          </span>
          <span
            style={{
              marginLeft: 12,
              fontSize: 11,
              color: "#334155",
              fontWeight: 500,
            }}
          >
            BMRS Elexon · January 2024
          </span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: chartData ? "#22c55e" : "#334155",
            }}
          />
          <span style={{ fontSize: 12, color: "#475569" }}>
            {chartData ? "Data loaded" : "No data"}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 20px" }}>
        {/* ── Control panel ── */}
        <div
          style={{
            background: "#0a1628",
            border: "1px solid #1e293b",
            borderRadius: 16,
            padding: "24px 28px",
            marginBottom: 24,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#334155",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 18,
            }}
          >
            Query Parameters
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              alignItems: "end",
            }}
          >
            <DatePicker
              label="Start Time (UTC)"
              value={startTime}
              onChange={setStartTime}
              min={JAN_MIN}
              max={JAN_MAX}
            />
            <DatePicker
              label="End Time (UTC)"
              value={endTime}
              onChange={setEndTime}
              min={JAN_MIN}
              max={JAN_MAX}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <HorizonSlider value={horizon} onChange={setHorizon} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                onClick={handleFetch}
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: loading ? "#1e3a5f" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: loading ? "#60a5fa" : "white",
                  border: "none",
                  borderRadius: 10,
                  padding: "11px 22px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  width: "100%",
                  justifyContent: "center",
                  transition: "all 0.15s",
                  boxShadow: loading ? "none" : "0 4px 15px rgba(37,99,235,0.35)",
                }}
              >
                <RefreshCw
                  size={16}
                  style={{
                    animation: loading ? "spin 1s linear infinite" : "none",
                  }}
                />
                {loading ? "Fetching…" : "Fetch Data"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div
            style={{
              display: "flex",
              gap: 10,
              background: "#1a0a0a",
              border: "1px solid #7f1d1d",
              borderRadius: 12,
              padding: "14px 18px",
              marginBottom: 20,
              color: "#fca5a5",
              fontSize: 13,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}

        {/* ── Stats row ── */}
        {stats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              marginBottom: 22,
            }}
          >
            <StatCard
              icon={<Activity size={20} />}
              label="Actual Points"
              value={chartData!.actuals.length.toLocaleString()}
              sub="half-hourly intervals"
              color="#60a5fa"
            />
            <StatCard
              icon={<TrendingUp size={20} />}
              label="Avg Actual"
              value={stats.avgActual != null ? `${stats.avgActual.toLocaleString()} MW` : "—"}
              sub="mean over range"
              color="#a78bfa"
            />
            <StatCard
              icon={<BarChart2 size={20} />}
              label="Peak Actual"
              value={stats.maxActual != null ? `${stats.maxActual.toLocaleString()} MW` : "—"}
              sub="max in range"
              color="#34d399"
            />
            <StatCard
              icon={<Gauge size={20} />}
              label="Forecast MAE"
              value={stats.mae != null ? `${stats.mae.toLocaleString()} MW` : "—"}
              sub={`over ${stats.matchedPts} matched pts`}
              color="#fb923c"
            />
          </div>
        )}

        {/* ── Chart ── */}
        {chartData && (
          <div
            style={{
              background: "#0a1628",
              border: "1px solid #1e293b",
              borderRadius: 16,
              padding: "24px 20px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0" }}>
                  Power Generation (MW)
                </p>
                <p style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                  Target Time End (UTC) · Forecast horizon: {horizon}h
                </p>
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div
                    style={{
                      width: 28,
                      height: 3,
                      background: "#60a5fa",
                      borderRadius: 2,
                    }}
                  />
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>Actual</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div
                    style={{
                      width: 28,
                      height: 3,
                      background: "#4ade80",
                      borderRadius: 2,
                      borderTop: "2px dashed #4ade80",
                    }}
                  />
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>Forecast</span>
                </div>
              </div>
            </div>
            <WindChart actuals={chartData.actuals} forecasts={chartData.forecasts} />
          </div>
        )}

        {/* ── Empty state ── */}
        {!chartData && !loading && !error && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 20px",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#0f172a",
                border: "1px solid #1e293b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Wind size={28} color="#334155" />
            </div>
            <p style={{ color: "#475569", fontSize: 15 }}>
              Select a date range and click{" "}
              <strong style={{ color: "#60a5fa" }}>Fetch Data</strong>
            </p>
            <p style={{ color: "#334155", fontSize: 12 }}>
              Data available: January 2024 · Forecast horizon: 0–48h
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}