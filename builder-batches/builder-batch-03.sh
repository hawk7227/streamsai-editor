#!/usr/bin/env bash
set -euo pipefail

# Run from repository root


mkdir -p "$(dirname 'apps/api/package.json')"
cat > 'apps/api/package.json' <<'EOF'
{"name":"@streamsai/api","version":"0.1.0","type":"module","scripts":{"dev":"tsx watch src/index.ts","build":"tsc -p tsconfig.json","typecheck":"tsc -p tsconfig.json --noEmit"},"dependencies":{"@streamsai/builder-engine":"workspace:*","@streamsai/observability":"workspace:*","@streamsai/project-memory":"workspace:*","@streamsai/shared":"workspace:*","express":"^4.21.1","zod":"^3.23.8"}}
EOF

mkdir -p "$(dirname 'apps/api/src/bootstrap.ts')"
cat > 'apps/api/src/bootstrap.ts' <<'EOF'
import express from "express"; import { buildHealth } from "@streamsai/observability"; import { z } from "zod"; import { BuilderPipeline } from "@streamsai/builder-engine"; import { MemoryStore } from "@streamsai/project-memory"; const chatSchema=z.object({projectId:z.string().min(1),runId:z.string().min(1),workspaceRoot:z.string().min(1),message:z.string().min(1)}); export function bootstrapApi(){ const app=express(); app.use(express.json({limit:"2mb"})); app.get("/health",(_req,res)=>res.json(buildHealth("api"))); app.get("/readiness",(_req,res)=>res.json({ok:true,service:"api",ready:true})); app.post("/chat/run", async (req,res)=>{ const input=chatSchema.parse(req.body); const result=await new BuilderPipeline().run(input); res.json(result); }); app.get("/memory/:projectId",(req,res)=>res.json(new MemoryStore().list(req.params.projectId))); return app; }

EOF

mkdir -p "$(dirname 'apps/api/src/index.ts')"
cat > 'apps/api/src/index.ts' <<'EOF'
import { bootstrapApi } from "./bootstrap"; bootstrapApi().listen(Number(process.env.PORT_API||4010),()=>console.log(`api listening on ${process.env.PORT_API||4010}`));

EOF

mkdir -p "$(dirname 'apps/api/tsconfig.json')"
cat > 'apps/api/tsconfig.json' <<'EOF'
{ "extends":"../../tsconfig.base.json","compilerOptions":{"outDir":"dist"},"include":["src/**/*.ts"] }
EOF

mkdir -p "$(dirname 'apps/preview-runner/package.json')"
cat > 'apps/preview-runner/package.json' <<'EOF'
{"name":"@streamsai/preview-runner","version":"0.1.0","type":"module","scripts":{"dev":"tsx watch src/index.ts","build":"tsc -p tsconfig.json","typecheck":"tsc -p tsconfig.json --noEmit"},"dependencies":{"@streamsai/config":"workspace:*","@streamsai/observability":"workspace:*","express":"^4.21.1"}}
EOF

mkdir -p "$(dirname 'apps/preview-runner/src/index.ts')"
cat > 'apps/preview-runner/src/index.ts' <<'EOF'
import express from "express"; import { buildHealth } from "@streamsai/observability"; const app=express(); app.use(express.json()); app.get("/health",(_req,res)=>res.json(buildHealth("preview-runner"))); app.get("/status/:projectId",(req,res)=>res.json({projectId:req.params.projectId,running:false,url:"http://localhost:5173"})); app.listen(Number(process.env.PORT_PREVIEW||4012),()=>console.log(`preview on ${process.env.PORT_PREVIEW||4012}`));

EOF

mkdir -p "$(dirname 'apps/preview-runner/tsconfig.json')"
cat > 'apps/preview-runner/tsconfig.json' <<'EOF'
{ "extends":"../../tsconfig.base.json","compilerOptions":{"outDir":"dist"},"include":["src/**/*.ts"] }
EOF

mkdir -p "$(dirname 'apps/worker/package.json')"
cat > 'apps/worker/package.json' <<'EOF'
{"name":"@streamsai/worker","version":"0.1.0","type":"module","scripts":{"dev":"tsx watch src/index.ts","build":"tsc -p tsconfig.json","typecheck":"tsc -p tsconfig.json --noEmit"},"dependencies":{"@streamsai/builder-engine":"workspace:*","@streamsai/queue-core":"workspace:*","@streamsai/shared":"workspace:*","bullmq":"^5.34.0"}}
EOF

mkdir -p "$(dirname 'apps/worker/src/bootstrap.ts')"
cat > 'apps/worker/src/bootstrap.ts' <<'EOF'
import { createWorker } from "@streamsai/queue-core/src/bullmq"; import { QUEUES } from "@streamsai/shared"; import { generationProcessor } from "./processors/generation.processor"; createWorker(QUEUES.generation,generationProcessor,Number(process.env.WORKER_CONCURRENCY_GENERATION||2)); console.log("worker bootstrapped");

EOF

mkdir -p "$(dirname 'apps/worker/src/index.ts')"
cat > 'apps/worker/src/index.ts' <<'EOF'
import { bootstrapWorker } from "./bootstrap"; bootstrapWorker();

EOF

mkdir -p "$(dirname 'apps/worker/src/processors/generation.processor.ts')"
cat > 'apps/worker/src/processors/generation.processor.ts' <<'EOF'
import { BuilderPipeline } from "@streamsai/builder-engine"; export async function generationProcessor(job:any){ return new BuilderPipeline().run(job.data); }

EOF

mkdir -p "$(dirname 'apps/worker/tsconfig.json')"
cat > 'apps/worker/tsconfig.json' <<'EOF'
{ "extends":"../../tsconfig.base.json","compilerOptions":{"outDir":"dist"},"include":["src/**/*.ts"] }
EOF

mkdir -p "$(dirname 'packages/ai-gateway/package.json')"
cat > 'packages/ai-gateway/package.json' <<'EOF'
{"name":"@streamsai/ai-gateway","version":"0.1.0","type":"module","main":"src/index.ts"}
EOF

mkdir -p "$(dirname 'packages/ai-gateway/src/index.ts')"
cat > 'packages/ai-gateway/src/index.ts' <<'EOF'
import { routeModel } from "./routing/model-router";
import { countApproxTokens } from "./token-usage/token-counter";
export type GatewayPrompt={purpose:"chat"|"planning"|"generation"|"repair"|"summary";messages:{role:"system"|"user"|"assistant";content:string}[];preferredProvider?:"openai"|"anthropic";stream?:boolean};
export async function generateViaGateway(prompt:GatewayPrompt){const provider=routeModel(prompt);const tokenEstimate=countApproxTokens(prompt.messages.map(m=>m.content).join("\n"));const joined=prompt.messages.map(m=>`[${m.role}] ${m.content}`).join("\n");return {provider:provider.provider,model:provider.model,tokenEstimate,content:joined};}

EOF

mkdir -p "$(dirname 'packages/ai-gateway/src/providers/anthropic.ts')"
cat > 'packages/ai-gateway/src/providers/anthropic.ts' <<'EOF'
export const anthropicProvider={provider:"anthropic" as const};

EOF

mkdir -p "$(dirname 'packages/ai-gateway/src/providers/openai.ts')"
cat > 'packages/ai-gateway/src/providers/openai.ts' <<'EOF'
export const openaiProvider={provider:"openai" as const};

EOF

