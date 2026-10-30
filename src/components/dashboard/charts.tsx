"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { FDR_STATUS_LABELS, FDR_STATUS_STYLES } from "@/lib/constants";
import { formatINR } from "@/lib/utils";

export type BankDatum = { bank: string; value: number; count: number };
export type TimelineDatum = {
  key: string;
  label: string;
  value: number;
  count: number;
};
export type StatusDatum = { key: string; count: number; value: number };

const palette = ["#0b2b47", "#1e807d", "#d9832a", "#33658d", "#7c3aed", "#e11d48", "#64748b"];

function crores(value: number): number {
  return Math.round((value / 1_00_00_000) * 100) / 100;
}

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxShadow: "0 12px 40px -20px rgba(10,37,64,0.35)",
  fontSize: 12,
  padding: "8px 10px",
};

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
      {message}
    </div>
  );
}

export function BankDistributionChart({ data }: { data: BankDatum[] }) {
  if (!data.length) return <ChartEmpty message="No live instruments to chart yet." />;
  const rows = data.map((item) => ({ ...item, valueCr: crores(item.value) }));
  const max = Math.max(...rows.map((row) => row.valueCr), 1);

  return (
    <div className="h-[292px] w-full" role="img" aria-label="Bank-wise deposit value chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 28, bottom: 4, left: 4 }}
          barCategoryGap={12}
        >
          <CartesianGrid horizontal={false} stroke="#e8edf3" strokeDasharray="3 3" />
          <XAxis
            type="number"
            domain={[0, Math.ceil(max * 1.15)]}
            tick={{ fill: "#64748b", fontSize: 10.5 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `₹${value} Cr`}
          />
          <YAxis
            type="category"
            dataKey="bank"
            width={132}
            tick={{ fill: "#334155", fontSize: 10.5 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(11,43,71,0.04)" }}
            contentStyle={tooltipStyle}
            formatter={(value) => [`₹${Number(value).toFixed(2)} Cr`, "Deposit value"]}
          />
          <Bar dataKey="valueCr" radius={[0, 5, 5, 0]} barSize={16}>
            {rows.map((entry, index) => (
              <Cell key={entry.bank} fill={palette[index % palette.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MaturityTimelineChart({ data }: { data: TimelineDatum[] }) {
  if (!data.length) return <ChartEmpty message="Maturity timeline will appear here." />;
  const rows = data.map((item) => ({ ...item, valueCr: crores(item.value) }));

  return (
    <div className="h-[280px] w-full" role="img" aria-label="Maturity timeline chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 10, right: 14, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id="maturityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e807d" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#1e807d" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e8edf3" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#64748b", fontSize: 10.5 }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 10.5 }}
            tickLine={false}
            axisLine={false}
            width={54}
            tickFormatter={(value) => `₹${value} Cr`}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, _name, item) => {
              const count = (item?.payload as TimelineDatum | undefined)?.count ?? 0;
              return [`₹${Number(value).toFixed(2)} Cr · ${count} FDR${count === 1 ? "" : "s"}`, "Maturity value"];
            }}
          />
          <Area
            type="monotone"
            dataKey="valueCr"
            stroke="#1e807d"
            strokeWidth={2.2}
            fill="url(#maturityFill)"
            activeDot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: "#1e807d" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusDonutChart({ data }: { data: StatusDatum[] }) {
  if (!data.length) return <ChartEmpty message="No status distribution yet." />;
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const rows = data.map((item) => ({
    ...item,
    label: item.key === "RENEWED" ? "Renewed" : FDR_STATUS_LABELS[item.key as keyof typeof FDR_STATUS_LABELS] ?? item.key,
    color:
      item.key === "RENEWED"
        ? "#0284c7"
        : FDR_STATUS_STYLES[item.key as keyof typeof FDR_STATUS_STYLES]?.chart ?? "#64748b",
  }));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div
        className="relative h-[176px] w-[176px] shrink-0"
        role="img"
        aria-label="FDR status distribution donut chart"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="count"
              nameKey="label"
              innerRadius={54}
              outerRadius={78}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
            >
              {rows.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => [`${value} FDR${Number(value) === 1 ? "" : "s"}`, String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="metric-number text-xl font-semibold text-navy-900">{total}</span>
          <span className="text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
            Live records
          </span>
        </div>
      </div>
      <ul className="grid w-full grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {rows.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="metric-number shrink-0 font-semibold text-foreground">{item.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BankLegend({ data }: { data: BankDatum[] }) {
  if (!data.length) return null;
  return (
    <ul className="mt-3 grid grid-cols-1 gap-1.5 text-[11px] sm:grid-cols-2">
      {data.slice(0, 6).map((item, index) => (
        <li key={item.bank} className="flex items-center justify-between gap-3 text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: palette[index % palette.length] }}
              aria-hidden
            />
            <span className="truncate">{item.bank}</span>
          </span>
          <span className="shrink-0 tabular-nums">{formatINR(item.value, { compact: true })}</span>
        </li>
      ))}
    </ul>
  );
}
