import { EmbeddingStore } from "./EmbeddingStore";
export class VectorSearch{constructor(private readonly store=new EmbeddingStore()){} search(query:string,topK=5){return this.store.list().map(r=>({...r,score:overlap(query,r.text)})).sort((a,b)=>b.score-a.score).slice(0,topK);}}
function overlap(a:string,b:string){const aa=new Set(a.toLowerCase().split(/\W+/)); const bb=new Set(b.toLowerCase().split(/\W+/)); return [...aa].filter(x=>bb.has(x)).length;}