mkdir -p "$(dirname 'packages/ai-gateway/src/routing/model-router.ts')"
cat > 'packages/ai-gateway/src/routing/model-router.ts' <<'EOF'
import type { GatewayPrompt } from "../index"; export function routeModel(prompt:GatewayPrompt){ if(prompt.preferredProvider==="anthropic") return {provider:"anthropic",model:"claude-3-5-sonnet"}; if(prompt.purpose==="generation"||prompt.purpose==="repair") return {provider:"openai",model:"gpt-4.1"}; return {provider:"openai",model:"gpt-4.1-mini"}; }

EOF

mkdir -p "$(dirname 'packages/ai-gateway/src/streaming/stream-response.ts')"
cat > 'packages/ai-gateway/src/streaming/stream-response.ts' <<'EOF'
export async function *streamResponse(content:string){for(const chunk of content.match(/.{1,32}/g)??[]) yield chunk;}

EOF

mkdir -p "$(dirname 'packages/ai-gateway/src/token-usage/token-counter.ts')"
cat > 'packages/ai-gateway/src/token-usage/token-counter.ts' <<'EOF'
export function countApproxTokens(input:string):number{return Math.ceil(input.length/4);}

EOF

mkdir -p "$(dirname 'packages/builder-engine/package.json')"
cat > 'packages/builder-engine/package.json' <<'EOF'
{"name":"@streamsai/builder-engine","version":"0.1.0","type":"module","main":"src/index.ts"}
EOF

mkdir -p "$(dirname 'packages/builder-engine/src/context/ContextSelector.ts')"
cat > 'packages/builder-engine/src/context/ContextSelector.ts' <<'EOF'
export class ContextSelector{ select(indexArtifact:any,memorySummary:string,query:string){ return {memorySummary,topFiles:(indexArtifact?.files??[]).slice(0,8),query}; }}

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/context/PromptAuditLog.ts')"
cat > 'packages/builder-engine/src/context/PromptAuditLog.ts' <<'EOF'
const audits=new Map<string,any[]>(); export class PromptAuditLog{ record(runId:string,data:any){ const list=audits.get(runId)??[]; list.push({...data,at:new Date().toISOString()}); audits.set(runId,list); return list[list.length-1]; }}

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/context/VersionAwareContext.ts')"
cat > 'packages/builder-engine/src/context/VersionAwareContext.ts' <<'EOF'
export function buildVersionAwareContext(pkgJson:any){ return {dependencies:pkgJson?.dependencies??{},devDependencies:pkgJson?.devDependencies??{}}; }

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/execution/ArtifactWriter.ts')"
cat > 'packages/builder-engine/src/execution/ArtifactWriter.ts' <<'EOF'
import { ArtifactRepository } from "@streamsai/file-engine"; export class ArtifactWriter{ constructor(private readonly repo=new ArtifactRepository()){} write(runId:string,artifact:unknown){ return this.repo.put(runId,artifact); }}

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/execution/FileActionPlanner.ts')"
cat > 'packages/builder-engine/src/execution/FileActionPlanner.ts' <<'EOF'
import type { FileAction } from "@streamsai/shared"; export class FileActionPlanner{ normalize(actions:FileAction[]){ return actions.map(a=>({...a,reason:a.reason??"builder planned action"})); }}

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/execution/PatchApplier.ts')"
cat > 'packages/builder-engine/src/execution/PatchApplier.ts' <<'EOF'
import { FileRepository } from "@streamsai/file-engine"; import type { FileAction } from "@streamsai/shared"; export class PatchApplier{ constructor(private readonly files=new FileRepository()){} apply(root:string,actions:FileAction[]){ this.files.apply(root,actions); return {applied:actions.length}; }}

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/execution/PatchGenerator.ts')"
cat > 'packages/builder-engine/src/execution/PatchGenerator.ts' <<'EOF'
import type { FileAction } from "@streamsai/shared"; export class PatchGenerator{ generate(actions:FileAction[]){ return actions.map(a=>({path:a.path,patch:a.content?`+++ ${a.path}\n${a.content}`:`DELETE ${a.path}`})); }}

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/execution/ResponseFormatter.ts')"
cat > 'packages/builder-engine/src/execution/ResponseFormatter.ts' <<'EOF'
import type { PipelineFinalResult } from "@streamsai/shared"; export class ResponseFormatter{ format(result:PipelineFinalResult){ return {section1:result.explanation, section2:result.plan, section3:result.fileActions}; }}

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/index.ts')"
cat > 'packages/builder-engine/src/index.ts' <<'EOF'
export * from "./pipeline/BuilderPipeline";

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/pipeline/BuilderPipeline.ts')"
cat > 'packages/builder-engine/src/pipeline/BuilderPipeline.ts' <<'EOF'
import { generateViaGateway } from "@streamsai/ai-gateway";
import { MemorySummarizer } from "@streamsai/project-memory/src/MemorySummarizer";
import { searchKnowledge } from "@streamsai/retrieval-core";
import { SemanticIndexer } from "@streamsai/workspace-indexer";
import { CheckpointManager } from "@streamsai/file-engine";
import { ValidationEngine } from "@streamsai/validators";
import { RepairEngine } from "@streamsai/validators/src/repair/RepairEngine";
import { StageRunner } from "./stage-runner";
import { withStageTimeout } from "./stage-timeouts";
import { RequestInterpreter } from "../planning/RequestInterpreter";
import { TaskClassifier } from "../planning/TaskClassifier";
import { ChangeImpactAnalyzer } from "../planning/ChangeImpactAnalyzer";
import { RiskAssessor } from "../planning/RiskAssessor";
import { ExecutionPlanner } from "../planning/ExecutionPlanner";
import { FileActionPlanner } from "../execution/FileActionPlanner";
import { PatchGenerator } from "../execution/PatchGenerator";
import { ArtifactWriter } from "../execution/ArtifactWriter";
import { ResponseFormatter } from "../execution/ResponseFormatter";
import { PromptAuditLog } from "../context/PromptAuditLog";
import { StrategyMemory } from "../planning/StrategyMemory";
import type { PipelineFinalResult } from "@streamsai/shared";

export class BuilderPipeline {
  private readonly runner = new StageRunner();
  private readonly artifactWriter = new ArtifactWriter();
  private readonly audit = new PromptAuditLog();

