import React, { useMemo } from 'react';

const DAYS = ['M', 'T', 'W', 'TH', 'F', 'S'];
const DAY_LABELS = { M: 'Mon', T: 'Tue', W: 'Wed', TH: 'Thu', F: 'Fri', S: 'Sat' };

// Time slots from 7:00 AM to 7:00 PM in 30-min increments
const TIME_SLOTS = [];
for (let h = 7; h < 19; h++) {
  TIME_SLOTS.push(`${h}:00`);
  TIME_SLOTS.push(`${h}:30`);
}

const PALETTE = [
  'bg-indigo-100 border-indigo-300 text-indigo-800',
  'bg-emerald-100 border-emerald-300 text-emerald-800',
  'bg-amber-100 border-amber-300 text-amber-800',
  'bg-rose-100 border-rose-300 text-rose-800',
  'bg-violet-100 border-violet-300 text-violet-800',
  'bg-cyan-100 border-cyan-300 text-cyan-800',
  'bg-orange-100 border-orange-300 text-orange-800',
  'bg-teal-100 border-teal-300 text-teal-800',
];

function parseMinutes(timeStr) {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  const [time, period] = clean.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + (m || 0);
}

function expandDays(dayStr) {
  if (!dayStr) return [];
  const s = dayStr.toUpperCase().replace(/\s/g, '');
  const days = [];
  const tokens = ['TH', 'M', 'T', 'W', 'F', 'S'];
  let i = 0;
  while (i < s.length) {
    let matched = false;
    for (const tok of tokens) {
      if (s.startsWith(tok, i)) {
        days.push(tok);
        i += tok.length;
        matched = true;
        break;
      }
    }
    if (!matched) i++;
  }
  return days;
}

/**
 * ScheduleGrid — visual weekly timetable.
 *
 * Props:
 *   entries: Array<{ subjectCode, sectionCode, schedule: { day, time }, subjectName }>
 */
export default function ScheduleGrid({ entries = [] }) {
  // Assign each unique subject a stable color index
  const colorMap = useMemo(() => {
    const map = new Map();
    entries.forEach((e) => {
      if (!map.has(e.subjectCode)) {
        map.set(e.subjectCode, map.size % PALETTE.length);
      }
    });
    return map;
  }, [entries]);

  // Build a lookup: day → array of { startMin, endMin, label, colorIdx }
  const gridData = useMemo(() => {
    const data = {};
    DAYS.forEach((d) => (data[d] = []));

    entries.forEach((entry) => {
      const { day, time } = entry.schedule || {};
      if (!day || !time) return;
      const [startStr, endStr] = time.split('-');
      const startMin = parseMinutes(startStr?.trim());
      const endMin = parseMinutes(endStr?.trim());
      const days = expandDays(day);
      const colorIdx = colorMap.get(entry.subjectCode) ?? 0;

      days.forEach((d) => {
        if (data[d]) {
          data[d].push({
            startMin,
            endMin,
            label: entry.subjectCode,
            sublabel: entry.sectionCode,
            name: entry.subjectName,
            colorIdx,
          });
        }
      });
    });

    return data;
  }, [entries, colorMap]);

  const GRID_START = 7 * 60; // 7:00 AM in minutes
  const GRID_END = 19 * 60;  // 7:00 PM
  const TOTAL_MINS = GRID_END - GRID_START;
  const GRID_HEIGHT = 480; // px

  function toTop(min) {
    return ((min - GRID_START) / TOTAL_MINS) * GRID_HEIGHT;
  }
  function toHeight(startMin, endMin) {
    return ((endMin - startMin) / TOTAL_MINS) * GRID_HEIGHT;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs font-medium gap-2">
        <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>No sections added yet — your schedule will appear here.</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <div className="min-w-[640px]">
        {/* Header row */}
        <div className="grid gap-0" style={{ gridTemplateColumns: '56px repeat(6, 1fr)' }}>
          <div className="border-b border-r border-slate-200 bg-slate-50 h-8" />
          {DAYS.map((d) => (
            <div
              key={d}
              className="border-b border-r border-slate-200 bg-slate-50 h-8 flex items-center justify-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider"
            >
              {DAY_LABELS[d]}
            </div>
          ))}
        </div>

        {/* Grid body */}
        <div className="grid gap-0 relative" style={{ gridTemplateColumns: '56px repeat(6, 1fr)' }}>
          {/* Time labels column */}
          <div className="border-r border-slate-200 relative" style={{ height: GRID_HEIGHT }}>
            {TIME_SLOTS.map((slot, _i) => {
              const [h, m] = slot.split(':').map(Number);
              const mins = h * 60 + m;
              const top = toTop(mins);
              if (top < 0 || top >= GRID_HEIGHT) return null;
              const display = m === 0 ? `${h > 12 ? h - 12 : h}${h >= 12 ? 'PM' : 'AM'}` : '';
              return (
                <div
                  key={slot}
                  className="absolute right-1 text-[9px] text-slate-400 font-medium leading-none"
                  style={{ top: top - 5, width: '100%' }}
                >
                  {display}
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          {DAYS.map((d) => (
            <div
              key={d}
              className="border-r border-slate-200 relative"
              style={{ height: GRID_HEIGHT }}
            >
              {/* Hour lines */}
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 border-t border-slate-100"
                  style={{ top: toTop((7 + i) * 60) }}
                />
              ))}

              {/* Subject blocks */}
              {gridData[d].map((block, idx) => {
                const top = toTop(block.startMin);
                const height = toHeight(block.startMin, block.endMin);
                if (height < 4) return null;
                return (
                  <div
                    key={idx}
                    title={`${block.name}\n${block.sublabel}`}
                    className={`absolute inset-x-0.5 rounded-lg border px-1.5 py-1 overflow-hidden cursor-default shadow-sm ${PALETTE[block.colorIdx]}`}
                    style={{ top: top + 1, height: height - 2 }}
                  >
                    <p className="text-[9px] font-semibold leading-tight truncate">{block.label}</p>
                    {height > 28 && (
                      <p className="text-[8px] font-medium leading-tight truncate opacity-70">{block.sublabel}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
