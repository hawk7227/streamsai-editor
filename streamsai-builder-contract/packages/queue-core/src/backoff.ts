export function computeBackoff(attempt:number,delay=2000){return delay*Math.pow(2,Math.max(0,attempt-1));}
