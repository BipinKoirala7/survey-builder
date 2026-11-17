export const chartColors = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
] as const;

export function getColor(index: number): string {
  return chartColors[index % chartColors.length];
}
