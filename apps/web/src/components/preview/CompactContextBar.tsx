"use client";

interface CompactContextBarProps {
  project: string;
  branch: string;
  file: string;
  previewTarget: string;
  deviceMode: string;
  onOpenSetup: () => void;
}

export function CompactContextBar({ project, branch, file, previewTarget, deviceMode, onOpenSetup }: CompactContextBarProps) {
  return (
    <div style={{
      height: 28,
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "0 10px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      background: "#0b0d12",
      color: "rgba(255,255,255,0.72)",
      fontSize: 11,
      whiteSpace: "nowrap",
      overflow: "hidden",
    }}>
      <ContextItem label="Project" value={project} />
      <ContextItem label="Branch" value={branch} />
      <ContextItem label="File" value={file} truncate />
      <ContextItem label="Preview" value={previewTarget} truncate />
      <ContextItem label="Device" value={deviceMode} />
      <button
        onClick={onOpenSetup}
        style={{
          marginLeft: "auto",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.78)",
          borderRadius: 999,
          padding: "3px 8px",
          fontSize: 11,
          cursor: "pointer",
        }}
      >
        Setup
      </button>
    </div>
  )
}

function ContextItem({ label, value, truncate = false }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: truncate ? 0 : undefined }}>
      <span style={{ color: "rgba(255,255,255,0.44)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <span style={{ overflow: truncate ? "hidden" : undefined, textOverflow: truncate ? "ellipsis" : undefined }}>{value}</span>
    </div>
  )
}
