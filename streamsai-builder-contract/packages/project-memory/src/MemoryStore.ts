type MemoryEntry={key:string;value:unknown;durable:boolean;createdAt:string;updatedAt:string};
const store=new Map<string,MemoryEntry[]>();
export class MemoryStore{
  list(projectId:string){return store.get(projectId)??[];}
  get(projectId:string,key:string){return this.list(projectId).find(e=>e.key===key);}
  put(projectId:string,key:string,value:unknown,durable=true){const entries=this.list(projectId).filter(e=>e.key!==key);const now=new Date().toISOString();entries.push({key,value,durable,createdAt:now,updatedAt:now});store.set(projectId,entries);return entries[entries.length-1];}
}
