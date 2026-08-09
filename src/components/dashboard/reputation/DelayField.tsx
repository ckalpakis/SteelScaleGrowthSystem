"use client";

import { useState } from "react";
import { Input } from "@/components/ui";
import { DELAY_UNITS, splitDelay } from "@/lib/reputation";

// Shared "amount + unit" control that emits a total in minutes. Used by the
// workflow builder and settings. Remounts (via a key) to re-sync when the
// underlying value changes from outside.
export function DelayField({
  minutes,
  onChange,
  disabled,
}: {
  minutes: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
}) {
  const initial = splitDelay(minutes);
  const [value, setValue] = useState<number>(initial.value);
  const [unit, setUnit] = useState<string>(initial.unit);

  function emit(nextValue: number, nextUnit: string) {
    const mult = DELAY_UNITS.find((u) => u.value === nextUnit)?.minutes ?? 1;
    onChange(Math.max(0, Math.floor(nextValue)) * mult);
  }

  return (
    <div className="flex gap-2">
      <Input
        type="number"
        min={0}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const v = Number(e.target.value);
          setValue(v);
          emit(v, unit);
        }}
        className="w-24 disabled:opacity-50"
        aria-label="Amount"
      />
      <select
        value={unit}
        disabled={disabled}
        onChange={(e) => {
          setUnit(e.target.value);
          emit(value, e.target.value);
        }}
        className="rounded-md border border-[#e0e0de] bg-white px-3 py-2 text-sm text-[#37352f] transition-colors focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:opacity-50"
        aria-label="Unit"
      >
        {DELAY_UNITS.map((u) => (
          <option key={u.value} value={u.value}>
            {u.label}
          </option>
        ))}
      </select>
    </div>
  );
}