  async run(input: { runId: string; projectId: string; workspaceRoot: string; message: string }): Promise<PipelineFinalResult> {
    const checkpointId = new CheckpointManager().create(input.projectId, { workspaceRoot: input.workspaceRoot, message: input.message });
    const interpreted = await this.runner.run("interpret", [true], () => withStageTimeout("planning", async () => new RequestInterpreter().interpret(input.message)));
    const classified = await this.runner.run("classify", [interpreted.ok], () => withStageTimeout("planning", async () => new TaskClassifier().classify(input.message)));
    const indexed = await this.runner.run("workspace_inspect", [classified.ok], () => withStageTimeout("planning", async () => new SemanticIndexer().build(input.projectId, input.workspaceRoot)));
    const memory = await this.runner.run("memory_retrieval", [indexed.ok], () => withStageTimeout("planning", async () => new MemorySummarizer().summarize(input.projectId)));
    const retrieved = await this.runner.run("knowledge_retrieval", [memory.ok], () => withStageTimeout("planning", async () => searchKnowledge(input.message, 5)));
    const impact = await this.runner.run("impact_analysis", [classified.ok, indexed.ok], () => withStageTimeout("planning", async () => new ChangeImpactAnalyzer().analyze(indexed.data, classified.data)));
    const risk = await this.runner.run("risk_assessment", [impact.ok, classified.ok], () => withStageTimeout("planning", async () => new RiskAssessor().assess(classified.data!, impact.data)));
    const planned = await this.runner.run("execution_plan", [classified.ok], () => withStageTimeout("planning", async () => new ExecutionPlanner().plan(classified.data!, input.message)));
    const aiGenerated = await this.runner.run("generation", [planned.ok], () => withStageTimeout("generation", async () => {
      const ai = await generateViaGateway({ purpose: "generation", messages: [{ role: "system", content: "Return implementation-oriented code generation guidance." }, { role: "user", content: input.message }] });
      return { ...planned.data!, ai };
    }));
    const fileActions = new FileActionPlanner().normalize(aiGenerated.data?.fileActions ?? []);
    const patches = new PatchGenerator().generate(fileActions);
    const validated = await this.runner.run("validation", [aiGenerated.ok], () => withStageTimeout("validation", async () => new ValidationEngine().validate(fileActions)));
    const repaired = await this.runner.run("repair", [validated.ok], () => withStageTimeout("repair", async () => new RepairEngine().repair(fileActions, validated.data ?? [])));
    this.audit.record(input.runId, { message: input.message, memory: memory.data, retrieval: retrieved.data, classified: classified.data });
    this.artifactWriter.write(input.runId, { checkpointId, interpreted, classified, indexed, memory, retrieved, impact, risk, planned, patches, validated, repaired });
    new StrategyMemory().record(input.projectId, { taskType: classified.data, strategy: "default-safe-patch", risk: risk.data, validationOutcome: (validated.data ?? []).some((x: any) => x.severity === "error") ? "error" : "ok" });
    const final: PipelineFinalResult = {
      runId: input.runId,
      checkpointId,
      explanation: `Request classified as ${classified.data}; risk=${risk.data}. Retrieved ${(retrieved.data as any[])?.length ?? 0} knowledge artifacts.`,
      plan: planned.data?.steps ?? [],
      fileActions: repaired.data?.actions ?? fileActions,
      validation: validated.data ?? [],
      repairs: repaired.data?.repairs ?? [],
      auditRefs: [input.runId]
    };
    return new ResponseFormatter().format(final) as unknown as PipelineFinalResult;
  }
}

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/pipeline/stage-recovery.ts')"
cat > 'packages/builder-engine/src/pipeline/stage-recovery.ts' <<'EOF'
type PersistedStage={stage:string;ok:boolean;sideEffectSafe:boolean;data?:unknown}; export function latestSafeStage(stages:PersistedStage[]){ return [...stages].reverse().find(s=>s.ok&&s.sideEffectSafe); } export function decideRecovery(stages:PersistedStage[]){ const safe=latestSafeStage(stages); if(!safe) return {action:"restart" as const}; if(safe.stage==="generation") return {action:"resume" as const,from:"validation"}; if(safe.stage==="validation") return {action:"resume" as const,from:"repair"}; return {action:"resume" as const,from:safe.stage}; }

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/pipeline/stage-runner.ts')"
cat > 'packages/builder-engine/src/pipeline/stage-runner.ts' <<'EOF'
import { log } from "@streamsai/observability"; import type { StageResult } from "@streamsai/shared"; export class StageRunner{ async run<T>(name:string,prerequisites:boolean[],fn:()=>Promise<T>):Promise<StageResult<T>>{ const startedAt=new Date().toISOString(); log("info","pipeline.stage.start",{stage:name,startedAt}); if(prerequisites.some(p=>!p)){ const error=`Prerequisite failure for stage ${name}`; log("error","pipeline.stage.prereq_failed",{stage:name,error}); return {stage:name,ok:false,startedAt,finishedAt:new Date().toISOString(),error}; } try{ const data=await fn(); const finishedAt=new Date().toISOString(); log("info","pipeline.stage.success",{stage:name,finishedAt}); return {stage:name,ok:true,startedAt,finishedAt,data}; } catch(e:any){ const finishedAt=new Date().toISOString(); log("error","pipeline.stage.error",{stage:name,finishedAt,error:e?.message??String(e)}); return {stage:name,ok:false,startedAt,finishedAt,error:e?.message??String(e)}; } }}

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/pipeline/stage-timeouts.ts')"
cat > 'packages/builder-engine/src/pipeline/stage-timeouts.ts' <<'EOF'
import { loadStageTimeouts } from "@streamsai/config"; export type StageType="planning"|"generation"|"validation"|"repair"|"preview"; export function getTimeoutForStage(stage:StageType){const cfg=loadStageTimeouts(); return {planning:cfg.planningMs,generation:cfg.generationMs,validation:cfg.validationMs,repair:cfg.repairMs,preview:cfg.previewMs}[stage];} export async function withStageTimeout<T>(stage:StageType,executor:()=>Promise<T>){ const timeoutMs=getTimeoutForStage(stage); return await Promise.race([executor(), new Promise<T>((_,reject)=>setTimeout(()=>reject(new Error(`Stage timeout: ${stage} after ${timeoutMs}ms`)), timeoutMs))]); }

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/planning/ChangeImpactAnalyzer.ts')"
cat > 'packages/builder-engine/src/planning/ChangeImpactAnalyzer.ts' <<'EOF'
export class ChangeImpactAnalyzer{ analyze(index:any, taskType:string){ return {taskType, likelyAffectedAreas:Array.isArray(index?.routeGraph)?index.routeGraph.slice(0,5):[], dependencyEdges:Array.isArray(index?.dependencyGraph)?index.dependencyGraph.slice(0,10):[]}; }}

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/planning/ExecutionPlanner.ts')"
cat > 'packages/builder-engine/src/planning/ExecutionPlanner.ts' <<'EOF'
import type { FileAction } from "@streamsai/shared"; export class ExecutionPlanner{ plan(taskType:string,message:string):{steps:string[];fileActions:FileAction[]}{ const steps=[`Classify task as ${taskType}`,"Inspect indexed workspace and memory","Generate file action plan","Validate and repair","Persist artifacts and format final response"]; const fileActions:FileAction[]=[{type:"create",path:"app/page.tsx",reason:"default plan artifact",content:`export default function Page(){ return <main><h1>${message.replace(/[<>]/g,"")}</h1></main>; }`}]; return {steps,fileActions}; }}

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/planning/RequestInterpreter.ts')"
cat > 'packages/builder-engine/src/planning/RequestInterpreter.ts' <<'EOF'
export class RequestInterpreter{ interpret(message:string){ return {raw:message, normalized:message.trim(), intentHints:message.toLowerCase().split(/\W+/).filter(Boolean)}; }}

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/planning/RiskAssessor.ts')"
cat > 'packages/builder-engine/src/planning/RiskAssessor.ts' <<'EOF'
export class RiskAssessor{ assess(taskType:string, impact:any){ const score=(impact?.dependencyEdges?.length??0)+((taskType==="schema_update"||taskType==="route_update")?5:1); if(score>8) return "high"; if(score>3) return "moderate"; return "low"; }}

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/planning/StrategyMemory.ts')"
cat > 'packages/builder-engine/src/planning/StrategyMemory.ts' <<'EOF'
const strategies=new Map<string,any[]>(); export class StrategyMemory{ record(projectId:string,artifact:any){const list=strategies.get(projectId)??[]; list.push({...artifact,recordedAt:new Date().toISOString()}); strategies.set(projectId,list); return artifact;} list(projectId:string){return strategies.get(projectId)??[];} }

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/planning/StrategySelector.ts')"
cat > 'packages/builder-engine/src/planning/StrategySelector.ts' <<'EOF'
import { StrategyMemory } from "./StrategyMemory"; export class StrategySelector{ constructor(private readonly memory=new StrategyMemory()){} select(projectId:string,taskType:string){ const prior=this.memory.list(projectId).filter((x)=>x.taskType===taskType); const successful=prior.find((x)=>x.validationOutcome!=="error"); return successful?.strategy??"default-safe-patch"; }}

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/planning/TaskClassifier.ts')"
cat > 'packages/builder-engine/src/planning/TaskClassifier.ts' <<'EOF'
import type { TaskType } from "@streamsai/shared"; export class TaskClassifier{ classify(input:string):TaskType{const text=input.toLowerCase(); if(text.includes("fix")) return "bug_fix"; if(text.includes("refactor")) return "refactor"; if(text.includes("schema")) return "schema_update"; if(text.includes("route")) return "route_update"; if(text.includes("validate")) return "validation_only"; if(text.includes("repair")) return "repair_only"; if(text.includes("modify")||text.includes("update")) return "feature_modification"; return "feature_creation"; }}

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/rules/ProjectRulesEngine.ts')"
cat > 'packages/builder-engine/src/rules/ProjectRulesEngine.ts' <<'EOF'
export class ProjectRulesEngine{ checkPath(path:string){ if(path.startsWith("components/")||path.startsWith("app/")||path.startsWith("lib/")||path.startsWith("src/")) return []; return [`Path ${path} violates file placement rule`]; }}

