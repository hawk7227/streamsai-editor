const locks=new Map<string,{owner:string;acquiredAt:string}>();
export class LockCoordinator{
  acquire(path:string,owner:string){const existing=locks.get(path); if(existing&&existing.owner!==owner) return {ok:false as const,existing}; const lock={owner,acquiredAt:new Date().toISOString()}; locks.set(path,lock); return {ok:true as const,lock};}
  release(path:string,owner:string){const existing=locks.get(path); if(existing?.owner===owner) locks.delete(path); return !locks.has(path);}
}
