"use client";

import { useMemo, useState } from "react";
import type { PreviewState } from "@/lib/preview-state";
import { DEFAULT_PREVIEW_STATE } from "@/lib/preview-state";

interface PreviewSurfaceProps {
  previewUrl: string;
  onPreviewUrlChange: (url: string) => void;
  previewState?: PreviewState;
  onPreviewStateChange?: (state: PreviewState) => void;
}

type DeviceMode = "Desktop" | "iPhone 14 Pro Max" | "Safari" | "Chrome" | "Safe Zone";
type InnerMode = "preview" | "diff" | "document";

export function PreviewSurface({
  previewUrl,
  onPreviewUrlChange,
  previewState = DEFAULT_PREVIEW_STATE,
  onPreviewStateChange,
}: PreviewSurfaceProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("Desktop");
  const [innerMode, setInnerMode] = useState<InnerMode>("preview");
  const [localUrl, setLocalUrl] = useState(previewUrl || "/preview");

  const frameStyle = useMemo(() => {
    if (deviceMode !== "Desktop") {
      return { width: 430, height: 932, borderRadius: 28 };
    }
    return { width: "100%", height: "100%", borderRadius: 0 };
  }, [deviceMode]);

  // ── Determine what to render ──────────────────────────────────────────────
  const hasLiveContent =
    (previewState.mode === "html" && !!previewState.html) ||
    (previewState.mode === "route" && !!previewState.route) ||
    (previewState.mode === "component" && !!previewState.code);

  const clearPreview = () => {
    onPreviewStateChange?.(DEFAULT_PREVIEW_STATE);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#07080b" }}>

      {/* ── Toolbar ── */}
      <div style={{
        height: 32, display: "flex", alignItems: "center", gap: 6,
        padding: "0 8px", borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "#0d0f14", flexShrink: 0,
      }}>
        <TinyChip label="Preview" active={innerMode === "preview"} onClick={() => setInnerMode("preview")} />
        <TinyChip label="Diff" active={innerMode === "diff"} onClick={() => setInnerMode("diff")} />
        <TinyChip label="Doc" active={innerMode === "document"} onClick={() => setInnerMode("document")} />
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />
        {(["Desktop", "iPhone 14 Pro Max", "Safari", "Chrome", "Safe Zone"] as DeviceMode[]).map(mode => (
          <TinyChip key={mode} label={mode} active={deviceMode === mode} onClick={() => setDeviceMode(mode)} />
        ))}

        {/* Live content badge */}
        {hasLiveContent && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "rgba(88,220,197,0.12)", border: "1px solid rgba(111,236,208,0.24)",
            borderRadius: 999, padding: "2px 8px", fontSize: 9, color: "#9ff4df",
            fontWeight: 700, letterSpacing: "0.06em",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#2dd4a0", display: "inline-block" }} />
            {previewState.mode.toUpperCase()}
          </div>
        )}

        {hasLiveContent && (
          <button onClick={clearPreview} title="Clear preview" style={{
            background: "none", border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.44)", borderRadius: 6,
            padding: "2px 6px", fontSize: 10, cursor: "pointer",
          }}>✕ Clear</button>
        )}

        <input
          value={localUrl}
          onChange={(e) => setLocalUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onPreviewUrlChange(localUrl || "/preview"); }}
          style={{
            marginLeft: "auto", minWidth: 140, width: 220, maxWidth: "35%",
            padding: "4px 8px", borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.82)",
            fontSize: 11, outline: "none",
          }}
        />
        <button
          onClick={() => { onPreviewUrlChange(localUrl || "/preview"); clearPreview(); }}
          style={{
            border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.82)", borderRadius: 8,
            padding: "4px 8px", fontSize: 11, cursor: "pointer",
          }}
        >Open</button>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {innerMode === "preview" ? (
          <div style={{ flex: 1, display: "grid", placeItems: "center", padding: deviceMode === "Desktop" ? 0 : 16, overflow: "auto" }}>
            <div style={{
              ...frameStyle,
              border: deviceMode === "Desktop" ? "none" : "1px solid rgba(255,255,255,0.12)",
              boxShadow: deviceMode === "Desktop" ? "none" : "0 24px 80px rgba(0,0,0,0.35)",
              overflow: "hidden", position: "relative", background: "#111",
            }}>
              {deviceMode === "Safe Zone" && (
                <div style={{ position: "absolute", inset: 20, border: "1px dashed rgba(111,236,208,0.55)", zIndex: 2, pointerEvents: "none", borderRadius: 16 }} />
              )}

              {/* ── HTML mode — srcDoc ── */}
              {previewState.mode === "html" && previewState.html ? (
                <iframe
                  key={previewState.updatedAt}
                  title={previewState.title || "HTML Preview"}
                  sandbox="allow-scripts allow-same-origin allow-forms"
                  srcDoc={previewState.html}
                  style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                />
              ) : previewState.mode === "route" && previewState.route ? (
                /* ── Route mode — src ── */
                <iframe
                  key={previewState.route}
                  title={previewState.title || "Route Preview"}
                  src={previewState.route}
                  style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                />
              ) : (
                /* ── Default — previewUrl ── */
                <iframe
                  src={previewUrl || "/preview"}
                  title="Preview"
                  style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                />
              )}
            </div>
          </div>
        ) : innerMode === "diff" ? (
          <SplitSurface
            left={<iframe src={previewUrl || "/preview"} title="Preview" style={{ width: "100%", height: "100%", border: "none" }} />}
            right={<PlaceholderCard title="Staged Diff Review" body="Diff review lives inside the current preview panel." />}
          />
        ) : (
          <SplitSurface
            left={<iframe src={previewUrl || "/preview/html"} title="Document" style={{ width: "100%", height: "100%", border: "none" }} />}
            right={<PlaceholderCard title="Document / Artifact Viewer" body="Documents and exported artifacts are surfaced here." />}
          />
        )}
      </div>
    </div>
  );
}

function TinyChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      border: `1px solid ${active ? "rgba(111,236,208,0.24)" : "rgba(255,255,255,0.08)"}`,
      background: active ? "rgba(88,220,197,0.14)" : "rgba(255,255,255,0.03)",
      color: active ? "#defcf3" : "rgba(255,255,255,0.72)",
      borderRadius: 999, padding: "4px 8px", fontSize: 10, cursor: "pointer",
    }}>{label}</button>
  );
}

function SplitSurface({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "rgba(255,255,255,0.08)" }}>
      <div style={{ background: "#07080b", overflow: "hidden" }}>{left}</div>
      <div style={{ background: "#07080b", overflow: "auto" }}>{right}</div>
    </div>
  );
}

function PlaceholderCard({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: 18, color: "rgba(255,255,255,0.78)" }}>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.44)", marginBottom: 8 }}>{title}</div>
      <div style={{ lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}
