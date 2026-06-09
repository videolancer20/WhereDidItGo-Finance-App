import { useState } from "react";
import { Calendar } from "lucide-react";
import { CustomDatePicker } from "./ui/CustomDatePicker";

export type TimePreset = "day" | "week" | "month" | "year" | "all" | "custom";

interface TimeFilterProps {
  onChange: (range: { start: string; end: string }) => void;
  compact?: boolean;
}

function getRange(preset: TimePreset): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const from = new Date(now);

  switch (preset) {
    case "day":
      break;
    case "week":
      from.setDate(from.getDate() - 7);
      break;
    case "month":
      from.setDate(from.getDate() - 30);
      break;
    case "year":
      from.setFullYear(from.getFullYear() - 1);
      break;
    case "all":
      from.setFullYear(2000, 0, 1);
      break;
    default:
      from.setDate(from.getDate() - 30);
  }

  return { start: from.toISOString().slice(0, 10), end };
}

export function TimeFilter({ onChange, compact }: TimeFilterProps) {
  const [active, setActive] = useState<TimePreset>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const presets: { key: TimePreset; label: string }[] = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "year", label: "Year" },
    { key: "all", label: "All Time" },
  ];

  function selectPreset(preset: TimePreset) {
    setActive(preset);
    setShowCustom(false);
    onChange(getRange(preset));
  }

  function applyCustom() {
    if (customStart && customEnd) {
      setActive("custom");
      onChange({ start: customStart, end: customEnd });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className={`flex ${compact ? 'bg-zinc-950/50 p-0.5' : 'bg-zinc-950/50 p-1'} rounded-lg border border-zinc-800/50`}>
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => selectPreset(p.key)}
            className={`${compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} font-medium rounded-md transition-all ${
              active === p.key && !showCustom
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => {
            setShowCustom(true);
            setActive("custom");
          }}
          className={`${compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} font-medium rounded-md transition-all flex items-center gap-1 ${
            showCustom
              ? "bg-zinc-800 text-zinc-100 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Calendar className="w-3 h-3" />
          Custom
        </button>
      </div>
      {showCustom && (
        <div className="flex items-center gap-2">
          <div className="w-32">
            <CustomDatePicker value={customStart} onChange={setCustomStart} />
          </div>
          <span className="text-zinc-500 text-xs">to</span>
          <div className="w-32">
            <CustomDatePicker value={customEnd} onChange={setCustomEnd} />
          </div>
          <button
            onClick={applyCustom}
            className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
