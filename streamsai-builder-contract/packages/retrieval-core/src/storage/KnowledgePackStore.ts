type KnowledgePack={id:string;version:string;schemaVersion:string;source:string;scope:string;documents:Array<{id:string;title:string;content:string;tags?:string[]}>};
const packs=new Map<string,KnowledgePack>();
export class KnowledgePackStore{put(pack:KnowledgePack){packs.set(pack.id,pack); return pack;} list(){return [...packs.values()];}}
