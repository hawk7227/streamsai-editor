import type { IndexedFile } from "./FileIndexer"; export function buildFileRelationshipGraph(files:IndexedFile[]){return files.flatMap(f=>f.imports.map(i=>({source:f.path,target:i})));}