EOF

mkdir -p "$(dirname 'packages/builder-engine/src/rules/default-rules.ts')"
cat > 'packages/builder-engine/src/rules/default-rules.ts' <<'EOF'
export const DEFAULT_RULES={naming:"PascalCase components, camelCase hooks/utils",routing:"app router first",imports:"prefer explicit relative or aliased imports"};

EOF

mkdir -p "$(dirname 'packages/config/package.json')"
cat > 'packages/config/package.json' <<'EOF'
{"name":"@streamsai/config","version":"0.1.0","type":"module","main":"src/index.ts"}
EOF

mkdir -p "$(dirname 'packages/config/src/env.ts')"
cat > 'packages/config/src/env.ts' <<'EOF'
export function getEnv(name:string,fallback?:string):string{const value=process.env[name]??fallback;if(value===undefined) throw new Error(`Missing required env: ${name}`);return value;}
export function getEnvNumber(name:string,fallback:number):number{const raw=process.env[name]; if(!raw) return fallback; const n=Number(raw); if(Number.isNaN(n)) throw new Error(`Env ${name} must be numeric`); return n;}

EOF

mkdir -p "$(dirname 'packages/config/src/index.ts')"
cat > 'packages/config/src/index.ts' <<'EOF'
export * from "./env"; export * from "./profiles"; export * from "./sandbox-policy"; export * from "./retention-policy"; export * from "./timeouts";

EOF

mkdir -p "$(dirname 'packages/config/src/profiles.ts')"
cat > 'packages/config/src/profiles.ts' <<'EOF'
export type BuildTargetProfile="local"|"vercel"|"worker"|"preview"; export const PROFILES={local:{name:"local",notes:"developer local profile"},vercel:{name:"vercel",notes:"frontend/API edge deployment profile"},worker:{name:"worker",notes:"background worker runtime"},preview:{name:"preview",notes:"preview sandbox runtime"}} as const;

EOF

mkdir -p "$(dirname 'packages/config/src/retention-policy.ts')"
cat > 'packages/config/src/retention-policy.ts' <<'EOF'
import { getEnvNumber } from "./env"; export function loadRetentionPolicy(){return {artifactRetentionDays:getEnvNumber("ARTIFACT_RETENTION_DAYS",30),maxArtifactBytes:getEnvNumber("ARTIFACT_MAX_BYTES",5*1024*1024)}}

EOF

mkdir -p "$(dirname 'packages/config/src/sandbox-policy.ts')"
cat > 'packages/config/src/sandbox-policy.ts' <<'EOF'
import { getEnv } from "./env";
export type SandboxNetworkPolicy={mode:"restricted"|"deny_all"|"allowlist";allowlist:string[]};
export function loadSandboxNetworkPolicy():SandboxNetworkPolicy{const mode=(process.env.SANDBOX_NETWORK_MODE as SandboxNetworkPolicy["mode"])||"restricted";const allowlist=getEnv("SANDBOX_NETWORK_ALLOWLIST","").split(",").map(v=>v.trim()).filter(Boolean);return {mode,allowlist};}

EOF

mkdir -p "$(dirname 'packages/config/src/timeouts.ts')"
cat > 'packages/config/src/timeouts.ts' <<'EOF'
import { getEnvNumber } from "./env"; export const loadStageTimeouts=()=>({planningMs:getEnvNumber("PIPELINE_TIMEOUT_PLANNING_MS",30000),generationMs:getEnvNumber("PIPELINE_TIMEOUT_GENERATION_MS",120000),validationMs:getEnvNumber("PIPELINE_TIMEOUT_VALIDATION_MS",45000),repairMs:getEnvNumber("PIPELINE_TIMEOUT_REPAIR_MS",45000),previewMs:getEnvNumber("PIPELINE_TIMEOUT_PREVIEW_MS",180000),totalMs:getEnvNumber("MAX_PIPELINE_RUNTIME_MS",420000)});

EOF

mkdir -p "$(dirname 'packages/file-engine/package.json')"
cat > 'packages/file-engine/package.json' <<'EOF'
{"name":"@streamsai/file-engine","version":"0.1.0","type":"module","main":"src/index.ts"}
EOF

mkdir -p "$(dirname 'packages/file-engine/src/ArtifactRepository.ts')"
cat > 'packages/file-engine/src/ArtifactRepository.ts' <<'EOF'
const artifacts=new Map<string,unknown[]>(); export class ArtifactRepository{put(runId:string,artifact:unknown){const list=artifacts.get(runId)??[]; list.push(artifact); artifacts.set(runId,list); return artifact;} list(runId:string){return artifacts.get(runId)??[];}}

EOF

mkdir -p "$(dirname 'packages/file-engine/src/CheckpointManager.ts')"
cat > 'packages/file-engine/src/CheckpointManager.ts' <<'EOF'
const checkpoints=new Map<string,{id:string;snapshot:unknown;createdAt:string}[]>(); export class CheckpointManager{create(projectId:string,snapshot:unknown){const id=`ckpt_${Date.now()}`; const list=checkpoints.get(projectId)??[]; list.push({id,snapshot,createdAt:new Date().toISOString()}); checkpoints.set(projectId,list); return id;} latest(projectId:string){const list=checkpoints.get(projectId)??[]; return list[list.length-1];}}

EOF

mkdir -p "$(dirname 'packages/file-engine/src/ConflictDetector.ts')"
cat > 'packages/file-engine/src/ConflictDetector.ts' <<'EOF'
export function detectConflict(currentChecksum?:string,incomingChecksum?:string){return Boolean(currentChecksum&&incomingChecksum&&currentChecksum!==incomingChecksum);}

EOF

mkdir -p "$(dirname 'packages/file-engine/src/FileRepository.ts')"
cat > 'packages/file-engine/src/FileRepository.ts' <<'EOF'
import fs from "node:fs"; import path from "node:path"; import type { FileAction } from "@streamsai/shared";
export class FileRepository{apply(root:string,actions:FileAction[]){for(const action of actions){const target=path.join(root,action.path); fs.mkdirSync(path.dirname(target),{recursive:true}); if(action.type==="delete"){if(fs.existsSync(target)) fs.unlinkSync(target);} else if(action.type==="move"&&action.newPath){const dest=path.join(root,action.newPath); fs.mkdirSync(path.dirname(dest),{recursive:true}); fs.renameSync(target,dest);} else {fs.writeFileSync(target,action.content??"","utf8");}}}}

EOF

