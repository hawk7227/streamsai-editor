import { routeModel } from "./routing/model-router";
import { countApproxTokens } from "./token-usage/token-counter";
export type GatewayPrompt={purpose:"chat"|"planning"|"generation"|"repair"|"summary";messages:{role:"system"|"user"|"assistant";content:string}[];preferredProvider?:"openai"|"anthropic";stream?:boolean};
export async function generateViaGateway(prompt:GatewayPrompt){const provider=routeModel(prompt);const tokenEstimate=countApproxTokens(prompt.messages.map(m=>m.content).join("\n"));const joined=prompt.messages.map(m=>`[${m.role}] ${m.content}`).join("\n");return {provider:provider.provider,model:provider.model,tokenEstimate,content:joined};}
