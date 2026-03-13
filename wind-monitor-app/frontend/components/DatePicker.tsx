"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Clock } from "lucide-react";

interface Props {
  label: string;
  value: string; // "YYYY-MM-DDTHH:MM"
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS         = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function pad(n: number) { return String(n).padStart(2, "0"); }

function parseLocal(s: string) {
  const [datePart, timePart] = (s ?? "").split("T");
  const [y, mo, d] = (datePart ?? "2024-01-01").split("-").map(Number);
  const [h, mi]    = (timePart ?? "00:00").split(":").map(Number);
  return { year: y || 2024, month: (mo || 1) - 1, day: d || 1, hour: h || 0, minute: mi || 0 };
}

function buildValue(year: number, month: number, day: number, hour: number, minute: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// view: "calendar" | "month-year" | "time"
type View = "calendar" | "month-year" | "time";

export default function DatePicker({ label, value, onChange, min, max }: Props) {
  const [open, setOpen]   = useState(false);
  const [view, setView]   = useState<View>("calendar");
  const ref               = useRef<HTMLDivElement>(null);

  const parsed            = parseLocal(value);
  const { year, month, day, hour, minute } = parsed;

  // navYear/navMonth controls what the calendar is displaying (not necessarily selected)
  const [navYear,  setNavYear]  = useState(year);
  const [navMonth, setNavMonth] = useState(month);

  // Parse min/max boundaries
  const minP = min ? parseLocal(min) : null;
  const maxP = max ? parseLocal(max) : null;
  const minYear = minP?.year ?? 2020;
  const maxYear = maxP?.year ?? 2025;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setView("calendar");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Navigation guards ────────────────────────────────────────────────────────
  const canGoPrev = !(navYear === minYear && navMonth === (minP?.month ?? 0));
  const canGoNext = !(navYear === maxYear && navMonth === (maxP?.month ?? 11));

  function prevMonth() {
    if (!canGoPrev) return;
    if (navMonth === 0) { setNavYear(y => y - 1); setNavMonth(11); }
    else setNavMonth(m => m - 1);
  }
  function nextMonth() {
    if (!canGoNext) return;
    if (navMonth === 11) { setNavYear(y => y + 1); setNavMonth(0); }
    else setNavMonth(m => m + 1);
  }

  // ── Day disabled check ───────────────────────────────────────────────────────
  function isDayDisabled(d: number) {
    if (minP) {
      const beforeMin =
        navYear < minP.year ||
        (navYear === minP.year && navMonth < minP.month) ||
        (navYear === minP.year && navMonth === minP.month && d < minP.day);
      if (beforeMin) return true;
    }
    if (maxP) {
      const afterMax =
        navYear > maxP.year ||
        (navYear === maxP.year && navMonth > maxP.month) ||
        (navYear === maxP.year && navMonth === maxP.month && d > maxP.day);
      if (afterMax) return true;
    }
    return false;
  }

  // ── Month disabled check (for month-year picker) ─────────────────────────────
  function isMonthDisabled(y: number, m: number) {
    if (minP && (y < minP.year || (y === minP.year && m < minP.month))) return true;
    if (maxP && (y > maxP.year || (y === maxP.year && m > maxP.month))) return true;
    return false;
  }

  // ── Selectors ────────────────────────────────────────────────────────────────
  function selectDay(d: number) {
    onChange(buildValue(navYear, navMonth, d, hour, minute));
    // Don't close — let user adjust time if needed
  }

  function selectMonthYear(y: number, m: number) {
    setNavYear(y);
    setNavMonth(m);
    // If currently selected day exists in new month, keep it; else clamp
    const dim = getDaysInMonth(y, m);
    const newDay = Math.min(day, dim);
    onChange(buildValue(y, m, newDay, hour, minute));
    setView("calendar");
  }

  function setHour(h: number)    { onChange(buildValue(navYear, navMonth, day, h, minute)); }
  function setMinute(mi: number) { onChange(buildValue(navYear, navMonth, day, hour, mi)); }

  // ── Calendar grid data ───────────────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(navYear, navMonth);
  const firstDay    = getFirstDayOfWeek(navYear, navMonth);
  const years       = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  const displayStr = `${pad(day)}/${pad(month + 1)}/${year}  ${pad(hour)}:${pad(minute)}`;

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 7 }}>

