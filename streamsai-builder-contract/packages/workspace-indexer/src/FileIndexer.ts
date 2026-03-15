import fs from "node:fs"; import path from "node:path";
export type IndexedFile={path:string;summary:string;imports:string[];exports:string[]};
export class FileIndexer{
  indexDir(root:string):IndexedFile[]{const results:IndexedFile[]=[]; const walk=(dir:string)=>{for(const name of fs.readdirSync(dir)){const full=path.join(dir,name); const stat=fs.statSync(full); if(stat.isDirectory()) walk(full); else if(/\.(ts|tsx|js|jsx|json)$/.test(name)){const content=fs.readFileSync(full,"utf8"); const imports=[...content.matchAll(/from\s+["']([^"']+)["']/g)].map(m=>m[1]); const exports=[...content.matchAll(/export\s+(?:default\s+)?(?:function|const|class)?\s*([A-Za-z0-9_]+)/g)].map(m=>m[1]).filter(Boolean); results.push({path:full,summary:content.slice(0,200),imports,exports});}}}; walk(root); return results;}
}
