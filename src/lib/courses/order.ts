/** Explicit stable order; identifiers/content are never rewritten during moves. */
export function moveCourseItem<T>(items:readonly T[],index:number,delta:-1|1):T[]{const next=[...items],target=index+delta;if(!Number.isInteger(index)||index<0||index>=items.length||target<0||target>=items.length)return next;[next[index],next[target]]=[next[target],next[index]];return next;}
