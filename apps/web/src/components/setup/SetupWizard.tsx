"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PROJECT_CONFIG, readProjectConfig, writeProjectConfig } from "@/lib/project-config";

export function SetupWizard() {
  const [state, setState] = useState(DEFAULT_PROJECT_CONFIG);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setState(readProjectConfig());
  }, []);

  const update = (patch: Partial<typeof state>) => setState((prev) => ({ ...prev, ...patch }));
  const save = () => {
    writeProjectConfig(state);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#06070a", color: "white", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>StreamsAI Setup</h1>
        <p style={{ color: "rgba(255,255,255,0.7)" }}>One-time setup for project context and service connections. Existing chat and editor systems remain untouched.</p>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
          <Card title="Project Context">
            <Field label="Project Name" value={state.projectName} onChange={(v) => update({ projectName: v })} />
            <Field label="Repo Owner" value={state.repoOwner} onChange={(v) => update({ repoOwner: v })} />
            <Field label="Repo Name" value={state.repoName} onChange={(v) => update({ repoName: v })} />
            <Field label="Branch" value={state.branch} onChange={(v) => update({ branch: v })} />
            <Field label="Current File" value={state.currentFile} onChange={(v) => update({ currentFile: v })} />
            <Field label="Default Preview" value={state.previewTarget} onChange={(v) => update({ previewTarget: v })} />
          </Card>
          <Card title="Connections">
            <Toggle label="GitHub Connected" checked={state.githubConnected} onChange={(checked) => update({ githubConnected: checked })} />
            <Toggle label="Supabase Connected" checked={state.supabaseConnected} onChange={(checked) => update({ supabaseConnected: checked })} />
            <Toggle label="Vercel Connected" checked={state.vercelConnected} onChange={(checked) => update({ vercelConnected: checked })} />
            <Field label="Mobile Chat URL" value={state.mobileChatUrl} onChange={(v) => update({ mobileChatUrl: v })} />
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", lineHeight: 1.6 }}>
              This page stores the active project context locally so chat + preview stay focused on one project. External credentials still need one-time authorization with your actual services.
            </div>
          </Card>
        </div>
        <button onClick={save} style={{ marginTop: 18, border: "1px solid rgba(111,236,208,0.24)", background: "rgba(88,220,197,0.14)", color: "#defcf3", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontSize: 14 }}>
          Save Setup
        </button>
        {saved ? <span style={{ marginLeft: 12, color: "#9ff4df", fontSize: 12 }}>Saved</span> : null}
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 18, padding: 16 }}>
      <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.44)", marginBottom: 12 }}>{title}</div>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
      <span style={{ color: "rgba(255,255,255,0.7)" }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "white", padding: "10px 12px", outline: "none" }} />
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.78)" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}
