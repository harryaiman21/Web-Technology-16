import React from 'react';

export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieSlice[];
  size?: number;
  innerRadius?: number; // for donut
}

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  const d = [
    'M', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
    'L', cx, cy,
    'Z'
  ].join(' ');

  return d;
}

export const PieChart: React.FC<PieChartProps> = ({ data, size = 200, innerRadius = 60 }) => {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1;
  let startAngle = 0;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((d, i) => {
        const angle = (d.value / total) * 360;
        const path = describeArc(cx, cy, r, startAngle, startAngle + angle);
        startAngle += angle;
        return <path key={i} d={path} fill={d.color} stroke="#fff" strokeWidth={1} />;
      })}

      {/* Inner circle to create donut */}
      <circle cx={cx} cy={cy} r={innerRadius} fill="#fff" />
    </svg>
  );
};

export default PieChart;
