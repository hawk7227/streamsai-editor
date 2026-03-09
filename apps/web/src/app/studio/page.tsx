"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ── Constants ──────────────────────────────────────────────────────────────────

const MOBILE_CHAT_URL =
  process.env.NEXT_PUBLIC_MOBILE_CHAT_URL ?? "http://localhost:3001";

const MIN_PANEL_WIDTH = 0;
const HANDLE_HIT      = 8; // wider hit target

// ── Studio ─────────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const [leftW,   setLeftW]   = useState(300);
  const [centerW, setCenterW] = useState(620);
  const [leftOpen,   setLeftOpen]   = useState(true);
  const [centerOpen, setCenterOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Browser panel state
  const [inputUrl,       setInputUrl]       = useState("");
  const [browserLoading, setBrowserLoading] = useState(true);
  const browserRef = useRef<HTMLIFrameElement>(null);

  // ── postMessage bridge ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      switch (e.data.type) {
        case "browser:url-changed": setInputUrl(e.data.url ?? "");  break;
        case "browser:connected":   setBrowserLoading(false);        break;
        case "browser:loading":     setBrowserLoading(true);         break;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const postToBrowser = useCallback((msg: object) => {
    browserRef.current?.contentWindow?.postMessage(msg, "*");
  }, []);

  const normalize = (url: string): string => {
    const s = url.trim();
    if (!s) return "";
    if (/^(https?:|about:)/.test(s)) return s;
    if (/^(localhost|127\.|192\.168\.)/.test(s)) return "http://" + s;
    return "https://" + s;
  };

  const navigate = useCallback((url: string) => {
    const target = normalize(url);
    if (!target) return;
    setInputUrl(target);
    postToBrowser({ type: "browser:navigate", url: target });
  }, [postToBrowser]);

  // ── Resize — global window listeners, never loses tracking ───────────────────
  // Root cause of buggy drag: events on a parent div get swallowed by iframes
  // underneath as the pointer moves. Fix: attach move/up to window directly
  // so events always fire regardless of what's under the pointer.
  // The drag overlay (pointer-events:none on iframes during drag) is the backup.

  const dragState = useRef<{
    handle: "left-right" | "center-right";
    startX: number;
    startLeft: number;
    startCenter: number;
  } | null>(null);

  const startDrag = useCallback(
    (handle: "left-right" | "center-right") =>
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragState.current = {
        handle,
        startX:      e.clientX,
        startLeft:   leftW,
        startCenter: centerW,
      };
      setIsDragging(true);
    },
    [leftW, centerW]
  );

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
    window.addEventListener("pointerup",   onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup",   onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []); // mount once — dragState is a ref, no stale closure issue

  const actualLeft   = leftOpen   ? leftW   : 0;
  const actualCenter = centerOpen ? centerW : 0;

  return (
    <div style={{
      display: "flex", height: "100dvh", width: "100%",
      background: "#050607", overflow: "hidden",
      userSelect: isDragging ? "none" : "auto",
      cursor:     isDragging ? "col-resize" : "auto",
    }}>

      {/*
        Drag overlay — sits over all iframes during drag so pointer events
        can't be swallowed by iframe documents. Invisible, covers everything.
      */}
      {isDragging && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          cursor: "col-resize",
        }} />
      )}

      {/* ── LEFT — Chat ──────────────────────────────────────────────────────── */}
      <div style={{
        width: actualLeft, flexShrink: 0, overflow: "hidden",
        transition: isDragging ? "none" : "width 180ms cubic-bezier(.4,0,.2,1)",
      }}>
        <PanelShell title="Chat" onCollapse={() => setLeftOpen(false)} isCollapsed={false}>
          <iframe
            src={MOBILE_CHAT_URL}
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            allow="clipboard-write; clipboard-read"
            title="StreamsAI Chat"
          />
        </PanelShell>
      </div>

      <ResizeHandle onPointerDown={startDrag("left-right")} active={isDragging} />

      {/* ── CENTER — Browser ─────────────────────────────────────────────────── */}
      <div style={{
        width: actualCenter, flexShrink: 0, overflow: "hidden",
        transition: isDragging ? "none" : "width 180ms cubic-bezier(.4,0,.2,1)",
        borderLeft:  "1px solid rgba(255,255,255,0.06)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}>
        <PanelShell
          title="Browser"
          onCollapse={() => setCenterOpen(false)}
          isCollapsed={false}
          toolbar={
            <BrowserBar
              value={inputUrl}
              onChange={setInputUrl}
              onNavigate={navigate}
              onBack={    () => postToBrowser({ type: "browser:back"    })}
              onForward={ () => postToBrowser({ type: "browser:forward" })}
              onRefresh={ () => postToBrowser({ type: "browser:reload"  })}
              loading={browserLoading}
            />
          }
        >
          <iframe
            ref={browserRef}
            src="/browser-session.html"
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            allow="clipboard-write; clipboard-read; fullscreen"
            title="Browser"
          />
        </PanelShell>
      </div>

      <ResizeHandle onPointerDown={startDrag("center-right")} active={isDragging} />

      {/* ── RIGHT — EditorPro ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <PanelShell title="EditorPro" isCollapsed={false}>
          <iframe
            src="/editor"
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            title="EditorPro"
          />
        </PanelShell>
      </div>

      {!leftOpen && (
        <RestoreTab label="Chat" onClick={() => setLeftOpen(true)} side="left" />
      )}
      {!centerOpen && (
        <RestoreTab label="Browser" onClick={() => setCenterOpen(true)} side="center" />
      )}
    </div>
  );
}

// ── PanelShell ─────────────────────────────────────────────────────────────────

function PanelShell({ children, title, onCollapse, isCollapsed: _ic, toolbar }: {
  children: React.ReactNode; title: string;
  onCollapse?: () => void; isCollapsed: boolean;
  toolbar?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        height: 36, padding: "0 12px",
        background: "#0d0d14",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)",
          textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0,
        }}>
          {title}
        </span>
        {toolbar && <div style={{ flex: 1, minWidth: 0 }}>{toolbar}</div>}
        {onCollapse && (
          <button onClick={onCollapse} style={{
            marginLeft: "auto", background: "none", border: "none",
            color: "rgba(255,255,255,0.25)", cursor: "pointer",
            fontSize: 14, display: "flex", alignItems: "center",
            padding: 4, borderRadius: 4, flexShrink: 0,
          }}>✕</button>
        )}
      </div>
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {children}
      </div>
    </div>
  );
}

// ── BrowserBar ─────────────────────────────────────────────────────────────────

function BrowserBar({ value, onChange, onNavigate, onBack, onForward, onRefresh, loading }: {
  value: string; onChange: (v: string) => void;
  onNavigate: (url: string) => void;
  onBack: () => void; onForward: () => void; onRefresh: () => void;
  loading: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
      <NavBtn onClick={onBack}    label="←" />
      <NavBtn onClick={onForward} label="→" />
      <NavBtn onClick={onRefresh} label={loading ? "◌" : "↻"} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onNavigate(value); }}
        placeholder="Enter any URL…"
        style={{
          flex: 1, minWidth: 0, padding: "3px 8px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 6, color: "#e5e7eb", fontSize: 11,
          outline: "none", fontFamily: "monospace",
        }}
      />
      <NavBtn onClick={() => onNavigate(value)} label="Go" />
    </div>
  );
}

function NavBtn({ onClick, label, disabled = false }: {
  onClick: () => void; label: string; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: "none", border: "none",
      color: disabled ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.4)",
      cursor: disabled ? "not-allowed" : "pointer",
      fontSize: 12, padding: "2px 4px", borderRadius: 3,
    }}>{label}</button>
  );
}

// ── ResizeHandle ───────────────────────────────────────────────────────────────

function ResizeHandle({ onPointerDown, active }: {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  active: boolean;
}) {
  const [hover, setHover] = useState(false);
  const lit = hover || active;
  return (
    <div
      onPointerDown={onPointerDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: HANDLE_HIT, flexShrink: 0,
        cursor: "col-resize", zIndex: 100,
        position: "relative", touchAction: "none",
        background: lit ? "rgba(124,106,247,0.15)" : "transparent",
        transition: "background 120ms ease",
      }}
    >
      {/* Visual line */}
      <div style={{
        position: "absolute", top: 0, bottom: 0,
        left: "50%", transform: "translateX(-50%)",
        width: 2,
        background: lit ? "rgba(124,106,247,0.6)" : "rgba(255,255,255,0.06)",
        borderRadius: 2,
        transition: "background 120ms ease",
      }} />
    </div>
  );
}

// ── RestoreTab ─────────────────────────────────────────────────────────────────

function RestoreTab({ label, onClick, side }: {
  label: string; onClick: () => void; side: "left" | "center";
}) {
  return (
    <button onClick={onClick} style={{
      position: "fixed",
      left: side === "left" ? 0 : 40,
      top: "50%",
      transform: "translateY(-50%) rotate(-90deg)",
      transformOrigin: "center",
      background: "#16161f",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "rgba(255,255,255,0.5)",
      fontSize: 10, fontWeight: 600,
      padding: "4px 10px", borderRadius: "0 0 6px 6px",
      cursor: "pointer", zIndex: 20,
      textTransform: "uppercase", letterSpacing: "0.08em",
    }}>{label}</button>
  );
}
