"use client";

import { Check, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterDropdownProps {
  label: string;
  options: { label: string; value: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  isOpen,
  onToggle,
}: FilterDropdownProps) {
  return (
    <div className="relative inline-block ml-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          "p-1 rounded hover:bg-accent/50 transition-colors",
          selected.length > 0 ? "text-indigo-600" : "text-muted-foreground"
        )}
      >
        <Filter size={10} className={selected.length > 0 ? "fill-indigo-600/20" : ""} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onToggle} />
          <div className="absolute left-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">{label}</span>
              {selected.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([]);
                  }}
                  className="text-[10px] text-indigo-600 font-semibold hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {options.map((opt) => {
                const isSelected = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSelected) onChange(selected.filter((v) => v !== opt.value));
                      else onChange([...selected, opt.value]);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors text-left",
                      isSelected ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400" : "hover:bg-accent"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={12} className="flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