mkdir -p "$(dirname 'packages/file-engine/src/LockCoordinator.ts')"
cat > 'packages/file-engine/src/LockCoordinator.ts' <<'EOF'
const locks=new Map<string,{owner:string;acquiredAt:string}>();
export class LockCoordinator{
  acquire(path:string,owner:string){const existing=locks.get(path); if(existing&&existing.owner!==owner) return {ok:false as const,existing}; const lock={owner,acquiredAt:new Date().toISOString()}; locks.set(path,lock); return {ok:true as const,lock};}
  release(path:string,owner:string){const existing=locks.get(path); if(existing?.owner===owner) locks.delete(path); return !locks.has(path);}
}

EOF

mkdir -p "$(dirname 'packages/file-engine/src/RollbackManager.ts')"
cat > 'packages/file-engine/src/RollbackManager.ts' <<'EOF'
import { CheckpointManager } from "./CheckpointManager"; export class RollbackManager{constructor(private readonly checkpoints=new CheckpointManager()){} rollbackToLatest(projectId:string){return this.checkpoints.latest(projectId);}}

EOF

mkdir -p "$(dirname 'packages/file-engine/src/VersionManager.ts')"
cat > 'packages/file-engine/src/VersionManager.ts' <<'EOF'
const versions=new Map<string,Array<{content:string;at:string}>>(); export class VersionManager{push(path:string,content:string){const list=versions.get(path)??[]; list.push({content,at:new Date().toISOString()}); versions.set(path,list); return list[list.length-1];} list(path:string){return versions.get(path)??[];}}

EOF

mkdir -p "$(dirname 'packages/file-engine/src/index.ts')"
cat > 'packages/file-engine/src/index.ts' <<'EOF'
export * from "./FileRepository"; export * from "./CheckpointManager"; export * from "./LockCoordinator";

EOF

mkdir -p "$(dirname 'packages/file-engine/src/retention.ts')"
cat > 'packages/file-engine/src/retention.ts' <<'EOF'
export function shouldRetain(createdAtIso:string,retentionDays:number){const created=new Date(createdAtIso).getTime(); const cutoff=Date.now()-retentionDays*24*60*60*1000; return created>=cutoff;}

EOF

mkdir -p "$(dirname 'packages/observability/package.json')"
cat > 'packages/observability/package.json' <<'EOF'
{"name":"@streamsai/observability","version":"0.1.0","type":"module","main":"src/index.ts"}
EOF

mkdir -p "$(dirname 'packages/observability/src/diagnostics.ts')"
cat > 'packages/observability/src/diagnostics.ts' <<'EOF'
export function startupDiagnostics(){return {pid:process.pid,node:process.version,startedAt:new Date().toISOString()};}

EOF

mkdir -p "$(dirname 'packages/observability/src/health.ts')"
cat > 'packages/observability/src/health.ts' <<'EOF'
export function buildHealth(service:string){return {ok:true as const,service,version:"0.1.0",now:new Date().toISOString()};}

EOF

mkdir -p "$(dirname 'packages/observability/src/index.ts')"
cat > 'packages/observability/src/index.ts' <<'EOF'
export * from "./logger"; export * from "./health"; export * from "./diagnostics";

EOF

mkdir -p "$(dirname 'packages/observability/src/logger.ts')"
cat > 'packages/observability/src/logger.ts' <<'EOF'
type LogLevel="debug"|"info"|"warn"|"error"; export function log(level:LogLevel,event:string,context:Record<string,unknown>={}){console.log(JSON.stringify({ts:new Date().toISOString(),level,event,...context}))}

EOF

mkdir -p "$(dirname 'packages/project-memory/package.json')"
cat > 'packages/project-memory/package.json' <<'EOF'
{"name":"@streamsai/project-memory","version":"0.1.0","type":"module","main":"src/index.ts"}
EOF

mkdir -p "$(dirname 'packages/project-memory/src/MemoryCompactor.ts')"
cat > 'packages/project-memory/src/MemoryCompactor.ts' <<'EOF'
import { MemoryStore } from "./MemoryStore"; export class MemoryCompactor{constructor(private readonly store=new MemoryStore()){} compact(projectId:string){const dedup=new Map(this.store.list(projectId).map(e=>[e.key,e])); return [...dedup.values()];}}

EOF

mkdir -p "$(dirname 'packages/project-memory/src/MemoryStore.ts')"
cat > 'packages/project-memory/src/MemoryStore.ts' <<'EOF'
type MemoryEntry={key:string;value:unknown;durable:boolean;createdAt:string;updatedAt:string};
const store=new Map<string,MemoryEntry[]>();
export class MemoryStore{
  list(projectId:string){return store.get(projectId)??[];}
  get(projectId:string,key:string){return this.list(projectId).find(e=>e.key===key);}
  put(projectId:string,key:string,value:unknown,durable=true){const entries=this.list(projectId).filter(e=>e.key!==key);const now=new Date().toISOString();entries.push({key,value,durable,createdAt:now,updatedAt:now});store.set(projectId,entries);return entries[entries.length-1];}
}

EOF

mkdir -p "$(dirname 'packages/project-memory/src/MemorySummarizer.ts')"
cat > 'packages/project-memory/src/MemorySummarizer.ts' <<'EOF'
import { MemoryStore } from "./MemoryStore"; export class MemorySummarizer{constructor(private readonly store=new MemoryStore()){} summarize(projectId:string):string{return this.store.list(projectId).map(e=>`${e.key}: ${JSON.stringify(e.value)}`).join("\n");}}

EOF

mkdir -p "$(dirname 'packages/project-memory/src/MemoryUpdater.ts')"
cat > 'packages/project-memory/src/MemoryUpdater.ts' <<'EOF'
import { MemoryStore } from "./MemoryStore"; export class MemoryUpdater{constructor(private readonly store=new MemoryStore()){} updateFromPlan(projectId:string,plan:Record<string,unknown>){Object.entries(plan).forEach(([k,v])=>this.store.put(projectId,k,v,true)); return this.store.list(projectId);}}

EOF

mkdir -p "$(dirname 'packages/project-memory/src/index.ts')"
cat > 'packages/project-memory/src/index.ts' <<'EOF'
export * from "./MemoryStore"; export * from "./MemoryUpdater"; export * from "./MemorySummarizer"; export * from "./MemoryCompactor";

EOF

mkdir -p "$(dirname 'packages/project-memory/src/provenance.ts')"
cat > 'packages/project-memory/src/provenance.ts' <<'EOF'
export type DecisionProvenance={source:"user"|"builder"|"repair"|"system";timestamp:string;runId?:string};

EOF

mkdir -p "$(dirname 'packages/queue-core/package.json')"
cat > 'packages/queue-core/package.json' <<'EOF'
{"name":"@streamsai/queue-core","version":"0.1.0","type":"module","main":"src/index.ts"}
EOF

mkdir -p "$(dirname 'packages/queue-core/src/backoff.ts')"
cat > 'packages/queue-core/src/backoff.ts' <<'EOF'
export function computeBackoff(attempt:number,delay=2000){return delay*Math.pow(2,Math.max(0,attempt-1));}

EOF

mkdir -p "$(dirname 'packages/queue-core/src/bullmq.ts')"
cat > 'packages/queue-core/src/bullmq.ts' <<'EOF'
import { Queue, Worker, QueueEvents } from "bullmq";
import { getRedisUrl } from "./redis";
export function createQueue(name:string){return new Queue(name,{connection:{url:getRedisUrl()} as any});}
export function createQueueEvents(name:string){return new QueueEvents(name,{connection:{url:getRedisUrl()} as any});}
export function createWorker(name:string,processor:any,concurrency=1){return new Worker(name,processor,{concurrency,connection:{url:getRedisUrl()} as any});}

EOF

mkdir -p "$(dirname 'packages/queue-core/src/index.ts')"
cat > 'packages/queue-core/src/index.ts' <<'EOF'
export * from "./redis"; export * from "./bullmq";

