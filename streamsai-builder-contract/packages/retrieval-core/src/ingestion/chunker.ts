export function chunkText(content:string,maxChars=1200){const chunks:string[]=[]; for(let i=0;i<content.length;i+=maxChars) chunks.push(content.slice(i,i+maxChars)); return chunks;}
