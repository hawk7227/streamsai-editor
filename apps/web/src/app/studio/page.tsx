"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ── Constants ──────────────────────────────────────────────────────────────────

const MOBILE_CHAT_URL =
  process.env.NEXT_PUBLIC_MOBILE_CHAT_URL ?? "http://localhost:3001";

const MIN_PANEL_WIDTH = 0;
const DEFAULT_WIDTHS = { left: 320, center: 0, right: 0 }; // right/center fill remaining

const HANDLE_HIT = 6; // px hit area for resize handle

// ── Types ──────────────────────────────────────────────────────────────────────

interface PanelWidths {
  left: number;   // px
  center: number; // px
  right: number;  // flex fill (auto)
}

// ── Studio ─────────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftW, setLeftW] = useState(300);
  const [centerW, setCenterW] = useState(580);

  // Collapsed state
  const [leftOpen, setLeftOpen] = useState(true);
  const [centerOpen, setCenterOpen] = useState(true);
  // right is always open, takes remainder

  // Browser panel state
  const [browserUrl, setBrowserUrl] = useState("https://claude.ai");
  const [inputUrl, setInputUrl] = useState("https://claude.ai");
  const [proxyLoading, setProxyLoading] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Resize drag ──────────────────────────────────────────────────────────────

  const dragging = useRef<{ handle: "left-right" | "center-right"; startX: number; startLeft: number; startCenter: number } | null>(null);

  const onMouseDown = useCallback((handle: "left-right" | "center-right") => (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = { handle, startX: e.clientX, startLeft: leftW, startCenter: centerW };
  }, [leftW, centerW]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragging.current.startX;
      if (dragging.current.handle === "left-right") {
        setLeftW(Math.max(MIN_PANEL_WIDTH, dragging.current.startLeft + dx));
      } else {
        setCenterW(Math.max(MIN_PANEL_WIDTH, dragging.current.startCenter + dx));
      }
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // ── Browser navigation ────────────────────────────────────────────────────────

  const navigate = useCallback((url: string) => {
    let target = url.trim();
    if (!target.startsWith("http")) target = "https://" + target;
    setProxyLoading(true);
    setBrowserUrl(target);
    setInputUrl(target);
  }, []);

  const proxyUrl = `/api/proxy?url=${encodeURIComponent(browserUrl)}`;

  // ── Render ────────────────────────────────────────────────────────────────────

  const actualLeft = leftOpen ? leftW : 0;
  const actualCenter = centerOpen ? centerW : 0;

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        height: "100dvh",
        width: "100%",
        background: "#050607",
        overflow: "hidden",
        userSelect: dragging.current ? "none" : "auto",
      }}
    >
      {/* ── LEFT PANEL — Mobile Chat ─────────────────────────────────────────── */}
      <div style={{ width: actualLeft, flexShrink: 0, overflow: "hidden", transition: dragging.current ? "none" : "width 180ms cubic-bezier(.4,0,.2,1)", position: "relative" }}>
        <PanelShell
          title="Chat"
          onCollapse={() => setLeftOpen(false)}
          isCollapsed={false}
        >
          <iframe
            src={MOBILE_CHAT_URL}
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            allow="clipboard-write; clipboard-read"
            title="StreamsAI Mobile Chat"
          />
        </PanelShell>
      </div>

      {/* Resize handle: left | center */}
      <ResizeHandle onMouseDown={onMouseDown("left-right")} />

      {/* ── CENTER PANEL — Browser ───────────────────────────────────────────── */}
      <div style={{ width: actualCenter, flexShrink: 0, overflow: "hidden", transition: dragging.current ? "none" : "width 180ms cubic-bezier(.4,0,.2,1)", borderLeft: "1px solid rgba(255,255,255,0.06)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <PanelShell
          title="Browser"
          onCollapse={() => setCenterOpen(false)}
          isCollapsed={false}
          toolbar={
            <BrowserBar
              value={inputUrl}
              onChange={setInputUrl}
              onNavigate={navigate}
              onBack={() => iframeRef.current?.contentWindow?.history.back()}
              onForward={() => iframeRef.current?.contentWindow?.history.forward()}
              onRefresh={() => { setProxyLoading(true); setBrowserUrl(b => b + ""); }}
            />
          }
        >
          {proxyLoading && <LoadingBar onHide={() => setProxyLoading(false)} />}
          <iframe
            ref={iframeRef}
            key={browserUrl}
            src={proxyUrl}
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            onLoad={() => setProxyLoading(false)}
            title="Browser"
          />
        </PanelShell>
      </div>

      {/* Resize handle: center | right */}
      <ResizeHandle onMouseDown={onMouseDown("center-right")} />

      {/* ── RIGHT PANEL — EditorPro ──────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <PanelShell title="EditorPro" isCollapsed={false}>
          <EditorProEmbed />
        </PanelShell>
      </div>

      {/* Collapsed panel restore buttons */}
      {!leftOpen && (
        <RestoreTab label="Chat" onClick={() => setLeftOpen(true)} side="left" />
      )}
      {!centerOpen && (
        <RestoreTab label="Browser" onClick={() => setCenterOpen(true)} side="center" />
      )}
    </div>
  );
}

