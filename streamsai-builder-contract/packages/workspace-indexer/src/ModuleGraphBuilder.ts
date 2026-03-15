import type { IndexedFile } from "./FileIndexer"; export function buildModuleGraph(files:IndexedFile[]){return files.map(f=>({file:f.path,exports:f.exports}));}
