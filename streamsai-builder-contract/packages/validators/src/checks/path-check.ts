export const runPathCheck=(path:string)=>path.includes('..')?['relative parent path not allowed']:[];
