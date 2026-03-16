"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PROJECT, loadActiveProject, saveActiveProject, type ActiveProject } from "@/lib/project-config";

export function SetupWizard() {
  const [state, setState] = useState<ActiveProject>(DEFAULT_PROJECT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setState(loadActiveProject());
  }, []);

  const update = (patch: Partial<ActiveProject>) => setState((prev) => ({ ...prev, ...patch }));

  const save = () => {
    saveActiveProject(state);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#06070a", color: "white", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>StreamsAI Setup</h1>
        <p style={{ color: "rgba(255,255,255,0.7)" }}>
          Configure the active project context. This controls what the AI agent works on across chat, preview, and file operations.
        </p>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
          <Card title="Project Context">
            <Field label="Project Name" value={state.name} onChange={(v) => update({ name: v })} />
            <Field label="Repo Owner" value={state.owner} onChange={(v) => update({ owner: v })} />
            <Field label="Repo Name" value={state.repo} onChange={(v) => update({ repo: v })} />
            <Field label="Branch" value={state.branch} onChange={(v) => update({ branch: v })} />
            <Field label="Current File" value={state.currentFile} onChange={(v) => update({ currentFile: v })} />
            <Field label="Preview Target" value={state.previewTarget} onChange={(v) => update({ previewTarget: v })} />
          </Card>
          <Card title="Connections">
            <ConnectionStatus label="GitHub App" connected={true} note="Connected via GitHub App (App ID 3107963)" />
            <ConnectionStatus label="Supabase" connected={false} note="Not yet configured" />
            <ConnectionStatus label="Vercel" connected={false} note="Not yet configured" />
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginTop: 8 }}>
              GitHub credentials are managed via server env vars. Supabase and Vercel connections coming soon.
            </div>
          </Card>
        </div>
        <button
          onClick={save}
          style={{ marginTop: 18, border: "1px solid rgba(111,236,208,0.24)", background: "rgba(88,220,197,0.14)", color: "#defcf3", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 14 }}
        >
          Save Project Config
        </button>
        {saved && <span style={{ marginLeft: 12, color: "#9ff4df", fontSize: 12 }}>✓ Saved</span>}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 18, padding: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.44)", marginBottom: 12 }}>{title}</div>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
      <span style={{ color: "rgba(255,255,255,0.6)" }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "white", padding: "9px 12px", outline: "none", fontSize: 13 }}
      />
    </label>
  );
}

function ConnectionStatus({ label, connected, note }: { label: string; connected: boolean; note: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: 14, marginTop: 1 }}>{connected ? "🟢" : "⚪"}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: connected ? "#6eecd8" : "rgba(255,255,255,0.5)" }}>{label}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{note}</div>
      </div>
    </div>
  );
}
