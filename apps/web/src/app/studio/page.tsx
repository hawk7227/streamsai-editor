"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import QualityGatePanel from "@/components/QualityGatePanel";

// ── Constants ──────────────────────────────────────────────────────────────────

const MOBILE_CHAT_URL =
  (process.env.NEXT_PUBLIC_MOBILE_CHAT_URL || "").replace(/\/$/, "") ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "https://streamsai-editor-mobile-chat.vercel.app");

const MIN_PANEL_WIDTH = 0;
const HANDLE_HIT      = 8; // wider hit target

// ── Studio ─────────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const [leftW,   setLeftW]   = useState(() => {
    if (typeof window === "undefined") return 300;
    return Number(localStorage.getItem("studio:leftW")   ?? 300);
  });
  const [centerW, setCenterW] = useState(() => {
    if (typeof window === "undefined") return 620;
    return Number(localStorage.getItem("studio:centerW") ?? 620);
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

  // Persist panel state on every change
  useEffect(() => { localStorage.setItem("studio:leftW",      String(leftW));      }, [leftW]);
  useEffect(() => { localStorage.setItem("studio:centerW",    String(centerW));    }, [centerW]);
  useEffect(() => { localStorage.setItem("studio:leftOpen",   String(leftOpen));   }, [leftOpen]);
  useEffect(() => { localStorage.setItem("studio:centerOpen", String(centerOpen)); }, [centerOpen]);
  useEffect(() => { localStorage.setItem("studio:rightView", rightView); }, [rightView]);

  // Browser panel state
  const [inputUrl,       setInputUrl]       = useState("");
  const [browserLoading, setBrowserLoading] = useState(true);
  const browserRef = useRef<HTMLIFrameElement>(null);

const [centerMode, setCenterMode] = useState<"browser" | "preview">(() => {
  if (typeof window === "undefined") return "browser";
  const saved = localStorage.getItem("studio:centerMode");
  return saved === "preview" ? "preview" : "browser";
});

const [previewUrl, setPreviewUrl] = useState(() => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("studio:previewUrl") ?? "";
});
  useEffect(() => { localStorage.setItem("studio:centerMode", centerMode); }, [centerMode]);
  useEffect(() => { localStorage.setItem("studio:previewUrl", previewUrl); }, [previewUrl]);

  // ── postMessage bridge ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      switch (e.data.type) {
        case "browser:url-changed": setInputUrl(e.data.url ?? "");  break;
        case "browser:connected":
           setBrowserLoading(false);
          if (browserRef.current?.contentWindow) {
          browserRef.current.contentWindow.postMessage(
      { type: "browser:navigate", url: inputUrl || "https://duckduckgo.com/" },
      "*"
    );
  }
  break;
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
  if (s.includes(".")) return "https://" + s;
  return "https://duckduckgo.com/?q=" + encodeURIComponent(s);
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

      {/* ── CENTER — Browser / Preview ───────────────────────────────────────── */}
<div style={{
  width: actualCenter, flexShrink: 0, overflow: "hidden",
  transition: isDragging ? "none" : "width 180ms cubic-bezier(.4,0,.2,1)",
  borderLeft: "1px solid rgba(255,255,255,0.06)",
  borderRight: "1px solid rgba(255,255,255,0.06)",
}}>
  <PanelShell
    title={
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <TabChip label="Browser" active={centerMode === "browser"} onClick={() => setCenterMode("browser")} />
        <TabChip label="Preview" active={centerMode === "preview"} onClick={() => setCenterMode("preview")} />
      </div>
    }
    onCollapse={() => setCenterOpen(false)}
    toolbar={
      centerMode === "browser" ? (
        <BrowserBar
          value={inputUrl}
          onChange={setInputUrl}
          onNavigate={navigate}
          onBack={() => postToBrowser({ type: "browser:back" })}
          onForward={() => postToBrowser({ type: "browser:forward" })}
          onRefresh={() => postToBrowser({ type: "browser:reload" })}
          loading={browserLoading}
        />
      ) : (
        <PreviewBar
          value={previewUrl}
          onChange={setPreviewUrl}
          onOpen={() => setPreviewUrl(normalize(previewUrl))}
          onClear={() => setPreviewUrl("")}
        />
      )
    }
  >
    {centerMode === "browser" ? (
      <iframe
        ref={browserRef}
        src="/browser-session.html"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        allow="clipboard-write; clipboard-read; fullscreen"
        title="Browser"
      />
    ) : previewUrl ? (
      <iframe
        src={previewUrl}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        allow="clipboard-write; clipboard-read; fullscreen"
        title="Preview"
      />
    ) : (
      <div style={{
        height: "100%",
        display: "grid",
        placeItems: "center",
        color: "rgba(255,255,255,0.55)",
        fontSize: 14,
        background: "#07080b"
      }}>
        No preview URL yet
      </div>
    )}
  </PanelShell>
</div>

      <ResizeHandle onPointerDown={startDrag("center-right")} active={isDragging} />

      {/* ── RIGHT — EditorPro / Quality Gate ─────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <PanelShell
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <TabChip label="EditorPro" active={rightView === "editor"} onClick={() => setRightView("editor")} />
              <TabChip label="Quality Gate" active={rightView === "quality"} onClick={() => setRightView("quality")} />
            </div>
          }
          isCollapsed={false}
        >
          {rightView === "editor" ? (
            <iframe
              src="/editor"
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
              title="EditorPro"
            />
          ) : (
            <QualityGatePanel />
          )}
        </PanelShell>
      </div>

      {/* Restore tabs — always rendered, only visible when panel is collapsed */}
      <RestoreTab label="Chat"    onClick={() => setLeftOpen(true)}   visible={!leftOpen}   position={8} />
      <RestoreTab label="Browser" onClick={() => setCenterOpen(true)} visible={!centerOpen} position={52} />
    </div>
  );
}

