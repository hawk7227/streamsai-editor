import { FileIndexer } from "./FileIndexer";
import { buildDependencyGraph } from "./DependencyGraphBuilder";
import { buildRouteGraph } from "./RouteGraphBuilder";
import { buildModuleGraph } from "./ModuleGraphBuilder";
import { buildFileRelationshipGraph } from "./FileRelationshipGraphBuilder";
const semanticStore=new Map<string,any>();
export class SemanticIndexer{
  build(projectId:string,workspaceRoot:string){const files=new FileIndexer().indexDir(workspaceRoot); const artifact={projectId,builtAt:new Date().toISOString(),files,dependencyGraph:buildDependencyGraph(files),routeGraph:buildRouteGraph(files),moduleGraph:buildModuleGraph(files),fileRelationshipGraph:buildFileRelationshipGraph(files)}; semanticStore.set(projectId,artifact); return artifact;}
  get(projectId:string){return semanticStore.get(projectId);}
}
