import { VectorSearch } from "../storage/VectorSearch"; export function searchKnowledge(query:string,topK=5){return new VectorSearch().search(query,topK);}
