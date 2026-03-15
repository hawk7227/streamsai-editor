import type { IndexedFile } from "./FileIndexer"; export function buildDependencyGraph(files:IndexedFile[]){return files.flatMap(f=>f.imports.map(i=>({from:f.path,to:i})));}