      {/* ── Label ── */}
      <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {label}
      </label>

      {/* ── Trigger button ── */}
      <div
        onClick={() => { setOpen(o => !o); if (open) setView("calendar"); }}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#020817", border: `1px solid ${open ? "#2563eb" : "#1e293b"}`,
          borderRadius: 10, padding: "10px 14px", cursor: "pointer",
          color: "#e2e8f0", fontSize: 13, fontWeight: 500,
          userSelect: "none", transition: "border-color 0.15s",
        }}
      >
        <Calendar size={15} color="#3b82f6" />
        <span style={{ flex: 1 }}>{displayStr}</span>
        <ChevronDown size={14} color="#475569" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </div>

      {/* ── Popup ── */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 9999,
          background: "#0a1628", border: "1px solid #1e293b", borderRadius: 14,
          padding: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.8)", minWidth: 288,
        }}>

          {/* ── Tab bar: Date / Time ── */}
          <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
            {(["calendar", "time"] as const).map(tab => (
              <button key={tab} onClick={() => setView(tab)} style={{
                flex: 1, padding: "7px 0", borderRadius: 8, border: "none",
                cursor: "pointer", fontSize: 12, fontWeight: 600,
                background: view === tab ? "#1e3a5f" : "transparent",
                color: view === tab ? "#60a5fa" : "#475569",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                transition: "all 0.15s",
              }}>
                {tab === "calendar" ? <Calendar size={13} /> : <Clock size={13} />}
                {tab === "calendar" ? "Date" : "Time"}
              </button>
            ))}
          </div>

          {/* ════════════════════════════════════════════════
              CALENDAR VIEW
          ════════════════════════════════════════════════ */}
          {(view === "calendar" || view === "month-year") && (
            <>
              {/* Month/Year nav row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <button
                  onClick={prevMonth}
                  disabled={!canGoPrev}
                  style={navBtnStyle(!canGoPrev)}
                >
                  <ChevronLeft size={15} />
                </button>

                {/* Clicking this toggles the month-year picker */}
                <button
                  onClick={() => setView(v => v === "month-year" ? "calendar" : "month-year")}
                  style={{
                    background: view === "month-year" ? "#1e3a5f" : "transparent",
                    border: "1px solid " + (view === "month-year" ? "#2563eb" : "#1e293b"),
                    color: "#e2e8f0", fontWeight: 700, fontSize: 14,
                    cursor: "pointer", borderRadius: 8, padding: "5px 12px",
                    display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                  }}
                >
                  {MONTHS_FULL[navMonth]} {navYear}
                  <ChevronDown size={13} color="#60a5fa"
                    style={{ transform: view === "month-year" ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                  />
                </button>

                <button
                  onClick={nextMonth}
                  disabled={!canGoNext}
                  style={navBtnStyle(!canGoNext)}
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              {/* ── MONTH-YEAR PICKER (shown when header clicked) ── */}
              {view === "month-year" && (
                <div>
                  {/* Year scroll row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                    <button
                      onClick={() => setNavYear(y => Math.max(minYear, y - 1))}
                      disabled={navYear <= minYear}
                      style={navBtnStyle(navYear <= minYear)}
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 16 }}>{navYear}</span>
                    </div>
                    <button
                      onClick={() => setNavYear(y => Math.min(maxYear, y + 1))}
                      disabled={navYear >= maxYear}
                      style={navBtnStyle(navYear >= maxYear)}
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  {/* Month grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5 }}>
                    {MONTHS_SHORT.map((m, i) => {
                      const disabled  = isMonthDisabled(navYear, i);
                      const isActive  = navYear === year && i === month;
                      const isNav     = navYear === navYear && i === navMonth;
                      return (
                        <button
                          key={m}
                          disabled={disabled}
                          onClick={() => !disabled && selectMonthYear(navYear, i)}
                          style={{
                            padding: "9px 0",
                            borderRadius: 8,
                            border: isNav && !isActive ? "1px solid #1e3a5f" : "1px solid transparent",
                            cursor: disabled ? "not-allowed" : "pointer",
                            fontSize: 13,
                            fontWeight: isActive ? 700 : 400,
                            background: isActive ? "#2563eb" : "transparent",
                            color: disabled ? "#1e293b" : isActive ? "white" : "#94a3b8",
                            transition: "all 0.12s",
                          }}
                          onMouseEnter={e => { if (!disabled && !isActive) (e.currentTarget.style.background = "#1e293b"); }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget.style.background = "transparent"); }}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── DAY GRID ── */}
              {view === "calendar" && (
                <>
                  {/* Day-of-week headers */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
                    {DAYS.map(d => (
                      <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#334155", fontWeight: 600, padding: "4px 0" }}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Days */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const d          = i + 1;
                      const isSelected = d === day && navYear === year && navMonth === month;
                      const isToday    = navYear === 2024 && navMonth === 0 && d === 1; // highlight Jan 1
                      const disabled   = isDayDisabled(d);
                      return (
                        <button
                          key={d}
                          disabled={disabled}
                          onClick={() => !disabled && selectDay(d)}
                          style={{
                            padding: "7px 0",
                            borderRadius: 7,
                            border: isToday && !isSelected ? "1px solid #1e3a5f" : "1px solid transparent",
                            cursor: disabled ? "not-allowed" : "pointer",
                            fontSize: 13,
                            fontWeight: isSelected ? 700 : 400,
                            background: isSelected ? "#2563eb" : "transparent",
                            color: disabled ? "#1e293b" : isSelected ? "white" : "#cbd5e1",
                            transition: "all 0.12s",
                          }}
                          onMouseEnter={e => { if (!disabled && !isSelected) (e.currentTarget.style.background = "#1e293b"); }}
                          onMouseLeave={e => { if (!isSelected) (e.currentTarget.style.background = "transparent"); }}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* ════════════════════════════════════════════════
              TIME VIEW
          ════════════════════════════════════════════════ */}
          {view === "time" && (
            <div>
              <p style={{ fontSize: 12, color: "#475569", textAlign: "center", marginBottom: 14 }}>
                Selected time:{" "}
                <strong style={{ color: "#60a5fa", fontSize: 18 }}>{pad(hour)}:{pad(minute)}</strong>
                {" "}UTC
              </p>

              <div style={{ display: "flex", gap: 12 }}>
                {/* Hour */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: "#475569", textAlign: "center", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Hour
                  </p>
                  <div style={{ maxHeight: 196, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2, paddingRight: 2 }}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <button
                        key={h}
                        onClick={() => setHour(h)}
                        style={{
                          padding: "7px 0", borderRadius: 7, border: "none",
                          cursor: "pointer", fontSize: 13,
                          fontWeight: h === hour ? 700 : 400,
                          background: h === hour ? "#1e3a5f" : "transparent",
                          color: h === hour ? "#60a5fa" : "#94a3b8",
                          transition: "all 0.1s",
                        }}
                      >
                        {pad(h)}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ width: 1, background: "#1e293b" }} />

                {/* Minute — 30-min steps matching BMRS resolution */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: "#475569", textAlign: "center", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Minute
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {[0, 30].map(mi => (
                      <button
                        key={mi}
                        onClick={() => setMinute(mi)}
                        style={{
                          padding: "7px 0", borderRadius: 7, border: "none",
                          cursor: "pointer", fontSize: 13,
                          fontWeight: mi === minute ? 700 : 400,
                          background: mi === minute ? "#1e3a5f" : "transparent",
                          color: mi === minute ? "#60a5fa" : "#94a3b8",
                          transition: "all 0.1s",
                        }}
                      >
                        :{pad(mi)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => { setView("calendar"); setOpen(false); }}
                style={{
                  marginTop: 16, width: "100%", padding: "9px 0",
                  borderRadius: 9, border: "none", cursor: "pointer",
                  background: "#2563eb", color: "white", fontWeight: 600, fontSize: 13,
                }}
              >
                Done
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function navBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: "transparent",
    border: "1px solid " + (disabled ? "#0f172a" : "#1e293b"),
    borderRadius: 7,
    width: 30, height: 30,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    color: disabled ? "#1e293b" : "#64748b",
    padding: 0,
    flexShrink: 0,
    transition: "all 0.12s",
  };
}