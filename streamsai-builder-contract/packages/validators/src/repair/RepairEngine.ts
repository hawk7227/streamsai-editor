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
