// components/City/SankeyChart.tsx
"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

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
  height?: number;
};

// Color palette
const COLORS = {
  revenue: [
    "#0d9488", // teal-600
    "#0891b2", // cyan-600
    "#0284c7", // sky-600
    "#2563eb", // blue-600
    "#4f46e5", // indigo-600
    "#7c3aed", // violet-600
    "#9333ea", // purple-600
    "#c026d3", // fuchsia-600
    "#64748b", // slate-500
  ],
  center: "#0f172a", // slate-900
  departments: [
    "#16a34a", // green-600
    "#65a30d", // lime-600
    "#ca8a04", // yellow-600
    "#ea580c", // orange-600
    "#dc2626", // red-600
    "#db2777", // pink-600
    "#9333ea", // purple-600
    "#2563eb", // blue-600
    "#64748b", // slate-500
  ],
};

const CURRENCY_COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

function formatCompact(value: number): string {
  return `$${CURRENCY_COMPACT.format(value)}`;
}

export default function SankeyChart({ revenues, departments, height = 400 }: Props) {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  // Process data into Sankey format
  const { nodes, links, totalRevenue, totalSpending } = useMemo(() => {
    // Aggregate revenues by category
    const revenueMap = new Map<string, number>();
    for (const r of revenues) {
      const cat = r.category?.trim() || "Other Revenue";
      const amt = Number(r.amount || 0);
      if (amt > 0) {
        revenueMap.set(cat, (revenueMap.get(cat) || 0) + amt);
      }
    }

    // Sort and take top 5 revenue sources, combine rest into "Other"
    const revenueSorted = Array.from(revenueMap.entries())
      .sort((a, b) => b[1] - a[1]);
    
      const topRevenues = revenueSorted.slice(0, 8);
      const otherRevenueTotal = revenueSorted.slice(8).reduce((sum, [, v]) => sum + v, 0);
    if (otherRevenueTotal > 0) {
      topRevenues.push(["Other Sources", otherRevenueTotal]);
    }

    // Sort departments and take top 8, combine rest into "Other"
    const deptSorted = [...departments].sort((a, b) => b.actuals - a.actuals);
    const topDepts = deptSorted.slice(0, 8);
    const otherDeptTotal = deptSorted.slice(8).reduce((sum, d) => sum + d.actuals, 0);

    const totalRevenue = topRevenues.reduce((sum, [, v]) => sum + v, 0);
    const totalSpending = topDepts.reduce((sum, d) => sum + d.actuals, 0) + otherDeptTotal;

    // Build nodes
    const nodes: SankeyNode[] = [];
    
    // Revenue nodes (left column)
    topRevenues.forEach(([name, value], i) => {
      nodes.push({
        id: `rev-${i}`,
        label: name.length > 18 ? name.slice(0, 16) + "…" : name,
        value,
        color: COLORS.revenue[i % COLORS.revenue.length],
        column: 0,
      });
    });

    // Center node(Government Fund)
    nodes.push({
      id: "center",
      label: "Government Fund",
      value: Math.max(totalRevenue, totalSpending),
      color: COLORS.center,
      column: 1,
    });

    // Department nodes (right column)
    topDepts.forEach((dept, i) => {
      nodes.push({
        id: `dept-${i}`,
        label: dept.department_name.length > 18 
          ? dept.department_name.slice(0, 16) + "…" 
          : dept.department_name,
        value: dept.actuals,
        color: COLORS.departments[i % COLORS.departments.length],
        column: 2,
      });
    });

    if (otherDeptTotal > 0) {
      nodes.push({
        id: "dept-other",
        label: "Other Depts",
        value: otherDeptTotal,
        color: "#64748b",
        column: 2,
      });
    }

    // Build links
    const links: SankeyLink[] = [];

    // Revenue → Center
    topRevenues.forEach(([, value], i) => {
      links.push({
        source: `rev-${i}`,
        target: "center",
        value,
      });
    });

    // Center → Departments
    topDepts.forEach((dept, i) => {
      links.push({
        source: "center",
        target: `dept-${i}`,
        value: dept.actuals,
      });
    });

    if (otherDeptTotal > 0) {
      links.push({
        source: "center",
        target: "dept-other",
        value: otherDeptTotal,
      });
    }

    return { nodes, links, totalRevenue, totalSpending };
  }, [revenues, departments]);

  // Calculate positions - all in absolute coordinates
  const layout = useMemo(() => {
    const padding = 20;
    const nodeWidth = 24;
    const nodePadding = 8;
    const width = 800; // Fixed internal width for calculations
    
    // Column X positions
    const columnX = [0, (width - nodeWidth) / 2, width - nodeWidth];

    // Group nodes by column
    const columns: SankeyNode[][] = [[], [], []];
    nodes.forEach(node => {
      columns[node.column].push(node);
    });

    // Calculate vertical positions for each column
    const nodePositions = new Map<string, { x: number; y: number; height: number }>();
    
    columns.forEach((column, colIndex) => {
      const totalValue = column.reduce((sum, n) => sum + n.value, 0);
      const availableHeight = height - padding * 2 - (column.length - 1) * nodePadding;
      
      let currentY = padding;
      column.forEach(node => {
        const nodeHeight = Math.max(24, (node.value / totalValue) * availableHeight);
        nodePositions.set(node.id, {
          x: columnX[colIndex],
          y: currentY,
          height: nodeHeight,
        });
        currentY += nodeHeight + nodePadding;
      });
    });

    // Track Y offsets for links
    const sourceOffsets = new Map<string, number>();
    const targetOffsets = new Map<string, number>();
    nodes.forEach(n => {
      sourceOffsets.set(n.id, 0);
      targetOffsets.set(n.id, 0);
    });

    // Calculate link paths
    const linkPaths = links.map(link => {
      const sourcePos = nodePositions.get(link.source)!;
      const targetPos = nodePositions.get(link.target)!;
      const sourceNode = nodes.find(n => n.id === link.source)!;
      const targetNode = nodes.find(n => n.id === link.target)!;

      // Calculate link thickness
      const sourceTotal = links
        .filter(l => l.source === link.source)
        .reduce((sum, l) => sum + l.value, 0);
      const targetTotal = links
        .filter(l => l.target === link.target)
        .reduce((sum, l) => sum + l.value, 0);

      const sourceRatio = link.value / sourceTotal;
      const targetRatio = link.value / targetTotal;
      
      const linkHeightSource = sourcePos.height * sourceRatio;
      const linkHeightTarget = targetPos.height * targetRatio;

      // Get current offsets
      const sourceYOffset = sourceOffsets.get(link.source) || 0;
      const targetYOffset = targetOffsets.get(link.target) || 0;

      // Update offsets for next link
      sourceOffsets.set(link.source, sourceYOffset + linkHeightSource);
      targetOffsets.set(link.target, targetYOffset + linkHeightTarget);

      // Calculate path coordinates
      const x0 = sourcePos.x + nodeWidth;
      const y0Start = sourcePos.y + sourceYOffset;
      const y0End = y0Start + linkHeightSource;
      
      const x1 = targetPos.x;
      const y1Start = targetPos.y + targetYOffset;
      const y1End = y1Start + linkHeightTarget;

      // Control points for bezier curve
      const midX = (x0 + x1) / 2;

      // Create a filled path (like a ribbon)
      const path = `
        M ${x0} ${y0Start}
        C ${midX} ${y0Start}, ${midX} ${y1Start}, ${x1} ${y1Start}
        L ${x1} ${y1End}
        C ${midX} ${y1End}, ${midX} ${y0End}, ${x0} ${y0End}
        Z
      `;

      return {
        ...link,
        path,
        sourceColor: sourceNode.color,
        targetColor: targetNode.color,
        id: `${link.source}-${link.target}`,
      };
    });

    return { nodePositions, linkPaths, width };
  }, [nodes, links, height]);

  const handleLinkHover = (linkId: string | null, event?: React.MouseEvent) => {
    setHoveredLink(linkId);
    if (linkId && event) {
      const link = links.find(l => `${l.source}-${l.target}` === linkId);
      if (link) {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);
        setTooltip({
          x: event.clientX,
          y: event.clientY,
          content: `${sourceNode?.label} → ${targetNode?.label}: ${formatCurrency(link.value)}`,
        });
      }
    } else {
      setTooltip(null);
    }
  };

  if (nodes.length === 0 || links.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Not enough data to display money flow visualization.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Column labels */}
      <div className="mb-3 flex justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Revenue Sources</span>
        <span>Government Fund</span>
        <span>Departments</span>
      </div>

      <div 
        className="relative w-full" 
        style={{ height }}
        role="img"
        aria-label={`Sankey diagram showing money flow: ${formatCompact(totalRevenue)} in revenue flowing through our government to departments spending ${formatCompact(totalSpending)}`}
      >
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${layout.width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="overflow-visible"
        >
          <defs>
            {layout.linkPaths.map(link => (
              <linearGradient
                key={`grad-${link.id}`}
                id={`grad-${link.id}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor={link.sourceColor} />
                <stop offset="100%" stopColor={link.targetColor} />
              </linearGradient>
            ))}
          </defs>

          {/* Links (flows) */}
          {layout.linkPaths.map(link => (
            <path
              key={link.id}
              d={link.path}
              fill={`url(#grad-${link.id})`}
              opacity={hoveredLink === null || hoveredLink === link.id ? 0.6 : 0.15}
              className="transition-opacity duration-200"
              onMouseEnter={(e) => handleLinkHover(link.id, e)}
              onMouseLeave={() => handleLinkHover(null)}
              style={{ cursor: "pointer" }}
            />
          ))}

          {/* Nodes */}
          {nodes.map(node => {
            const pos = layout.nodePositions.get(node.id);
            if (!pos) return null;

            return (
              <rect
                key={node.id}
                x={pos.x}
                y={pos.y}
                width={24}
                height={pos.height}
                fill={node.color}
                rx={4}
              />
            );
          })}
        </svg>

        {/* HTML Labels */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {nodes.map(node => {
            const pos = layout.nodePositions.get(node.id);
            if (!pos) return null;

            const isLeft = node.column === 0;
            const isRight = node.column === 2;
            const isCenter = node.column === 1;

            // Convert coordinates to percentages for positioning
            const leftPercent = (pos.x / layout.width) * 100;
            const rightPercent = ((layout.width - pos.x - 24) / layout.width) * 100;

            return (
              <div
                key={`label-${node.id}`}
                className="absolute flex items-center"
                style={{
                  left: isLeft ? `calc(${leftPercent}% + 32px)` : 
                        isCenter ? '50%' : undefined,
                  right: isRight ? `calc(${rightPercent}% + 32px)` : undefined,
                  top: pos.y,
                  height: pos.height,
                  transform: isCenter ? 'translateX(-50%)' : undefined,
                }}
              >
<div className={`flex flex-col rounded bg-white border border-slate-200 shadow-sm px-1.5 py-0.5 max-w-[120px] sm:max-w-none ${isRight ? 'items-end text-right' : isCenter ? 'items-center text-center' : 'items-start'}`}>
  <span className="text-[11px] sm:text-xs font-semibold text-slate-900 leading-tight whitespace-nowrap truncate max-w-full">
    {node.label}
  </span>
  {pos.height > 28 && (
    <span className="text-[10px] font-medium text-slate-700 leading-tight">
      {formatCompact(node.value)}
    </span>
  )}
</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-lg"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 10,
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Summary footer */}
      <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-sm">
        <div className="text-slate-600">
          <span className="font-semibold text-slate-900">{formatCompact(totalRevenue)}</span> total revenue
        </div>
        <div className="text-slate-600">
          <span className="font-semibold text-slate-900">{formatCompact(totalSpending)}</span> total spending
        </div>
      </div>

      {/* Screen reader table */}
      <table className="sr-only">
        <caption>Money flow from revenue sources to departments</caption>
        <thead>
          <tr>
            <th>From</th>
            <th>To</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link, i) => {
            const sourceNode = nodes.find(n => n.id === link.source);
            const targetNode = nodes.find(n => n.id === link.target);
            return (
              <tr key={i}>
                <td>{sourceNode?.label}</td>
                <td>{targetNode?.label}</td>
                <td>{formatCurrency(link.value)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
