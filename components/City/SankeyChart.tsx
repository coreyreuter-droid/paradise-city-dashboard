// components/City/SankeyChart.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { cityHref } from "@/lib/cityRouting";

type SankeyNode = {
  id: string;
  label: string;
  value: number;
  color: string;
  column: number;
};

type SankeyLink = {
  source: string;
  target: string;
  value: number;
};

type Props = {
  revenues: Array<{ category?: string | null; amount?: number | string | null }>;
  departments: Array<{ department_name: string; actuals: number; budget: number }>;
  cityName?: string;
  height?: number;
};

const REV_COLORS = [
  "#3b82a6", "#5b7fa6", "#4a8b7f", "#5a7a96",
  "#6a7b8c", "#4b8f8f", "#5c7fa0", "#6e8495",
];
const DEPT_COLORS = [
  "#6b8e5e", "#8a9a5e", "#a09060", "#b08a5a",
  "#9a7a6a", "#8a7080", "#7a6a90", "#7080a0",
  "#5a8a7a", "#8a6a5a", "#6a7a8a",
];
const OTHER_COLOR = "#94a3b8";
const CENTER_COLOR = "#475569";

const FMT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});
function fmtC(v: number) { return `$${FMT.format(v)}`; }

export default function SankeyChart({
  revenues,
  departments,
  cityName = "Your City",
  height = 600,
}: Props) {
  const router = useRouter();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [activeDetail, setActiveDetail] = useState<{
    label: string;
    value: number;
    pct: string;
    color: string;
  } | null>(null);

  const { nodes, links, totalRevenue, totalSpending } = useMemo(() => {
    const revenueMap = new Map<string, number>();
    for (const r of revenues) {
      const cat = r.category?.trim() || "Other Revenue";
      const amt = Number(r.amount || 0);
      if (amt > 0) revenueMap.set(cat, (revenueMap.get(cat) || 0) + amt);
    }

    const revSorted = Array.from(revenueMap.entries()).sort((a, b) => b[1] - a[1]);
    const topRev = revSorted.slice(0, 8);
    const otherRevTotal = revSorted.slice(8).reduce((s, [, v]) => s + v, 0);
    if (otherRevTotal > 0) topRev.push(["Other Sources", otherRevTotal]);

    const deptSorted = [...departments].sort((a, b) => b.actuals - a.actuals);
    const topDept = deptSorted.slice(0, 11);
    const otherDeptTotal = deptSorted.slice(11).reduce((s, d) => s + d.actuals, 0);

    const totalRevenue = topRev.reduce((s, [, v]) => s + (v as number), 0);
    const totalSpending = topDept.reduce((s, d) => s + d.actuals, 0) + otherDeptTotal;

    const nodes: SankeyNode[] = [];

    topRev.forEach(([name, value], i) => {
      nodes.push({
        id: `rev-${i}`,
        label: name as string,
        value: value as number,
        color: name === "Other Sources" ? OTHER_COLOR : REV_COLORS[i % REV_COLORS.length],
        column: 0,
      });
    });

    nodes.push({
      id: "center",
      label: cityName,
      value: Math.max(totalRevenue, totalSpending),
      color: CENTER_COLOR,
      column: 1,
    });

    topDept.forEach((dept, i) => {
      nodes.push({
        id: `dept-${i}`,
        label: dept.department_name,
        value: dept.actuals,
        color: DEPT_COLORS[i % DEPT_COLORS.length],
        column: 2,
      });
    });

    if (otherDeptTotal > 0) {
      nodes.push({
        id: "dept-other",
        label: "Other Departments",
        value: otherDeptTotal,
        color: OTHER_COLOR,
        column: 2,
      });
    }

    const links: SankeyLink[] = [];
    topRev.forEach(([, value], i) => {
      links.push({ source: `rev-${i}`, target: "center", value: value as number });
    });
    topDept.forEach((dept, i) => {
      links.push({ source: "center", target: `dept-${i}`, value: dept.actuals });
    });
    if (otherDeptTotal > 0) {
      links.push({ source: "center", target: "dept-other", value: otherDeptTotal });
    }

    return { nodes, links, totalRevenue, totalSpending };
  }, [revenues, departments, cityName]);

  const layout = useMemo(() => {
    const pad = 16;
    const nodeW = 14;
    const gap = 8;
    const W = 900;
    const labelSpace = 200;

    const colX = [labelSpace, (W - nodeW) / 2, W - labelSpace - nodeW];
    const columns: SankeyNode[][] = [[], [], []];
    nodes.forEach((n) => columns[n.column].push(n));

    const positions = new Map<string, { x: number; y: number; h: number }>();

    columns.forEach((col, ci) => {
      const total = col.reduce((s, n) => s + n.value, 0);
      const available = height - pad * 2 - (col.length - 1) * gap;
      let cy = pad;
      col.forEach((n) => {
        const h = Math.max(18, (n.value / total) * available);
        positions.set(n.id, { x: colX[ci], y: cy, h });
        cy += h + gap;
      });
    });

    const srcOff = new Map<string, number>();
    const tgtOff = new Map<string, number>();
    nodes.forEach((n) => { srcOff.set(n.id, 0); tgtOff.set(n.id, 0); });

    const ribbons = links.map((link) => {
      const sp = positions.get(link.source)!;
      const tp = positions.get(link.target)!;
      const sn = nodes.find((n) => n.id === link.source)!;
      const tn = nodes.find((n) => n.id === link.target)!;

      const sTotal = links.filter((l) => l.source === link.source).reduce((s, l) => s + l.value, 0);
      const tTotal = links.filter((l) => l.target === link.target).reduce((s, l) => s + l.value, 0);

      const sH = sp.h * (link.value / sTotal);
      const tH = tp.h * (link.value / tTotal);

      const sOff = srcOff.get(link.source) || 0;
      const tOff = tgtOff.get(link.target) || 0;
      srcOff.set(link.source, sOff + sH);
      tgtOff.set(link.target, tOff + tH);

      const x0 = sp.x + nodeW;
      const y0s = sp.y + sOff, y0e = y0s + sH;
      const x1 = tp.x;
      const y1s = tp.y + tOff, y1e = y1s + tH;

      const cx0 = x0 + (x1 - x0) * 0.4;
      const cx1 = x1 - (x1 - x0) * 0.4;

      const path = `M${x0},${y0s} C${cx0},${y0s} ${cx1},${y1s} ${x1},${y1s} L${x1},${y1e} C${cx1},${y1e} ${cx0},${y0e} ${x0},${y0e} Z`;

      return {
        id: `${link.source}-${link.target}`,
        source: link.source, target: link.target,
        value: link.value, path,
        sColor: sn.color, tColor: tn.color,
      };
    });

    return { positions, ribbons, W, nodeW };
  }, [nodes, links, height]);

  const hasHover = hoveredNode !== null || hoveredLink !== null;

  const isHighlighted = (src: string, tgt: string) => {
    if (hoveredLink === `${src}-${tgt}`) return true;
    if (hoveredNode && (src === hoveredNode || tgt === hoveredNode)) return true;
    return false;
  };

  const isNodeLit = (nodeId: string) => {
    if (hoveredNode === nodeId) return true;
    return layout.ribbons.some((r) => isHighlighted(r.source, r.target) && (r.source === nodeId || r.target === nodeId));
  };

  const handleNodeClick = (node: SankeyNode) => {
    if (node.column === 0 && node.label !== "Other Sources") {
      const slug = node.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
      router.push(cityHref(`/revenues/${encodeURIComponent(slug)}`));
    } else if (node.column === 2 && node.id !== "dept-other") {
      router.push(cityHref(`/departments/${encodeURIComponent(node.label)}`));
    }
  };

  const handleRibbonClick = (src: string, tgt: string) => {
    if (src.startsWith("rev-")) {
      const n = nodes.find((nd) => nd.id === src);
      if (n && n.label !== "Other Sources") {
        const slug = n.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
        router.push(cityHref(`/revenues/${encodeURIComponent(slug)}`));
      }
    } else if (tgt.startsWith("dept-") && tgt !== "dept-other") {
      const n = nodes.find((nd) => nd.id === tgt);
      if (n) router.push(cityHref(`/departments/${encodeURIComponent(n.label)}`));
    }
  };

  const isClickable = (node: SankeyNode) => {
    if (node.column === 0 && node.label !== "Other Sources") return true;
    if (node.column === 2 && node.id !== "dept-other") return true;
    return false;
  };

  const showDetail = (label: string, value: number, color: string, col: number) => {
    const base = col === 0 ? totalRevenue : totalSpending;
    const pct = base > 0 ? ((value / base) * 100).toFixed(1) + "% of " + (col === 0 ? "revenue" : "spending") : "";
    setActiveDetail({ label, value, pct, color });
  };

  const surplus = totalRevenue - totalSpending;

  if (nodes.length === 0 || links.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-600">
        Not enough data to display money flow visualization.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Explainer */}
      <p className="text-center text-[12px] text-slate-500">
        Widths represent dollars. Click any source or department to explore.
      </p>

      {/* Chart */}
      <div
        className="relative w-full"
        style={{ height }}
        role="img"
        aria-label={`Money flow: ${fmtC(totalRevenue)} revenue flows through ${cityName} to departments spending ${fmtC(totalSpending)}`}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${layout.W} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="overflow-visible"
        >
          <defs>
            {layout.ribbons.map((r) => (
              <linearGradient key={`g-${r.id}`} id={`g-${r.id}`} x1="0%" x2="100%">
                <stop offset="0%" stopColor={r.sColor} stopOpacity="0.45" />
                <stop offset="100%" stopColor={r.tColor} stopOpacity="0.45" />
              </linearGradient>
            ))}
          </defs>

          {/* Ribbons */}
          {layout.ribbons.map((r) => {
            const lit = isHighlighted(r.source, r.target);
            return (
              <path
                key={r.id}
                d={r.path}
                fill={`url(#g-${r.id})`}
                opacity={!hasHover ? 0.55 : lit ? 0.75 : 0.06}
                className="transition-opacity duration-200"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => {
                  setHoveredLink(r.id);
                  const sn = nodes.find((n) => n.id === r.source);
                  const tn = nodes.find((n) => n.id === r.target);
                  if (sn && tn) {
                    const base = sn.column === 0 ? totalRevenue : totalSpending;
                    const pct = base > 0 ? ((r.value / base) * 100).toFixed(1) + "%" : "";
                    setActiveDetail({
                      label: `${sn.label} → ${tn.label}`,
                      value: r.value,
                      pct,
                      color: r.sColor,
                    });
                  }
                }}
                onMouseLeave={() => { setHoveredLink(null); setActiveDetail(null); }}
                onClick={() => handleRibbonClick(r.source, r.target)}
              />
            );
          })}

          {/* Node bars */}
          {nodes.map((node) => {
            const pos = layout.positions.get(node.id);
            if (!pos) return null;
            const clickable = isClickable(node);
            const lit = !hasHover || isNodeLit(node.id);

            return (
              <rect
                key={node.id}
                x={pos.x}
                y={pos.y}
                width={layout.nodeW}
                height={pos.h}
                fill={node.color}
                rx={3}
                opacity={lit ? 1 : 0.35}
                className="transition-opacity duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                style={{ cursor: clickable ? "pointer" : "default" }}
                tabIndex={clickable ? 0 : undefined}
                role={clickable ? "button" : undefined}
                aria-label={clickable ? `${node.label}: ${formatCurrency(node.value)}. Click to explore.` : undefined}
                onClick={clickable ? () => handleNodeClick(node) : undefined}
                onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleNodeClick(node); } } : undefined}
                onMouseEnter={() => { setHoveredNode(node.id); showDetail(node.label, node.value, node.color, node.column); }}
                onMouseLeave={() => { setHoveredNode(null); setActiveDetail(null); }}
                onFocus={() => { setHoveredNode(node.id); showDetail(node.label, node.value, node.color, node.column); }}
                onBlur={() => { setHoveredNode(null); setActiveDetail(null); }}
              />
            );
          })}
        </svg>

        {/* Text labels */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Column labels */}
          <div className="absolute top-0 left-0 text-[11px] font-medium uppercase tracking-wide text-slate-500" style={{ width: "22%" }}>
            <span className="float-right">Where it comes from</span>
          </div>
          <div className="absolute top-0 right-0 text-[11px] font-medium uppercase tracking-wide text-slate-500" style={{ width: "22%" }}>
            Where it goes
          </div>
          {nodes.map((node) => {
            const pos = layout.positions.get(node.id);
            if (!pos) return null;

            const isLeft = node.column === 0;
            const isRight = node.column === 2;
            const isCenter = node.column === 1;
            const clickable = isClickable(node);
            const dimmed = hasHover && !isNodeLit(node.id);

            const pctX = (pos.x / layout.W) * 100;
            const pctXR = ((layout.W - pos.x - layout.nodeW) / layout.W) * 100;

            return (
              <div
                key={`lbl-${node.id}`}
                className="absolute flex items-center transition-opacity duration-200"
                style={{
                  top: isCenter ? Math.max(0, pos.y - 32) : pos.y,
                  height: isCenter ? "auto" : pos.h,
                  opacity: dimmed ? 0.25 : 1,
                  ...(isLeft && { right: `calc(${100 - pctX}% + 6px)` }),
                  ...(isRight && { left: `calc(${100 - pctXR}% + 6px)` }),
                  ...(isCenter && { left: "50%", transform: "translateX(-50%)" }),
                }}
              >
                <div
                  className={`flex ${isCenter ? "flex-col items-center rounded-lg bg-white/80 backdrop-blur-sm px-3 py-1" : isRight ? "items-baseline gap-1.5" : "items-baseline gap-1.5 justify-end"} ${clickable ? "pointer-events-auto cursor-pointer" : "pointer-events-auto"}`}
                  onClick={clickable ? () => handleNodeClick(node) : undefined}
                  onMouseEnter={() => { setHoveredNode(node.id); showDetail(node.label, node.value, node.color, node.column); }}
                  onMouseLeave={() => { setHoveredNode(null); setActiveDetail(null); }}
                >
                  {isCenter ? (
                    <>
                      <span className="text-[13px] font-semibold text-slate-800 whitespace-nowrap">{cityName}</span>
                      <span className="text-[12px] font-medium text-slate-500">{fmtC(node.value)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[12px] font-semibold text-slate-800 whitespace-nowrap leading-tight">
                        {node.label}
                      </span>
                      <span className="text-[11px] font-medium whitespace-nowrap leading-tight" style={{ color: node.color }}>
                        {fmtC(node.value)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inline detail card / summary footer */}
      {activeDetail ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
          <div className="h-4 w-4 flex-shrink-0 rounded" style={{ backgroundColor: activeDetail.color }} aria-hidden="true" />
          <p className="flex-1 text-sm font-semibold text-slate-900">{activeDetail.label}</p>
          <div className="text-right flex-shrink-0">
            <span className="text-sm font-semibold text-slate-900">{formatCurrency(activeDetail.value)}</span>
            {activeDetail.pct && (
              <span className="ml-2 text-[12px] text-slate-500">{activeDetail.pct}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-sm">
          <div className="text-slate-600">
            <span className="font-semibold text-slate-900">{fmtC(totalRevenue)}</span> total revenue
          </div>
          {surplus !== 0 && (
            <div className={`text-[12px] ${surplus > 0 ? "text-emerald-700" : "text-red-600"}`}>
              {surplus > 0 ? "+" : ""}{fmtC(surplus)} {surplus > 0 ? "surplus" : "deficit"}
            </div>
          )}
          <div className="text-slate-600">
            <span className="font-semibold text-slate-900">{fmtC(totalSpending)}</span> total spending
          </div>
        </div>
      )}

      {/* Screen reader table */}
      <table className="sr-only">
        <caption>Money flow from revenue sources through {cityName} to departments</caption>
        <thead><tr><th>From</th><th>To</th><th>Amount</th></tr></thead>
        <tbody>
          {links.map((link, i) => {
            const sn = nodes.find((n) => n.id === link.source);
            const tn = nodes.find((n) => n.id === link.target);
            return (<tr key={i}><td>{sn?.label}</td><td>{tn?.label}</td><td>{formatCurrency(link.value)}</td></tr>);
          })}
        </tbody>
      </table>
    </div>
  );
}
