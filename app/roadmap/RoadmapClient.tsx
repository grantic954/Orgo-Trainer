"use client";

import { useMemo, useState } from "react";
import type { RoadmapEdge, RoadmapNode } from "@/lib/roadmap/data";

interface NeighborInfo {
  nodeId: string;
  label: string;
  incomingReagents: string[];
  outgoingReagents: string[];
}

export function RoadmapClient({
  nodes,
  edges,
}: {
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
}) {
  const [selectedId, setSelectedId] = useState<string>(nodes[0]?.id ?? "");

  const neighbors = useMemo<NeighborInfo[]>(() => {
    const map = new Map<string, NeighborInfo>();
    const ensure = (id: string): NeighborInfo => {
      const existing = map.get(id);
      if (existing) return existing;
      const label = nodes.find((n) => n.id === id)?.label ?? id;
      const fresh: NeighborInfo = {
        nodeId: id,
        label,
        incomingReagents: [],
        outgoingReagents: [],
      };
      map.set(id, fresh);
      return fresh;
    };
    for (const e of edges) {
      if (e.to === selectedId) ensure(e.from).incomingReagents.push(e.reagents);
      if (e.from === selectedId) ensure(e.to).outgoingReagents.push(e.reagents);
    }
    return [...map.values()];
  }, [edges, nodes, selectedId]);

  const selectedNode = nodes.find((n) => n.id === selectedId);

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h2 className="mb-2 text-sm font-semibold">Pick a functional group</h2>
        <div className="flex flex-wrap gap-2">
          {nodes.map((n) => {
            const active = selectedId === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelectedId(n.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-neutral-200 bg-white hover:bg-neutral-100"
                }`}
              >
                {n.label}
              </button>
            );
          })}
        </div>
      </section>

      {selectedNode && (
        <HubAndSpoke
          center={selectedNode}
          neighbors={neighbors}
          onNeighborClick={setSelectedId}
        />
      )}

      <section className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-500">
        <span className="text-emerald-700">green arrow</span> = how to make {selectedNode?.label} from the outer group ·{" "}
        <span className="text-blue-700">blue arrow</span> = how to turn {selectedNode?.label} into the outer group · click any outer node to recenter.
      </section>
    </div>
  );
}

function HubAndSpoke({
  center,
  neighbors,
  onNeighborClick,
}: {
  center: RoadmapNode;
  neighbors: NeighborInfo[];
  onNeighborClick: (id: string) => void;
}) {
  const W = 900;
  const H = 640;
  const cx = W / 2;
  const cy = H / 2;
  const rx = 340;
  const ry = 240;
  const N = Math.max(neighbors.length, 1);

  const positioned = neighbors.map((n, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / N;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    return { ...n, x, y, angle };
  });

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-2">
      {neighbors.length === 0 ? (
        <div className="p-6 text-center text-sm text-neutral-500">
          No reactions in the graph for {center.label} yet.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          xmlns="http://www.w3.org/2000/svg"
          className="h-auto w-full"
          style={{ maxHeight: "70vh" }}
        >
          <defs>
            <marker
              id="arrow-in"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
              fill="#059669"
            >
              <path d="M0,0 L10,5 L0,10 z" />
            </marker>
            <marker
              id="arrow-out"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
              fill="#2563eb"
            >
              <path d="M0,0 L10,5 L0,10 z" />
            </marker>
          </defs>

          {positioned.map((p) => (
            <ConnectionGroup
              key={p.nodeId}
              fromX={p.x}
              fromY={p.y}
              toX={cx}
              toY={cy}
              incomingReagents={p.incomingReagents}
              outgoingReagents={p.outgoingReagents}
            />
          ))}

          <g>
            <rect
              x={cx - 110}
              y={cy - 42}
              rx={14}
              ry={14}
              width={220}
              height={84}
              fill="#fef3c7"
              stroke="#f59e0b"
              strokeWidth={2}
            />
            <text
              x={cx}
              y={cy + 5}
              textAnchor="middle"
              fontSize={14}
              fontWeight="700"
              fill="#78350f"
            >
              {center.label}
            </text>
          </g>

          {positioned.map((p) => (
            <g
              key={p.nodeId}
              className="cursor-pointer"
              onClick={() => onNeighborClick(p.nodeId)}
            >
              <rect
                x={p.x - 90}
                y={p.y - 24}
                rx={10}
                ry={10}
                width={180}
                height={48}
                fill="white"
                stroke="#4b5563"
                strokeWidth={1.5}
                className="hover:fill-neutral-100"
              />
              <text
                x={p.x}
                y={p.y + 4}
                textAnchor="middle"
                fontSize={12}
                fontWeight="600"
                fill="#111827"
                pointerEvents="none"
              >
                {wrapLabel(p.label).map((line, i) => (
                  <tspan key={i} x={p.x} dy={i === 0 ? 0 : 14}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

function ConnectionGroup({
  fromX,
  fromY,
  toX,
  toY,
  incomingReagents,
  outgoingReagents,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  incomingReagents: string[];
  outgoingReagents: string[];
}) {
  const nodeHalfW = 90;
  const nodeHalfH = 24;
  const centerHalfW = 110;
  const centerHalfH = 42;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  const fromOffset = Math.min(
    Math.abs(ux) < 0.001 ? Infinity : nodeHalfW / Math.abs(ux),
    Math.abs(uy) < 0.001 ? Infinity : nodeHalfH / Math.abs(uy),
  );
  const toOffset = Math.min(
    Math.abs(ux) < 0.001 ? Infinity : centerHalfW / Math.abs(ux),
    Math.abs(uy) < 0.001 ? Infinity : centerHalfH / Math.abs(uy),
  );
  const sx = fromX + ux * fromOffset;
  const sy = fromY + uy * fromOffset;
  const ex = toX - ux * toOffset;
  const ey = toY - uy * toOffset;

  const perp = { x: -uy, y: ux };
  const gap = 14;
  const midX = (sx + ex) / 2;
  const midY = (sy + ey) / 2;

  return (
    <g>
      {incomingReagents.length > 0 && (
        <line
          x1={sx + perp.x * gap}
          y1={sy + perp.y * gap}
          x2={ex + perp.x * gap}
          y2={ey + perp.y * gap}
          stroke="#059669"
          strokeWidth={1.6}
          markerEnd="url(#arrow-in)"
        />
      )}
      {outgoingReagents.length > 0 && (
        <line
          x1={ex - perp.x * gap}
          y1={ey - perp.y * gap}
          x2={sx - perp.x * gap}
          y2={sy - perp.y * gap}
          stroke="#2563eb"
          strokeWidth={1.6}
          markerEnd="url(#arrow-out)"
        />
      )}
      {incomingReagents.map((r, i) => (
        <ReagentLabel
          key={`in-${i}`}
          x={midX + perp.x * (gap + 2)}
          y={midY + perp.y * (gap + 2) - i * 12}
          text={r}
          color="#065f46"
          bg="#d1fae5"
        />
      ))}
      {outgoingReagents.map((r, i) => (
        <ReagentLabel
          key={`out-${i}`}
          x={midX - perp.x * (gap + 2)}
          y={midY - perp.y * (gap + 2) + i * 12}
          text={r}
          color="#1e3a8a"
          bg="#dbeafe"
        />
      ))}
    </g>
  );
}

function ReagentLabel({
  x,
  y,
  text,
  color,
  bg,
}: {
  x: number;
  y: number;
  text: string;
  color: string;
  bg: string;
}) {
  const padding = 4;
  const charW = 5.4;
  const w = Math.min(text.length, 48) * charW + padding * 2;
  const h = 14;
  return (
    <g>
      <rect
        x={x - w / 2}
        y={y - h / 2}
        rx={3}
        ry={3}
        width={w}
        height={h}
        fill={bg}
        opacity={0.95}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize={10}
        fontWeight={600}
        fill={color}
      >
        {text.length > 48 ? text.slice(0, 46) + "…" : text}
      </text>
    </g>
  );
}

function wrapLabel(label: string): string[] {
  if (label.length <= 20) return [label];
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if (!current) current = w;
    else if (current.length + 1 + w.length <= 24) current = `${current} ${w}`;
    else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}
