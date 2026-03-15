export async function *streamResponse(content:string){for(const chunk of content.match(/.{1,32}/g)??[]) yield chunk;}
