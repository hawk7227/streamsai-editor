export function detectConflict(currentChecksum?:string,incomingChecksum?:string){return Boolean(currentChecksum&&incomingChecksum&&currentChecksum!==incomingChecksum);}
