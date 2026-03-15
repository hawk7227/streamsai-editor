import type { FileAction } from "@streamsai/shared"; export class FileActionPlanner{ normalize(actions:FileAction[]){ return actions.map(a=>({...a,reason:a.reason??"builder planned action"})); }}
