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
