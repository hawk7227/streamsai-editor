import { BuilderPipeline } from "@streamsai/builder-engine"; export async function generationProcessor(job:any){ return new BuilderPipeline().run(job.data); }
