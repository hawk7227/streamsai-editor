import { getEnv } from "@streamsai/config"; export const getRedisUrl=()=>getEnv("REDIS_URL","redis://localhost:6379");
