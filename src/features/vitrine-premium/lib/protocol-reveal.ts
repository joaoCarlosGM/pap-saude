import type {SourceNode} from './protocol-flow'

export type FlowFrame = {kind:'node';id:string} | {kind:'edge';from:string;to:string}
export type FlowPlayback = 'idle'|'playing'|'paused'|'complete'
export const frameDuration = 300
export const edgeKey = (from:string,to:string) => `${from}:${to}`

/** Visit each node once, retaining branch edges and their returns. */
export function flowFrames(nodes: readonly SourceNode[]): FlowFrame[] {
  const frames: FlowFrame[] = []
  const visited = new Set<string>()
  const byId = new Map(nodes.map(node=>[node.id,node]))
  const reveal = (id:string) => {
    if (!visited.has(id) && byId.has(id)) {
      visited.add(id)
      frames.push({kind:'node',id})
    }
  }
  for (const node of nodes) {
    reveal(node.id)
    for (const edge of node.next) {
      if (!byId.has(edge.id)) continue
      frames.push({kind:'edge',from:node.id,to:edge.id})
      reveal(edge.id)
    }
  }
  return frames
}

export function visibleFlow(frames:readonly FlowFrame[],count:number) {
  const nodes = new Set<string>()
  const edges = new Set<string>()
  for (const frame of frames.slice(0,count)) {
    if (frame.kind==='node') nodes.add(frame.id)
    else edges.add(edgeKey(frame.from,frame.to))
  }
  return {nodes,edges}
}
