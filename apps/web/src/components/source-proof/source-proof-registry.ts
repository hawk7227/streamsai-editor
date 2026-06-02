export type RouteProof = {
  route: string;
  files: string[];
};

export type ButtonProof = {
  button: string;
  route: string;
  handler: string;
  api: string[];
  backend: string[];
  data: string[];
  proof: string;
};

export const routeRegistry: RouteProof[] = [
  {
    route: "/admingeneration",
    files: [
      "src/app/admingeneration/page.jsx",
      "src/app/admingeneration/OriginalAdmingenerationPage.jsx",
      "components/streams/opus-frame/AdminGenerationRuntimeGuard.jsx",
      "components/streams/opus-frame/OpusLockedFrame.jsx",
    ],
  },
  {
    route: "/admingeneration/editor",
    files: [
      "src/app/admingeneration/editor/page.jsx",
      "src/components/admingeneration/FullOutputEditorClient.jsx",
    ],
  },
  {
    route: "/studio",
    files: [
      "apps/web/src/app/studio/page.tsx",
      "apps/web/src/components/source-proof/SourceProofGate.tsx",
      "apps/web/src/components/source-proof/source-proof-registry.ts",
    ],
  },
];

export const buttonRegistry: ButtonProof[] = [
  {
    button: "Generate",
    route: "/admingeneration",
    handler: "handleGenerate",
    api: ["/api/admingeneration/submit", "/api/admingeneration/routed-submit-v2"],
    backend: [
      "src/app/api/admingeneration/submit/route.ts",
      "src/app/api/admingeneration/routed-submit-v2/route.ts",
    ],
    data: ["admingeneration_provider_runs", "admingeneration_versions"],
    proof: "pnpm build + curl generation route",
  },
  {
    button: "Load Analysis",
    route: "/admingeneration/editor",
    handler: "loadAnalysis",
    api: [
      "/api/admingeneration/reference/analyze/[id]/intelligence",
      "/api/admingeneration/editor/from-analysis",
      "/api/admingeneration/editor/projects/[id]/timeline",
    ],
    backend: [
      "src/app/api/admingeneration/reference/analyze/[id]/intelligence/route.ts",
      "src/app/api/admingeneration/editor/from-analysis/route.ts",
      "src/app/api/admingeneration/editor/projects/[id]/timeline/route.ts",
    ],
    data: ["admingeneration_analyses", "admingeneration_timeline_segments"],
    proof: "pnpm build + curl timeline route",
  },
  {
    button: "Transcription",
    route: "/admingeneration/editor",
    handler: "runTranscriptionForCurrentVideo",
    api: [
      "/api/admingeneration/editor/projects/[id]/transcribe-source",
      "/api/pipeline-test/transcript/transcribe",
    ],
    backend: [
      "src/app/api/admingeneration/editor/projects/[id]/transcribe-source/route.ts",
      "src/app/api/pipeline-test/transcript/transcribe/route.ts",
    ],
    data: ["admingeneration_transcript_words"],
    proof: "pnpm build + curl transcribe-source route",
  },
  {
    button: "Export",
    route: "/admingeneration/editor",
    handler: "exportFinal",
    api: ["/api/admingeneration/editor/projects/[id]/export-final"],
    backend: ["src/app/api/admingeneration/editor/projects/[id]/export-final/route.ts"],
    data: ["admingeneration_stitch_jobs", "admingeneration_exports"],
    proof: "pnpm build + curl export-final route",
  },
];
