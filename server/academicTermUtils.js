const TERM_PATTERN = /^(1st|2nd) Semester (20\d{2})-(20\d{2})$/i;

export function parseAcademicTermLabel(value) {
  const normalizedInput = String(value || '').trim().replace(/\s+/g, ' ');
  const match = normalizedInput.match(TERM_PATTERN);
  if (!match) {
    throw new Error('Academic term must use format "1st Semester YYYY-YYYY" or "2nd Semester YYYY-YYYY".');
  }

  const startYear = Number(match[2]);
  const endYear = Number(match[3]);
  if (endYear !== startYear + 1) {
    throw new Error('Academic term school year must use consecutive years (for example, 2026-2027).');
  }

  const semester = match[1].toLowerCase() === '1st' ? '1' : '2';
  return {
    name: `${semester === '1' ? '1st' : '2nd'} Semester ${startYear}-${endYear}`,
    schoolYear: `${startYear}-${endYear}`,
    semester,
    startYear,
    endYear,
  };
}

export function nextAcademicTermLabel(value) {
  const current = parseAcademicTermLabel(value);
  if (current.semester === '1') return `2nd Semester ${current.schoolYear}`;
  return `1st Semester ${current.startYear + 1}-${current.endYear + 1}`;
}

export function isValidAcademicTermLabel(value) {
  try {
    parseAcademicTermLabel(value);
    return true;
  } catch {
    return false;
  }
}

export function repairStoredAcademicTermLabel(value, fallback = '1st Semester 2026-2027') {
  try {
    return parseAcademicTermLabel(value).name;
  } catch {
    const fallbackTerm = parseAcademicTermLabel(fallback);
    const semesterOnly = String(value || '').trim().match(/^(1st|2nd) Semester$/i);
    if (semesterOnly) {
      return `${semesterOnly[1].toLowerCase() === '1st' ? '1st' : '2nd'} Semester ${fallbackTerm.schoolYear}`;
    }
    return fallbackTerm.name;
  }
}
