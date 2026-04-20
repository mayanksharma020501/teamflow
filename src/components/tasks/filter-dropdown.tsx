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
            {label === "Due Date" && (
              <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
                <p className="text-[9px] font-bold text-muted-foreground uppercase px-2">Custom Range</p>
                <div className="flex flex-col gap-1.5 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground w-6">From</span>
                    <input
                      type="date"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (e.target.value) {
                          const dateVal = `FROM:${e.target.value}`;
                          // Remove existing FROM if any
                          const otherFilters = selected.filter(f => !f.startsWith("FROM:"));
                          onChange([...otherFilters, dateVal]);
                        }
                      }}
                      className="flex-1 bg-accent/50 text-[10px] px-2 py-1 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500/50"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground w-6">To</span>
                    <input
                      type="date"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (e.target.value) {
                          const dateVal = `TO:${e.target.value}`;
                          // Remove existing TO if any
                          const otherFilters = selected.filter(f => !f.startsWith("TO:"));
                          onChange([...otherFilters, dateVal]);
                        }
                      }}
                      className="flex-1 bg-accent/50 text-[10px] px-2 py-1 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
