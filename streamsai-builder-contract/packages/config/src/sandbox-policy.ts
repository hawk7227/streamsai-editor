import { getEnv } from "./env";
export type SandboxNetworkPolicy={mode:"restricted"|"deny_all"|"allowlist";allowlist:string[]};
export function loadSandboxNetworkPolicy():SandboxNetworkPolicy{const mode=(process.env.SANDBOX_NETWORK_MODE as SandboxNetworkPolicy["mode"])||"restricted";const allowlist=getEnv("SANDBOX_NETWORK_ALLOWLIST","").split(",").map(v=>v.trim()).filter(Boolean);return {mode,allowlist};}
