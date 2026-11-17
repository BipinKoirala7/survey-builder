"use client";

import { getColor } from "@/lib/chart-colors";

interface BarItem {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarItem[];
  /** Height of each bar row in px */
  rowHeight?: number;
}

export function BarChart({ data, rowHeight = 32 }: BarChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-muted text-sm italic">No data to display</p>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barHeight = Math.max(rowHeight - 8, 16);
  const labelWidth = 140;
  const valueWidth = 50;
  const totalWidth = 600;
  const barAreaWidth = totalWidth - labelWidth - valueWidth;
  const height = data.length * rowHeight + 8;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={totalWidth}
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        role="img"
        aria-label="Bar chart"
        className="w-full min-w-[400px]"
      >
        {data.map((item, i) => {
          const y = i * rowHeight + 4;
          const barWidth = maxVal > 0 ? (item.value / maxVal) * barAreaWidth : 0;
          const color = getColor(i);
          const percentage = maxVal > 0 ? Math.round((item.value / maxVal) * 100) : 0;

          return (
            <g key={i}>
              {/* Label */}
              <text
                x={0}
                y={y + barHeight / 2 + 4}
                textAnchor="start"
                className="fill-ink text-xs"
                style={{ fontSize: 12 }}
              >
                {item.label.length > 18
                  ? item.label.slice(0, 18) + "…"
                  : item.label}
              </text>
              {/* Bar background */}
              <rect
                x={labelWidth}
                y={y}
                width={barAreaWidth}
                height={barHeight}
                rx={4}
                className="fill-line"
              />
              {/* Bar fill */}
              <rect
                x={labelWidth}
                y={y}
                width={Math.max(barWidth, item.value > 0 ? 4 : 0)}
                height={barHeight}
                rx={4}
                fill={color}
              />
              {/* Value label */}
              <text
                x={labelWidth + barAreaWidth + 6}
                y={y + barHeight / 2 + 4}
                textAnchor="start"
                className="fill-ink text-xs font-medium"
                style={{ fontSize: 12 }}
              >
                {item.value}
                {item.value > 0 && (
                  <tspan className="fill-muted" style={{ fontSize: 10 }}>
                    {" "}
                    ({percentage}%)
                  </tspan>
                )}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
