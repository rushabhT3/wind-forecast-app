export interface DataPoint {
  time: string;
  value: number;
}

export interface ChartResponse {
  actuals: DataPoint[];
  forecasts: DataPoint[];
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchChartData(
  startTime: string,
  endTime: string,
  horizonHours: number
): Promise<ChartResponse> {
  const url = new URL(`${API_BASE}/api/chart`);
  url.searchParams.set("start_time", startTime);
  url.searchParams.set("end_time", endTime);
  url.searchParams.set("horizon_hours", String(horizonHours));

  const res = await fetch(url.toString(), { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<ChartResponse>;
}
