// Schedule conflict detection utilities for NCST Student Portal

export function getDaysArray(dayStr = '') {
  const days = [];
  let i = 0;
  while (i < dayStr.length) {
    if (dayStr[i] === 'T' && dayStr[i + 1] === 'H') {
      days.push('TH');
      i += 2;
    } else {
      days.push(dayStr[i]);
      i += 1;
    }
  }
  return days;
}

export function parseTimeToMinutes(timeStr = '') {
  // e.g. "8:00 AM" or "1:00 PM"
  const cleaned = timeStr.trim().toUpperCase();
  const match = cleaned.match(/^(\d+):(\d+)\s*(AM|PM)$/);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];

  if (ampm === 'PM' && hours !== 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

export function checkTimeOverlap(timeRangeA = '', timeRangeB = '') {
  // e.g. "8:00 AM - 9:30 AM"
  const splitA = timeRangeA.split('-');
  const splitB = timeRangeB.split('-');
  if (splitA.length !== 2 || splitB.length !== 2) return false;

  const startA = parseTimeToMinutes(splitA[0]);
  const endA = parseTimeToMinutes(splitA[1]);
  const startB = parseTimeToMinutes(splitB[0]);
  const endB = parseTimeToMinutes(splitB[1]);

  return startA < endB && endA > startB;
}

export function checkScheduleConflict(schedA, schedB) {
  if (!schedA || !schedB) return false;
  if (!schedA.day || !schedA.time || !schedB.day || !schedB.time) return false;

  // Check day overlap
  const daysA = getDaysArray(schedA.day);
  const daysB = getDaysArray(schedB.day);
  const hasDayOverlap = daysA.some(d => daysB.includes(d));

  if (!hasDayOverlap) return false;

  // Check time overlap
  return checkTimeOverlap(schedA.time, schedB.time);
}
