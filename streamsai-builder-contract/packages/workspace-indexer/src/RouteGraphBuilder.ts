import type { IndexedFile } from "./FileIndexer"; export function buildRouteGraph(files:IndexedFile[]){return files.filter(f=>/route|page/.test(f.path)).map(f=>({routeFile:f.path}));}
