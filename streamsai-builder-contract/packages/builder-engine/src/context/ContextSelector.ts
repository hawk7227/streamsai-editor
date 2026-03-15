export class ContextSelector{ select(indexArtifact:any,memorySummary:string,query:string){ return {memorySummary,topFiles:(indexArtifact?.files??[]).slice(0,8),query}; }}
