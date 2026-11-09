import { formatCount } from "@/lib/plural"

export function formatSubpostCount(count: number): string {
  return formatCount(count, "subpost")
}
