export function buildHealth(service:string){return {ok:true as const,service,version:"0.1.0",now:new Date().toISOString()};}