EOF

mkdir -p "$(dirname 'packages/queue-core/src/priorities.ts')"
cat > 'packages/queue-core/src/priorities.ts' <<'EOF'
export const PRIORITY={high:1,normal:5,low:10} as const;

EOF

mkdir -p "$(dirname 'packages/queue-core/src/queue-factory.ts')"
cat > 'packages/queue-core/src/queue-factory.ts' <<'EOF'
import { createQueue } from "./bullmq"; export function queueFactory(name:string){return createQueue(name);}

EOF

mkdir -p "$(dirname 'packages/queue-core/src/redis.ts')"
cat > 'packages/queue-core/src/redis.ts' <<'EOF'
import { getEnv } from "@streamsai/config"; export const getRedisUrl=()=>getEnv("REDIS_URL","redis://localhost:6379");

EOF

mkdir -p "$(dirname 'packages/queue-core/src/retry-policy.ts')"
cat > 'packages/queue-core/src/retry-policy.ts' <<'EOF'
export const defaultRetryPolicy={attempts:3,backoff:{type:"exponential",delay:2000}};

EOF

mkdir -p "$(dirname 'packages/retrieval-core/package.json')"
cat > 'packages/retrieval-core/package.json' <<'EOF'
{"name":"@streamsai/retrieval-core","version":"0.1.0","type":"module","main":"src/index.ts"}
EOF

mkdir -p "$(dirname 'packages/retrieval-core/src/index.ts')"
cat > 'packages/retrieval-core/src/index.ts' <<'EOF'
export * from "./ingestion/ingest-pack"; export * from "./retrieval/search";

EOF

mkdir -p "$(dirname 'packages/retrieval-core/src/ingestion/chunker.ts')"
cat > 'packages/retrieval-core/src/ingestion/chunker.ts' <<'EOF'
export function chunkText(content:string,maxChars=1200){const chunks:string[]=[]; for(let i=0;i<content.length;i+=maxChars) chunks.push(content.slice(i,i+maxChars)); return chunks;}

EOF

mkdir -p "$(dirname 'packages/retrieval-core/src/ingestion/embedding-lifecycle.ts')"
cat > 'packages/retrieval-core/src/ingestion/embedding-lifecycle.ts' <<'EOF'
export const currentEmbeddingModelVersion=()=>process.env.EMBEDDING_MODEL||"text-embedding-3-small"; export function shouldReindex(existingModel:string,incomingModel:string,existingPackVersion:string,incomingPackVersion:string){return existingModel!==incomingModel||existingPackVersion!==incomingPackVersion;}

EOF

mkdir -p "$(dirname 'packages/retrieval-core/src/ingestion/ingest-pack.ts')"
cat > 'packages/retrieval-core/src/ingestion/ingest-pack.ts' <<'EOF'
import fs from "node:fs";
import { chunkText } from "./chunker";
import { KnowledgePackStore } from "../storage/KnowledgePackStore";
import { EmbeddingStore } from "../storage/EmbeddingStore";
import { currentEmbeddingModelVersion } from "./embedding-lifecycle";
export async function ingestKnowledgePack(filePath:string){
  const raw=JSON.parse(fs.readFileSync(filePath,"utf8"));
  const packStore=new KnowledgePackStore(); const vectorStore=new EmbeddingStore();
  packStore.put(raw);
  const embeddingModel=currentEmbeddingModelVersion();
  for(const doc of raw.documents){ for(const [idx,chunk] of chunkText(doc.content).entries()){const key=`${raw.id}:${doc.id}:${idx}`; vectorStore.put({key,embeddingModel,packVersion:raw.version,vector:[chunk.length%17,chunk.length%29,chunk.length%43],text:`${doc.title}\n${chunk}`});}}
  return {packId:raw.id,embeddingModel,chunks:vectorStore.list().length};
}

EOF

mkdir -p "$(dirname 'packages/retrieval-core/src/ingestion/version-compatibility.ts')"
cat > 'packages/retrieval-core/src/ingestion/version-compatibility.ts' <<'EOF'
export function isPackCompatible(schemaVersion:string){return schemaVersion==="1";}

EOF

mkdir -p "$(dirname 'packages/retrieval-core/src/packs/README.md')"
cat > 'packages/retrieval-core/src/packs/README.md' <<'EOF'
Knowledge packs are versioned JSON files with schemaVersion, version, source, scope, and document payloads.

EOF

