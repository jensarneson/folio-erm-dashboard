import { useState, useMemo } from 'react'
import { getCurrentFiscalYear, getFiscalYearDates } from '../lib/utils'

/**
 * Manage fiscal year selection and derive date ranges.
 */
export function useFiscalYear() {
  const [selectedFY, setSelectedFY] = useState<number>(getCurrentFiscalYear())

  const { start: fyStart, end: fyEnd } = useMemo(
    () => getFiscalYearDates(selectedFY),
    [selectedFY],
  )

  const options = useMemo(() => {
    const current = getCurrentFiscalYear()
    const opts: number[] = []
    for (let i = -3; i <= 3; i++) {
      opts.push(current + i)
    }
    return opts
  }, [])

  return { selectedFY, setSelectedFY, fyStart, fyEnd, options }
}
