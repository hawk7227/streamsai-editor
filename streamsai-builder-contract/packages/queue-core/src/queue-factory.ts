import { createQueue } from "./bullmq"; export function queueFactory(name:string){return createQueue(name);}
