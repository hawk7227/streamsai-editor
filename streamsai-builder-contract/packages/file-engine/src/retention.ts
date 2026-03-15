export function shouldRetain(createdAtIso:string,retentionDays:number){const created=new Date(createdAtIso).getTime(); const cutoff=Date.now()-retentionDays*24*60*60*1000; return created>=cutoff;}
