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
