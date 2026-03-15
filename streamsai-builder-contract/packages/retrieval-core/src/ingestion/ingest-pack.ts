import fs from "node:fs";
import { chunkText } from "./chunker";
import { KnowledgePackStore } from "../storage/KnowledgePackStore";
import { EmbeddingStore } from "../storage/EmbeddingStore";
import { currentEmbeddingModelVersion } from "./embedding-lifecycle";
export async function ingestKnowledgePack(filePath:string){
  const raw=JSON.parse(fs.readFileSync(filePath,"utf8"));
  const packStore=new KnowledgePackStore(); const vectorStore=new EmbeddingStore();
  packStore.put(raw);
  const embeddingModel=currentEmbeddingModelVersion();
  for(const doc of raw.documents){ for(const [idx,chunk] of chunkText(doc.content).entries()){const key=`${raw.id}:${doc.id}:${idx}`; vectorStore.put({key,embeddingModel,packVersion:raw.version,vector:[chunk.length%17,chunk.length%29,chunk.length%43],text:`${doc.title}\n${chunk}`});}}
  return {packId:raw.id,embeddingModel,chunks:vectorStore.list().length};
}
