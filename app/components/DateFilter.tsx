"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useT } from "./I18nProvider";

// Keep API values as YYYY-MM-DD; render the calendar in the app's language.
function dateValue(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { lang } = useT();
  const locale = lang === "en" ? "en-US" : "zh-CN";
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const id = useId();
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const today = new Date();
  const todayValue = dateValue(today.getFullYear(), today.getMonth(), today.getDate());
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const selected = value ? new Date(`${value}T12:00:00`) : null;

  useEffect(() => {
    if (!open) return;
    const initialDay = dialog.current?.querySelector<HTMLButtonElement>('[data-selected="true"]')
      ?? dialog.current?.querySelector<HTMLButtonElement>('[data-day]');
    initialDay?.focus();
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  function choose(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    trigger.current?.focus();
  }

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2024, i, 1))
  );
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 7 + i))
  );

  return (
    <div
      ref={root}
      className="relative flex flex-col gap-1"
      lang={locale}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <span id={`${id}-label`} className="text-xs text-slate-500">{label}</span>
      <button
        ref={trigger}
        type="button"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        className="input flex min-w-[160px] items-center justify-between gap-3 text-left"
        onClick={() => {
          if (!open) setMonth(selected ?? new Date());
          setOpen(!open);
        }}
      >
        <span id={`${id}-value`} className={value ? "" : "text-slate-400"}>
          {selected
            ? new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(selected)
            : lang === "en" ? "MM/DD/YYYY" : "年/月/日"}
        </span>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 11h18" />
        </svg>
      </button>
      {open && (
        <div ref={dialog} id={id} role="dialog" aria-labelledby={`${id}-label`}
          className="absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-1">
            <button type="button" className="rounded px-2 py-1 hover:bg-slate-100"
              aria-label={lang === "en" ? "Previous month" : "上个月"}
              onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}>‹</button>
            <select aria-label={lang === "en" ? "Month" : "月"} value={monthIndex}
              className="min-w-0 rounded border border-slate-200 bg-white p-1 text-sm"
              onChange={(event) => setMonth(new Date(year, Number(event.target.value), 1))}>
              {monthNames.map((name, i) => <option key={i} value={i}>{name}</option>)}
            </select>
            <select aria-label={lang === "en" ? "Year" : "年"} value={year}
              className="rounded border border-slate-200 bg-white p-1 text-sm"
              onChange={(event) => setMonth(new Date(Number(event.target.value), monthIndex, 1))}>
              {Array.from({ length: Math.max(2100, year) - Math.min(1900, year) + 1 }, (_, i) => Math.min(1900, year) + i)
                .map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" className="rounded px-2 py-1 hover:bg-slate-100"
              aria-label={lang === "en" ? "Next month" : "下个月"}
              onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}>›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {weekdays.map((day) => <span key={day} className="py-1 text-slate-500">{day}</span>)}
            {Array.from({ length: firstWeekday }, (_, i) => <span key={`blank-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const key = dateValue(year, monthIndex, day);
              return (
                <button key={key} type="button" data-day data-selected={key === value}
                  aria-pressed={key === value} aria-current={key === todayValue ? "date" : undefined}
                  aria-label={new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(new Date(year, monthIndex, day))}
                  className={`rounded py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${key === value ? "bg-blue-600 text-white" : "hover:bg-blue-50"}`}
                  onClick={() => choose(key)}>{day}</button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-sm text-blue-600">
            <button type="button" className="rounded px-2 py-1 hover:bg-blue-50" onClick={() => choose("")}>
              {lang === "en" ? "Clear" : "清除"}
            </button>
            <button type="button" className="rounded px-2 py-1 hover:bg-blue-50" onClick={() => choose(todayValue)}>
              {lang === "en" ? "Today" : "今天"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
