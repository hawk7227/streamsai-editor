import { Queue, Worker, QueueEvents } from "bullmq";
import { getRedisUrl } from "./redis";
export function createQueue(name:string){return new Queue(name,{connection:{url:getRedisUrl()} as any});}
export function createQueueEvents(name:string){return new QueueEvents(name,{connection:{url:getRedisUrl()} as any});}
export function createWorker(name:string,processor:any,concurrency=1){return new Worker(name,processor,{concurrency,connection:{url:getRedisUrl()} as any});}
