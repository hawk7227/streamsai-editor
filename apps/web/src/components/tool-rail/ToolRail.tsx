"use client";

import { useMemo, useState } from "react";
import type { ToolSection } from "@/lib/project-config";

interface ToolRailProps {
  activeSection: ToolSection;
  onSectionChange: (section: ToolSection) => void;
  projectName: string;
  currentFile: string;
}

const ITEMS: Array<{ key: ToolSection; icon: string; label: string }> = [
  { key: "projects", icon: "📁", label: "Projects" },
  { key: "files", icon: "📄", label: "Files" },
  { key: "uploads", icon: "⬆", label: "Uploads" },
  { key: "artifacts", icon: "📦", label: "Artifacts" },
  { key: "apps", icon: "⚙", label: "Apps" },
  { key: "settings", icon: "🛠", label: "Settings" },
];

export function ToolRail({ activeSection, onSectionChange, projectName, currentFile }: ToolRailProps) {
  const [expanded, setExpanded] = useState(false);

  const panel = useMemo(() => {
    switch (activeSection) {
      case "projects":
        return (
          <>
            <RailLine label="Active Project" value={projectName} />
            <RailLine label="Repo" value="hawk7227/streamsai-editor" />
            <RailLine label="Branch" value="main" />
          </>
        );
      case "files":
        return (
          <>
            <RailLine label="Current File" value={currentFile} />
            <RailHint>Only the current discussion file is kept visible in the workspace.</RailHint>
          </>
        );
      case "uploads":
        return <RailHint>Use /setup first, then upload documents, images, archives, and frontend files into the active project context.</RailHint>;
      case "artifacts":
        return <RailHint>Preview bundles, staged diffs, and shareable artifacts appear here once generated.</RailHint>;
      case "apps":
        return <RailHint>GitHub, Supabase, and Vercel connections are managed in Setup.</RailHint>;
      case "settings":
        return <RailHint>Project lock, preview modes, and compact workspace behavior are controlled here.</RailHint>;
      default:
        return null;
    }
  }, [activeSection, currentFile, projectName]);

  return (
    <div style={{
      width: expanded ? 220 : 52,
      transition: "width 180ms ease",
      borderRight: "1px solid rgba(255,255,255,0.08)",
      background: "#080a0f",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      flexShrink: 0,
    }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          height: 28,
          border: "none",
          background: "transparent",
          color: "rgba(255,255,255,0.65)",
          cursor: "pointer",
          fontSize: 12,
        }}
        title={expanded ? "Collapse tools" : "Expand tools"}
      >
        {expanded ? "◀" : "▶"}
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: expanded ? 8 : 6 }}>
        {ITEMS.map(item => {
          const active = item.key === activeSection;
          return (
            <button
              key={item.key}
              onClick={() => onSectionChange(item.key)}
              title={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                border: active ? "1px solid rgba(111,236,208,0.24)" : "1px solid rgba(255,255,255,0.06)",
                background: active ? "rgba(88,220,197,0.12)" : "rgba(255,255,255,0.02)",
                color: active ? "#defcf3" : "rgba(255,255,255,0.72)",
                borderRadius: 10,
                padding: expanded ? "8px 10px" : "8px 0",
                justifyContent: expanded ? "flex-start" : "center",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              <span>{item.icon}</span>
              {expanded ? <span>{item.label}</span> : null}
            </button>
          );
        })}
      </div>

      {expanded ? (
        <div style={{ padding: 10, borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.72)", fontSize: 11, overflowY: "auto" }}>
          {panel}
        </div>
      ) : null}
    </div>
  );
}

function RailLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.42)", marginBottom: 4 }}>{label}</div>
      <div style={{ wordBreak: "break-word" }}>{value}</div>
    </div>
  )
}

function RailHint({ children }: { children: React.ReactNode }) {
  return <div style={{ lineHeight: 1.5, color: "rgba(255,255,255,0.66)" }}>{children}</div>
}
