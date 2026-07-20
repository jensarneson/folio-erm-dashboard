export function getFiscalYearDates(year: number): { start: string; end: string } {
  // Fiscal year named after ending year: FY25 = July 1, 2024 – June 30, 2025
  const startYear = year - 1
  const endYear = year
  const start = `${startYear}-07-01`
  const end = `${endYear}-06-30`
  return { start, end }
}

export function getCurrentFiscalYear(date: Date = new Date()): number {
  const month = date.getMonth() + 1 // 1-12
  const year = date.getFullYear()
  // FY is named after the ending year.
  // FY27 = July 1, 2026 – June 30, 2027
  // If we're in July or later, the FY ends next calendar year
  return month >= 7 ? year + 1 : year
}