// ── PanelShell ─────────────────────────────────────────────────────────────────

function PanelShell({ children, title, onCollapse, toolbar }: {
  children: React.ReactNode;
  title: React.ReactNode;
  onCollapse?: () => void;
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
function PreviewBar({
  value,
  onChange,
  onOpen,
  onClear,
}: {
  value: string;
  onChange: (v: string) => void;
  onOpen: () => void;
  onClear: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onOpen(); }}
        placeholder="Enter preview URL…"
        style={{
          flex: 1,
          minWidth: 0,
          padding: "3px 8px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 6,
          color: "#e5e7eb",
          fontSize: 11,
          outline: "none",
          fontFamily: "monospace",
        }}
      />
      <NavBtn onClick={onOpen} label="Open" />
      <NavBtn onClick={onClear} label="Clear" />
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

function TabChip({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${active ? "rgba(111,236,208,0.24)" : "rgba(255,255,255,0.08)"}`,
        background: active ? "linear-gradient(180deg, rgba(88,220,197,0.18), rgba(58,171,154,0.12))" : "rgba(255,255,255,0.03)",
        color: active ? "#defcf3" : "rgba(255,255,255,0.55)",
        borderRadius: 999,
        padding: "6px 10px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
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
// Always in the DOM. Slides in from left edge when panel is collapsed.
// `position` = top offset in px so Chat and Browser tabs never overlap.

function RestoreTab({ label, onClick, visible, position }: {
  label: string; onClick: () => void; visible: boolean; position: number;
}) {
  return (
    <button
      onClick={onClick}
      title={`Restore ${label} panel`}
      style={{
        position: "fixed",
        left: 0,
        top: position,
        zIndex: 200,
        // Slide in from left when visible
        transform: visible ? "translateX(0)" : "translateX(-100%)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "transform 180ms cubic-bezier(.4,0,.2,1), opacity 180ms ease",
        // Styling
        display: "flex", alignItems: "center", gap: 6,
        height: 32, padding: "0 12px 0 10px",
        background: "#1a1a2e",
        border: "1px solid rgba(255,255,255,0.1)",
        borderLeft: "none",
        borderRadius: "0 8px 8px 0",
        color: "rgba(255,255,255,0.6)",
        fontSize: 11, fontWeight: 600,
        cursor: "pointer",
        textTransform: "uppercase", letterSpacing: "0.08em",
        boxShadow: "2px 0 12px rgba(0,0,0,0.4)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 9, opacity: 0.5 }}>▶</span>
      {label}
    </button>
  );
}