mkdir -p "$(dirname 'packages/retrieval-core/src/packs/manifest.schema.json')"
cat > 'packages/retrieval-core/src/packs/manifest.schema.json' <<'EOF'
{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","required":["id","version","schemaVersion","source","scope","documents"]}
EOF

mkdir -p "$(dirname 'packages/retrieval-core/src/retrieval/ranker.ts')"
cat > 'packages/retrieval-core/src/retrieval/ranker.ts' <<'EOF'
export function rankResults<T extends {score:number}>(items:T[]){return [...items].sort((a,b)=>b.score-a.score);}

EOF

mkdir -p "$(dirname 'packages/retrieval-core/src/retrieval/search.ts')"
cat > 'packages/retrieval-core/src/retrieval/search.ts' <<'EOF'
import { VectorSearch } from "../storage/VectorSearch"; export function searchKnowledge(query:string,topK=5){return new VectorSearch().search(query,topK);}

EOF

mkdir -p "$(dirname 'packages/retrieval-core/src/retrieval/version-aware-match.ts')"
cat > 'packages/retrieval-core/src/retrieval/version-aware-match.ts' <<'EOF'
export function versionAwareMatch(installedVersion?:string,candidateVersion?:string){if(!installedVersion||!candidateVersion) return true; return installedVersion.split(".")[0]===candidateVersion.split(".")[0];}

EOF

mkdir -p "$(dirname 'packages/retrieval-core/src/storage/EmbeddingStore.ts')"
cat > 'packages/retrieval-core/src/storage/EmbeddingStore.ts' <<'EOF'
type VectorRecord={key:string;embeddingModel:string;packVersion:string;vector:number[];text:string}; const vectors=new Map<string,VectorRecord>(); export class EmbeddingStore{put(record:VectorRecord){vectors.set(record.key,record); return record;} list(){return [...vectors.values()];}}

EOF

mkdir -p "$(dirname 'packages/retrieval-core/src/storage/KnowledgePackStore.ts')"
cat > 'packages/retrieval-core/src/storage/KnowledgePackStore.ts' <<'EOF'
type KnowledgePack={id:string;version:string;schemaVersion:string;source:string;scope:string;documents:Array<{id:string;title:string;content:string;tags?:string[]}>};
const packs=new Map<string,KnowledgePack>();
export class KnowledgePackStore{put(pack:KnowledgePack){packs.set(pack.id,pack); return pack;} list(){return [...packs.values()];}}

EOF

mkdir -p "$(dirname 'packages/retrieval-core/src/storage/VectorSearch.ts')"
cat > 'packages/retrieval-core/src/storage/VectorSearch.ts' <<'EOF'
import { EmbeddingStore } from "./EmbeddingStore";
export class VectorSearch{constructor(private readonly store=new EmbeddingStore()){} search(query:string,topK=5){return this.store.list().map(r=>({...r,score:overlap(query,r.text)})).sort((a,b)=>b.score-a.score).slice(0,topK);}}
function overlap(a:string,b:string){const aa=new Set(a.toLowerCase().split(/\W+/)); const bb=new Set(b.toLowerCase().split(/\W+/)); return [...aa].filter(x=>bb.has(x)).length;}

EOF

mkdir -p "$(dirname 'packages/shared/package.json')"
cat > 'packages/shared/package.json' <<'EOF'
{"name":"@streamsai/shared","version":"0.1.0","type":"module","main":"src/index.ts"}
EOF

mkdir -p "$(dirname 'packages/shared/src/constants/limits.ts')"
cat > 'packages/shared/src/constants/limits.ts' <<'EOF'
export const LIMITS={maxArtifactBytes:Number(process.env.ARTIFACT_MAX_BYTES||5*1024*1024),retentionDays:Number(process.env.ARTIFACT_RETENTION_DAYS||30)};

EOF

mkdir -p "$(dirname 'packages/shared/src/constants/queues.ts')"
cat > 'packages/shared/src/constants/queues.ts' <<'EOF'
export const QUEUES={generation:"generation",indexing:"indexing",validation:"validation",repair:"repair",preview:"preview",maintenance:"maintenance"} as const;

EOF

mkdir -p "$(dirname 'packages/shared/src/constants/timeouts.ts')"
cat > 'packages/shared/src/constants/timeouts.ts' <<'EOF'
export const TIMEOUT_KEYS={planning:"PIPELINE_TIMEOUT_PLANNING_MS",generation:"PIPELINE_TIMEOUT_GENERATION_MS",validation:"PIPELINE_TIMEOUT_VALIDATION_MS",repair:"PIPELINE_TIMEOUT_REPAIR_MS",preview:"PIPELINE_TIMEOUT_PREVIEW_MS",total:"MAX_PIPELINE_RUNTIME_MS"} as const;

EOF

mkdir -p "$(dirname 'packages/shared/src/index.ts')"
cat > 'packages/shared/src/index.ts' <<'EOF'
export * from "./types/api";
export * from "./types/builder";
export * from "./types/jobs";
export * from "./types/manifest";
export * from "./types/graph";
export * from "./constants/queues";
export * from "./constants/timeouts";
export * from "./constants/limits";

EOF

mkdir -p "$(dirname 'packages/shared/src/types/api.ts')"
cat > 'packages/shared/src/types/api.ts' <<'EOF'
export type ApiError={code:string;message:string;details?:unknown}; export type HealthResponse={ok:true;service:string;version:string;now:string}; export type StructuredError={ok:false;error:ApiError;requestId?:string};

EOF

mkdir -p "$(dirname 'packages/shared/src/types/builder.ts')"
cat > 'packages/shared/src/types/builder.ts' <<'EOF'
export type TaskType="feature_creation"|"feature_modification"|"bug_fix"|"refactor"|"schema_update"|"route_update"|"validation_only"|"repair_only";
export type FileActionType="create"|"update"|"replace"|"delete"|"move";
export type FileAction={type:FileActionType;path:string;content?:string;newPath?:string;reason?:string};
export type ValidationIssue={code:string;severity:"info"|"warning"|"error";message:string;path?:string};
export type StageResult<T=unknown>={stage:string;ok:boolean;startedAt:string;finishedAt?:string;data?:T;error?:string};
export type PipelineFinalResult={runId:string;checkpointId?:string;explanation:string;plan:string[];fileActions:FileAction[];validation:ValidationIssue[];repairs:string[];auditRefs:string[]};

EOF

mkdir -p "$(dirname 'packages/shared/src/types/graph.ts')"
cat > 'packages/shared/src/types/graph.ts' <<'EOF'
export type GraphNode={id:string;label?:string;type?:string}; export type GraphEdge={from:string;to:string;label?:string;type?:string};

EOF

mkdir -p "$(dirname 'packages/shared/src/types/jobs.ts')"
cat > 'packages/shared/src/types/jobs.ts' <<'EOF'
export type JobName="generation.run"|"indexing.refresh"|"validation.run"|"repair.run"|"preview.start"|"memory.summarize"|"artifacts.cleanup";

EOF

mkdir -p "$(dirname 'packages/shared/src/types/manifest.ts')"
cat > 'packages/shared/src/types/manifest.ts' <<'EOF'
export type BuildManifestEntry={path:string;purpose:string;subsystem:string;status:"fully_implemented"|"phase1_simplified"|"runtime_generated"|"intentionally_omitted"};

EOF

mkdir -p "$(dirname 'packages/validators/package.json')"
cat > 'packages/validators/package.json' <<'EOF'
{"name":"@streamsai/validators","version":"0.1.0","type":"module","main":"src/index.ts"}
EOF

mkdir -p "$(dirname 'packages/validators/src/ValidationEngine.ts')"
cat > 'packages/validators/src/ValidationEngine.ts' <<'EOF'
import type { FileAction, ValidationIssue } from "@streamsai/shared";
export class ValidationEngine{
  validate(actions:FileAction[]):ValidationIssue[]{
    const issues:ValidationIssue[]=[]; const seen=new Set<string>();
    for(const action of actions){
      if(seen.has(action.path)) issues.push({code:"duplicate_path",severity:"error",message:`Duplicate action path: ${action.path}`,path:action.path});
      seen.add(action.path);
      if(!action.path.startsWith("app/")&&!action.path.startsWith("src/")&&!action.path.startsWith("components/")&&!action.path.startsWith("lib/")) issues.push({code:"path_policy",severity:"warning",message:`Unusual file path: ${action.path}`,path:action.path});
      if((action.type==="create"||action.type==="replace"||action.type==="update")&&!action.content) issues.push({code:"missing_content",severity:"error",message:`Missing content for ${action.type}`,path:action.path});
    }
    return issues;
  }
}

EOF

mkdir -p "$(dirname 'packages/validators/src/checks/config-check.ts')"
cat > 'packages/validators/src/checks/config-check.ts' <<'EOF'
export const runConfigCheck=()=>[];

EOF

mkdir -p "$(dirname 'packages/validators/src/checks/dependency-compat-check.ts')"
cat > 'packages/validators/src/checks/dependency-compat-check.ts' <<'EOF'
export const runDependencyCompatCheck=()=>[];

EOF

mkdir -p "$(dirname 'packages/validators/src/checks/env-check.ts')"
cat > 'packages/validators/src/checks/env-check.ts' <<'EOF'
export const runEnvCheck=()=>[];

EOF

mkdir -p "$(dirname 'packages/validators/src/checks/import-check.ts')"
cat > 'packages/validators/src/checks/import-check.ts' <<'EOF'
export const runImportCheck=(_content:string)=>[];

EOF

mkdir -p "$(dirname 'packages/validators/src/checks/path-check.ts')"
cat > 'packages/validators/src/checks/path-check.ts' <<'EOF'
export const runPathCheck=(path:string)=>path.includes('..')?['relative parent path not allowed']:[];

EOF

mkdir -p "$(dirname 'packages/validators/src/checks/route-check.ts')"
cat > 'packages/validators/src/checks/route-check.ts' <<'EOF'
export const runRouteCheck=(_path:string)=>[];

EOF

mkdir -p "$(dirname 'packages/validators/src/checks/schema-check.ts')"
cat > 'packages/validators/src/checks/schema-check.ts' <<'EOF'
export const runSchemaCheck=()=>[];

EOF

mkdir -p "$(dirname 'packages/validators/src/checks/type-check.ts')"
cat > 'packages/validators/src/checks/type-check.ts' <<'EOF'
export const runTypeCheck=()=>[];

EOF

mkdir -p "$(dirname 'packages/validators/src/index.ts')"
cat > 'packages/validators/src/index.ts' <<'EOF'
export * from "./ValidationEngine"; export * from "./repair/RepairEngine";

EOF

mkdir -p "$(dirname 'packages/validators/src/repair/RepairEngine.ts')"
cat > 'packages/validators/src/repair/RepairEngine.ts' <<'EOF'
import type { FileAction, ValidationIssue } from "@streamsai/shared";
export class RepairEngine{
  repair(actions:FileAction[],issues:ValidationIssue[]){
    const repairs:string[]=[]; const repaired=actions.map(action=>({...action}));
    for(const issue of issues){
      if(issue.code==="missing_content"&&issue.path){const target=repaired.find(a=>a.path===issue.path); if(target){target.content=target.content??`export default function Placeholder(){ return null; }`; repairs.push(`Filled missing content for ${issue.path}`);}}
      if(issue.code==="path_policy"&&issue.path) repairs.push(`Reviewed unusual path ${issue.path}`);
    }
    return {actions:repaired,repairs};
  }
}

EOF

mkdir -p "$(dirname 'packages/validators/src/repair/repair-catalog.ts')"
cat > 'packages/validators/src/repair/repair-catalog.ts' <<'EOF'
export const REPAIR_CATALOG=["fill_missing_content","normalize_path","retry_generation"];

EOF

mkdir -p "$(dirname 'packages/validators/src/repair/safe-repair-policy.ts')"
cat > 'packages/validators/src/repair/safe-repair-policy.ts' <<'EOF'
export function isSafeRepair(code:string){return ["missing_content","path_policy"].includes(code);}

EOF

mkdir -p "$(dirname 'packages/validators/src/reports/severity.ts')"
cat > 'packages/validators/src/reports/severity.ts' <<'EOF'
export const SEVERITY_ORDER={info:1,warning:2,error:3} as const;

EOF

mkdir -p "$(dirname 'packages/workspace-indexer/package.json')"
cat > 'packages/workspace-indexer/package.json' <<'EOF'
{"name":"@streamsai/workspace-indexer","version":"0.1.0","type":"module","main":"src/index.ts"}
EOF

mkdir -p "$(dirname 'packages/workspace-indexer/src/ChangeTracker.ts')"
cat > 'packages/workspace-indexer/src/ChangeTracker.ts' <<'EOF'
export type ChangeRecord={path:string;changedAt:string}; const changes=new Map<string,ChangeRecord[]>(); export function recordChange(projectId:string,path:string){const list=changes.get(projectId)??[]; list.push({path,changedAt:new Date().toISOString()}); changes.set(projectId,list); return list;}

EOF

mkdir -p "$(dirname 'packages/workspace-indexer/src/DependencyGraphBuilder.ts')"
cat > 'packages/workspace-indexer/src/DependencyGraphBuilder.ts' <<'EOF'
import type { IndexedFile } from "./FileIndexer"; export function buildDependencyGraph(files:IndexedFile[]){return files.flatMap(f=>f.imports.map(i=>({from:f.path,to:i})));}

EOF

mkdir -p "$(dirname 'packages/workspace-indexer/src/FileIndexer.ts')"
cat > 'packages/workspace-indexer/src/FileIndexer.ts' <<'EOF'
import fs from "node:fs"; import path from "node:path";
export type IndexedFile={path:string;summary:string;imports:string[];exports:string[]};
export class FileIndexer{
  indexDir(root:string):IndexedFile[]{const results:IndexedFile[]=[]; const walk=(dir:string)=>{for(const name of fs.readdirSync(dir)){const full=path.join(dir,name); const stat=fs.statSync(full); if(stat.isDirectory()) walk(full); else if(/\.(ts|tsx|js|jsx|json)$/.test(name)){const content=fs.readFileSync(full,"utf8"); const imports=[...content.matchAll(/from\s+["']([^"']+)["']/g)].map(m=>m[1]); const exports=[...content.matchAll(/export\s+(?:default\s+)?(?:function|const|class)?\s*([A-Za-z0-9_]+)/g)].map(m=>m[1]).filter(Boolean); results.push({path:full,summary:content.slice(0,200),imports,exports});}}}; walk(root); return results;}
}

EOF

mkdir -p "$(dirname 'packages/workspace-indexer/src/FileRelationshipGraphBuilder.ts')"
cat > 'packages/workspace-indexer/src/FileRelationshipGraphBuilder.ts' <<'EOF'
import type { IndexedFile } from "./FileIndexer"; export function buildFileRelationshipGraph(files:IndexedFile[]){return files.flatMap(f=>f.imports.map(i=>({source:f.path,target:i})));}

EOF

mkdir -p "$(dirname 'packages/workspace-indexer/src/IncrementalUpdateEngine.ts')"
cat > 'packages/workspace-indexer/src/IncrementalUpdateEngine.ts' <<'EOF'
import { SemanticIndexer } from "./SemanticIndexer"; export class IncrementalUpdateEngine{constructor(private readonly indexer=new SemanticIndexer()){} update(projectId:string,workspaceRoot:string){return this.indexer.build(projectId,workspaceRoot);}}

EOF

mkdir -p "$(dirname 'packages/workspace-indexer/src/ModuleGraphBuilder.ts')"
cat > 'packages/workspace-indexer/src/ModuleGraphBuilder.ts' <<'EOF'
import type { IndexedFile } from "./FileIndexer"; export function buildModuleGraph(files:IndexedFile[]){return files.map(f=>({file:f.path,exports:f.exports}));}

EOF

mkdir -p "$(dirname 'packages/workspace-indexer/src/RouteGraphBuilder.ts')"
cat > 'packages/workspace-indexer/src/RouteGraphBuilder.ts' <<'EOF'
import type { IndexedFile } from "./FileIndexer"; export function buildRouteGraph(files:IndexedFile[]){return files.filter(f=>/route|page/.test(f.path)).map(f=>({routeFile:f.path}));}

EOF

mkdir -p "$(dirname 'packages/workspace-indexer/src/SemanticIndexer.ts')"
cat > 'packages/workspace-indexer/src/SemanticIndexer.ts' <<'EOF'
import { FileIndexer } from "./FileIndexer";
import { buildDependencyGraph } from "./DependencyGraphBuilder";
import { buildRouteGraph } from "./RouteGraphBuilder";
import { buildModuleGraph } from "./ModuleGraphBuilder";
import { buildFileRelationshipGraph } from "./FileRelationshipGraphBuilder";
const semanticStore=new Map<string,any>();
export class SemanticIndexer{
  build(projectId:string,workspaceRoot:string){const files=new FileIndexer().indexDir(workspaceRoot); const artifact={projectId,builtAt:new Date().toISOString(),files,dependencyGraph:buildDependencyGraph(files),routeGraph:buildRouteGraph(files),moduleGraph:buildModuleGraph(files),fileRelationshipGraph:buildFileRelationshipGraph(files)}; semanticStore.set(projectId,artifact); return artifact;}
  get(projectId:string){return semanticStore.get(projectId);}
}

EOF

mkdir -p "$(dirname 'packages/workspace-indexer/src/index.ts')"
cat > 'packages/workspace-indexer/src/index.ts' <<'EOF'
export * from "./FileIndexer"; export * from "./SemanticIndexer"; export * from "./IncrementalUpdateEngine";

EOF

mkdir -p "$(dirname 'packages/workspace-indexer/src/summaries/FileSummarizer.ts')"
cat > 'packages/workspace-indexer/src/summaries/FileSummarizer.ts' <<'EOF'
export function summarizeFile(content:string):string{return content.split("\n").slice(0,12).join("\n");}

EOF

mkdir -p "$(dirname 'packages/workspace-indexer/src/summaries/ModuleResponsibilitySummarizer.ts')"
cat > 'packages/workspace-indexer/src/summaries/ModuleResponsibilitySummarizer.ts' <<'EOF'
export function summarizeModuleResponsibility(path:string){if(/route|page/.test(path)) return "route/page module"; if(/store/.test(path)) return "state module"; if(/service/.test(path)) return "service module"; return "application module";}

EOF