// ── Panel shell ────────────────────────────────────────────────────────────────

function PanelShell({
  children,
  title,
  onCollapse,
  isCollapsed: _isCollapsed,
  toolbar,
}: {
  children: React.ReactNode;
  title: string;
  onCollapse?: () => void;
  isCollapsed: boolean;
  toolbar?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      {/* Panel header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        height: 36, padding: "0 12px",
        background: "#0d0d14", borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>
          {title}
        </span>
        {toolbar && <div style={{ flex: 1, minWidth: 0 }}>{toolbar}</div>}
        {onCollapse && (
          <button
            onClick={onCollapse}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", padding: 4, borderRadius: 4, flexShrink: 0 }}
            title="Collapse panel"
          >
            ✕
          </button>
        )}
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {children}
      </div>
    </div>
  );
}

// ── Browser address bar ────────────────────────────────────────────────────────

function BrowserBar({ value, onChange, onNavigate, onBack, onForward, onRefresh }: {
  value: string; onChange: (v: string) => void;
  onNavigate: (url: string) => void;
  onBack: () => void; onForward: () => void; onRefresh: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
      <NavBtn onClick={onBack} label="←" />
      <NavBtn onClick={onForward} label="→" />
      <NavBtn onClick={onRefresh} label="↻" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onNavigate(value); }}
        style={{
          flex: 1, minWidth: 0, padding: "3px 8px",
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 6, color: "#e5e7eb", fontSize: 11, outline: "none",
          fontFamily: "monospace",
        }}
      />
      <NavBtn onClick={() => onNavigate(value)} label="Go" />
    </div>
  );
}

function NavBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 12, padding: "2px 4px", borderRadius: 3 }}
    >
      {label}
    </button>
  );
}

// ── Resize handle ──────────────────────────────────────────────────────────────

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: HANDLE_HIT, flexShrink: 0, cursor: "col-resize", zIndex: 10,
        background: hover ? "rgba(124,106,247,0.4)" : "transparent",
        transition: "background 150ms ease",
        position: "relative",
      }}
    >
      <div style={{
        position: "absolute", inset: "0 2px",
        background: hover ? "rgba(124,106,247,0.5)" : "rgba(255,255,255,0.04)",
        borderRadius: 2,
        transition: "background 150ms ease",
      }} />
    </div>
  );
}

// ── Loading bar ────────────────────────────────────────────────────────────────

function LoadingBar({ onHide }: { onHide: () => void }) {
  useEffect(() => {
    const t = setTimeout(onHide, 4000);
    return () => clearTimeout(t);
  }, [onHide]);
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, zIndex: 5, overflow: "hidden" }}>
      <div style={{
        height: "100%", background: "#7c6af7",
        animation: "loadBar 2s ease-out forwards",
      }} />
      <style>{`@keyframes loadBar { from { width: 0%; } to { width: 100%; } }`}</style>
    </div>
  );
}

// ── Restore tab ────────────────────────────────────────────────────────────────

function RestoreTab({ label, onClick, side }: { label: string; onClick: () => void; side: "left" | "center" }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "fixed",
        [side === "left" ? "left" : "left"]: side === "left" ? 0 : 40,
        top: "50%", transform: "translateY(-50%) rotate(-90deg)",
        transformOrigin: "center",
        background: "#16161f", border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 600,
        padding: "4px 10px", borderRadius: "0 0 6px 6px",
        cursor: "pointer", zIndex: 20,
        textTransform: "uppercase", letterSpacing: "0.08em",
      }}
    >
      {label}
    </button>
  );
}

// ── EditorPro embed (imports the existing page component) ─────────────────────

// The EditorPro lives at /editor in apps/web. We embed it via iframe to keep
// full isolation and avoid prop/state collisions with the studio shell.
function EditorProEmbed() {
  return (
    <iframe
      src="/editor"
      style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      title="EditorPro"
    />
  );
}
