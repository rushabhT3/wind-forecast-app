"use client";

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export default function HorizonSlider({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Forecast Horizon:{" "}
        <span className="text-blue-400 font-bold">{value}h</span>
      </label>
      <input
        type="range"
        min={0}
        max={48}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 accent-blue-500 cursor-pointer"
      />
      <div className="flex justify-between text-xs text-slate-500">
        <span>0h</span>
        <span>48h</span>
      </div>
    </div>
  );
}
