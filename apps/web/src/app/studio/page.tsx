"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QualityGatePanel from "@/components/QualityGatePanel";
import { ToolRail } from "@/components/tool-rail/ToolRail";
import { CompactContextBar } from "@/components/preview/CompactContextBar";
import { PreviewSurface } from "@/components/preview/PreviewSurface";
import { DEFAULT_PROJECT_CONFIG, readProjectConfig, ToolSection } from "@/lib/project-config";
import {
  PreviewState,
  DEFAULT_PREVIEW_STATE,
  isPreviewBridgeEvent,
} from "@/lib/preview-state";

const MIN_PANEL_WIDTH = 0;
const HANDLE_HIT = 8;

export default function StudioPage() {
  const [projectConfig, setProjectConfig] = useState(DEFAULT_PROJECT_CONFIG);
  const [leftW, setLeftW] = useState(() => {
    if (typeof window === "undefined") return 300;
    return Number(localStorage.getItem("studio:leftW") ?? 300);
  });
  const [centerW, setCenterW] = useState(() => {
    if (typeof window === "undefined") return 640;
    return Number(localStorage.getItem("studio:centerW") ?? 640);
  });
  const [leftOpen, setLeftOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("studio:leftOpen") !== "false";
  });
  const [centerOpen, setCenterOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("studio:centerOpen") !== "false";
  });
  const [isDragging, setIsDragging] = useState(false);
  const [rightView, setRightView] = useState<"editor" | "quality">(() => {
    if (typeof window === "undefined") return "editor";
    const saved = localStorage.getItem("studio:rightView");
    return saved === "quality" ? "quality" : "editor";
  });
  const [toolSection, setToolSection] = useState<ToolSection>("projects");
  const [previewUrl, setPreviewUrl] = useState("/preview");

  // ── Preview state (shared between chat bridge and PreviewSurface) ──────────
  const [previewState, setPreviewState] = useState<PreviewState>(DEFAULT_PREVIEW_STATE);

  useEffect(() => {
    const config = readProjectConfig();
    setProjectConfig(config);
    setPreviewUrl(config.previewTarget || "/preview");
  }, []);

  useEffect(() => { localStorage.setItem("studio:leftW", String(leftW)); }, [leftW]);
  useEffect(() => { localStorage.setItem("studio:centerW", String(centerW)); }, [centerW]);
  useEffect(() => { localStorage.setItem("studio:leftOpen", String(leftOpen)); }, [leftOpen]);
  useEffect(() => { localStorage.setItem("studio:centerOpen", String(centerOpen)); }, [centerOpen]);
  useEffect(() => { localStorage.setItem("studio:rightView", rightView); }, [rightView]);

  // ── Chat → Preview bridge ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!isPreviewBridgeEvent(e.data)) return;
      const ev = e.data;

      if (ev.type === "preview:html" || ev.type === "preview:doc") {
        setPreviewState({ mode: "html", html: ev.html, title: ev.title, updatedAt: Date.now() });
        if (!centerOpen) setCenterOpen(true); // auto-open preview panel
      } else if (ev.type === "preview:route") {
        setPreviewState({ mode: "route", route: ev.route, title: ev.title, updatedAt: Date.now() });
        setPreviewUrl(ev.route);
        if (!centerOpen) setCenterOpen(true);
      } else if (ev.type === "preview:component") {
        setPreviewState({ mode: "component", code: ev.code, title: ev.title, updatedAt: Date.now() });
        if (!centerOpen) setCenterOpen(true);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [centerOpen]);

  const dragState = useRef<{ handle: "left-right" | "center-right"; startX: number; startLeft: number; startCenter: number } | null>(null);

  const startDrag = useCallback((handle: "left-right" | "center-right") => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragState.current = { handle, startX: e.clientX, startLeft: leftW, startCenter: centerW };
    setIsDragging(true);
  }, [leftW, centerW]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragState.current) return;
      const dx = e.clientX - dragState.current.startX;
      if (dragState.current.handle === "left-right") {
        setLeftW(Math.max(MIN_PANEL_WIDTH, dragState.current.startLeft + dx));
      } else {
        setCenterW(Math.max(MIN_PANEL_WIDTH, dragState.current.startCenter + dx));
      }
    };
    const onUp = () => {
      if (!dragState.current) return;
      dragState.current = null;
      setIsDragging(false);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const mobileChatUrl = useMemo(() => {
    return (process.env.NEXT_PUBLIC_MOBILE_CHAT_URL || projectConfig.mobileChatUrl || "").replace(/\/$/, "") || (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:3001" : "https://streamsai-editor-mobile-chat.vercel.app");
  }, [projectConfig.mobileChatUrl]);

  const actualLeft = leftOpen ? leftW : 0;
  const actualCenter = centerOpen ? centerW : 0;

  return (
    <div style={{ display: "flex", height: "100dvh", width: "100%", background: "#050607", overflow: "hidden", userSelect: isDragging ? "none" : "auto", cursor: isDragging ? "col-resize" : "auto" }}>
      {isDragging ? <div style={{ position: "fixed", inset: 0, zIndex: 9999, cursor: "col-resize" }} /> : null}

      <ToolRail activeSection={toolSection} onSectionChange={setToolSection} projectName={projectConfig.projectName} currentFile={projectConfig.currentFile} />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <CompactContextBar
          project={projectConfig.projectName}
          branch={projectConfig.branch}
          file={projectConfig.currentFile}
          previewTarget={previewState.mode !== "idle" ? (previewState.title ?? previewState.mode) : previewUrl}
          deviceMode="Desktop"
          onOpenSetup={() => { if (typeof window !== "undefined") window.location.href = "/setup"; }}
        />

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <div style={{ width: actualLeft, flexShrink: 0, overflow: "hidden", transition: isDragging ? "none" : "width 180ms cubic-bezier(.4,0,.2,1)" }}>
            <PanelShell title="Chat" onCollapse={() => setLeftOpen(false)}>
              <iframe src={mobileChatUrl} style={{ width: "100%", height: "100%", border: "none", display: "block" }} allow="clipboard-write; clipboard-read" title="StreamsAI Chat" />
            </PanelShell>
          </div>

          <ResizeHandle onPointerDown={startDrag("left-right")} active={isDragging} />

          <div style={{ width: actualCenter, flexShrink: 0, overflow: "hidden", transition: isDragging ? "none" : "width 180ms cubic-bezier(.4,0,.2,1)", borderLeft: "1px solid rgba(255,255,255,0.06)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <PanelShell title="Preview" onCollapse={() => setCenterOpen(false)}>
              <PreviewSurface
                previewUrl={previewUrl}
                onPreviewUrlChange={setPreviewUrl}
                previewState={previewState}
                onPreviewStateChange={setPreviewState}
              />
            </PanelShell>
          </div>

          <ResizeHandle onPointerDown={startDrag("center-right")} active={isDragging} />

          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <PanelShell
              title={<div style={{ display: "flex", alignItems: "center", gap: 8 }}><TabChip label="EditorPro" active={rightView === "editor"} onClick={() => setRightView("editor")} /><TabChip label="Quality Gate" active={rightView === "quality"} onClick={() => setRightView("quality")} /></div>}
            >
              {rightView === "editor" ? (
                <iframe src="/editor" style={{ width: "100%", height: "100%", border: "none", display: "block" }} title="EditorPro" />
              ) : (
                <QualityGatePanel />
              )}
            </PanelShell>
          </div>
        </div>
      </div>

      <RestoreTab label="Chat" onClick={() => setLeftOpen(true)} visible={!leftOpen} position={36} />
      <RestoreTab label="Preview" onClick={() => setCenterOpen(true)} visible={!centerOpen} position={80} />
    </div>
  );
}

function PanelShell({ children, title, onCollapse }: { children: React.ReactNode; title: React.ReactNode; onCollapse?: () => void; }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 10px", background: "#0d0d14", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.44)", textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>{title}</div>
        {onCollapse ? <button onClick={onCollapse} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", padding: 4, borderRadius: 4, flexShrink: 0 }}>✕</button> : null}
      </div>
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>{children}</div>
    </div>
  );
}

function TabChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void; }) {
  return (
    <button onClick={onClick} style={{ border: `1px solid ${active ? "rgba(111,236,208,0.24)" : "rgba(255,255,255,0.08)"}`, background: active ? "linear-gradient(180deg, rgba(88,220,197,0.18), rgba(58,171,154,0.12))" : "rgba(255,255,255,0.03)", color: active ? "#defcf3" : "rgba(255,255,255,0.55)", borderRadius: 999, padding: "6px 10px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>{label}</button>
  );
}

function ResizeHandle({ onPointerDown, active }: { onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void; active: boolean; }) {
  const [hover, setHover] = useState(false);
  const lit = hover || active;
  return (
    <div onPointerDown={onPointerDown} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ width: HANDLE_HIT, flexShrink: 0, cursor: "col-resize", zIndex: 100, position: "relative", touchAction: "none", background: lit ? "rgba(124,106,247,0.15)" : "transparent", transition: "background 120ms ease" }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", transform: "translateX(-50%)", width: 2, background: lit ? "rgba(124,106,247,0.6)" : "rgba(255,255,255,0.06)", borderRadius: 2, transition: "background 120ms ease" }} />
    </div>
  );
}

function RestoreTab({ label, onClick, visible, position }: { label: string; onClick: () => void; visible: boolean; position: number; }) {
  return (
    <button onClick={onClick} title={`Restore ${label} panel`} style={{ position: "fixed", left: 52, top: position, zIndex: 200, transform: visible ? "translateX(0)" : "translateX(-120%)", opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none", transition: "transform 180ms cubic-bezier(.4,0,.2,1), opacity 180ms ease", display: "flex", alignItems: "center", gap: 6, height: 28, padding: "0 12px 0 10px", background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderLeft: "none", borderRadius: "0 8px 8px 0", color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em", boxShadow: "2px 0 12px rgba(0,0,0,0.4)", whiteSpace: "nowrap" }}><span style={{ fontSize: 9, opacity: 0.5 }}>▶</span>{label}</button>
  );
}
