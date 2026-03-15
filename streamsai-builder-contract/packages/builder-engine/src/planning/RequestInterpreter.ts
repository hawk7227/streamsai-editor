export class RequestInterpreter{ interpret(message:string){ return {raw:message, normalized:message.trim(), intentHints:message.toLowerCase().split(/\W+/).filter(Boolean)}; }}
