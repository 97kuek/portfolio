import { TZDate } from "@date-fns/tz"
import { isValid, parseISO } from "date-fns"

export function parseDateInput(
  dateInput: string | number | Date,
  timeZone: string,
): Date {
  // Pass through non-string inputs
  if (dateInput instanceof Date) return dateInput
  if (typeof dateInput === "number") return new Date(dateInput)

  // Sanitize string input from potential YAML quotes
  const cleanDateString = dateInput.trim().replace(/^["']|["']$/g, "")

  // Constructors normalize out-of-range calendar fields, so validate ISO
  // input before interpreting its components in the site's timezone.
  if (/^\d{4}-/.test(cleanDateString) && !isValid(parseISO(cleanDateString))) {
    return new Date(Number.NaN)
  }

  // Check for timezone indicator (Z or ±HH:MM)
  const hasTimezone = /Z|[+-]\d{2}:\d{2}$/.test(cleanDateString)

  // If already has timezone, use parseISO directly
  if (hasTimezone) {
    return parseISO(cleanDateString)
  }

  // Offsetless calendar strings must be built from components: TZDate's string
  // constructor parses with plain Date semantics (system timezone) and only
  // renders in the target zone, which shifts the instant on non-site machines.
  const parts = cleanDateString.match(
    /^(\d{4})-(\d{2})(?:-(\d{2}))?(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?)?$/,
  )

  if (parts) {
    const [, year, month, day, hour, minute, second, ms] = parts
    return new TZDate(
      Number(year),
      Number(month) - 1,
      day ? Number(day) : 1,
      Number(hour ?? 0),
      Number(minute ?? 0),
      Number(second ?? 0),
      Number(ms?.padEnd(3, "0") ?? 0),
      timeZone,
    )
  }

  // Anything else (e.g. "Jan 5, 2026"): best-effort parse in the site timezone
  return new TZDate(cleanDateString, timeZone)
}
