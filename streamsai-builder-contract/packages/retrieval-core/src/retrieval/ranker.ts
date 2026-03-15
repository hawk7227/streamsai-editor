export function rankResults<T extends {score:number}>(items:T[]){return [...items].sort((a,b)=>b.score-a.score);}
