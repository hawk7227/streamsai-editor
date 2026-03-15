export type TaskType="feature_creation"|"feature_modification"|"bug_fix"|"refactor"|"schema_update"|"route_update"|"validation_only"|"repair_only";
export type FileActionType="create"|"update"|"replace"|"delete"|"move";
export type FileAction={type:FileActionType;path:string;content?:string;newPath?:string;reason?:string};
export type ValidationIssue={code:string;severity:"info"|"warning"|"error";message:string;path?:string};
export type StageResult<T=unknown>={stage:string;ok:boolean;startedAt:string;finishedAt?:string;data?:T;error?:string};
export type PipelineFinalResult={runId:string;checkpointId?:string;explanation:string;plan:string[];fileActions:FileAction[];validation:ValidationIssue[];repairs:string[];auditRefs:string[]};
