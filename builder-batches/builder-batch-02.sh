#!/usr/bin/env bash
set -euo pipefail

# Run from repository root


mkdir -p "$(dirname 'apps/mobile-chat/index.html')"
cat > 'apps/mobile-chat/index.html' <<'EOF'
<!doctype html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>StreamsAI Mobile Chat</title><script type="module" src="/src/main.tsx"></script></head><body><div id="root"></div></body></html>
EOF

mkdir -p "$(dirname 'apps/mobile-chat/package.json')"
cat > 'apps/mobile-chat/package.json' <<'EOF'
{"name":"mobile-chat","version":"0.1.0","private":true,"type":"module","scripts":{"dev":"vite --port 3001","build":"tsc -b && vite build","typecheck":"tsc -p tsconfig.json --noEmit"},"dependencies":{"react":"^18.3.1","react-dom":"^18.3.1","zustand":"^5.0.1"},"devDependencies":{"@types/react":"^18.3.12","@types/react-dom":"^18.3.1","@vitejs/plugin-react":"^4.3.3","vite":"^5.4.11"}}
EOF

mkdir -p "$(dirname 'apps/mobile-chat/src/App.tsx')"
cat > 'apps/mobile-chat/src/App.tsx' <<'EOF'
import { useState } from "react"; export default function App(){ const [value,setValue]=useState(""); return <div style={{padding:16,color:"white",background:"#0b0f19",minHeight:"100vh"}}><h1>Builder Chat</h1><textarea value={value} onChange={(e)=>setValue(e.target.value)} style={{width:"100%",minHeight:120}} /><button>Send</button><iframe title="preview" src={(import.meta as any).env.VITE_PREVIEW_BASE_URL?`${(import.meta as any).env.VITE_PREVIEW_BASE_URL}/status/local`:"http://localhost:4012/status/local"} style={{width:"100%",height:400,border:0,marginTop:16,background:"white"}} /></div>; }

EOF

mkdir -p "$(dirname 'apps/mobile-chat/src/main.tsx')"
cat > 'apps/mobile-chat/src/main.tsx' <<'EOF'
import React from "react"; import ReactDOM from "react-dom/client"; import App from "./App"; import "./styles/app.css"; import "./styles/mobile.css"; ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);

EOF

mkdir -p "$(dirname 'apps/mobile-chat/src/styles/app.css')"
cat > 'apps/mobile-chat/src/styles/app.css' <<'EOF'
:root{color-scheme:dark;font-family:Inter,system-ui,sans-serif} body{margin:0;background:#0b0f19;color:#eef2ff}

EOF

mkdir -p "$(dirname 'apps/mobile-chat/src/styles/mobile.css')"
cat > 'apps/mobile-chat/src/styles/mobile.css' <<'EOF'
@media (max-width:899px){ textarea{font-size:16px;} }

EOF

mkdir -p "$(dirname 'apps/mobile-chat/tsconfig.json')"
cat > 'apps/mobile-chat/tsconfig.json' <<'EOF'
{ "extends":"../../tsconfig.base.json","compilerOptions":{"types":["vite/client"]},"include":["src/**/*","vite.config.ts"] }
EOF

mkdir -p "$(dirname 'apps/mobile-chat/tsconfig.node.json')"
cat > 'apps/mobile-chat/tsconfig.node.json' <<'EOF'
{ "extends":"../../tsconfig.base.json","include":["vite.config.ts"] }
EOF

mkdir -p "$(dirname 'apps/mobile-chat/vite.config.ts')"
cat > 'apps/mobile-chat/vite.config.ts' <<'EOF'
import { defineConfig } from "vite"; import react from "@vitejs/plugin-react"; export default defineConfig({plugins:[react()],server:{port:3001,strictPort:true}});

EOF
