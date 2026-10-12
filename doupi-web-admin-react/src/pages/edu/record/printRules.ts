import type {PrintCandidate} from './chatPrefill';
const area:Record<string,number>={A4:210*297,A3:297*420,'8K':260*370,'16K':195*270};
export function convertPages(pages:number|undefined,source:string|undefined,target:string) {
  if(!pages || !source || !area[source] || !area[target]) return pages;
  if(area[target]>=area[source]*1.5) return Math.ceil(pages/2);
  if(area[source]>=area[target]*1.5) return pages*2;
  return pages;
}
export function derivePrintFields(task:PrintCandidate,current:Record<string,unknown>={},manual:ReadonlySet<string>=new Set()) {
  const original=task.sourcePageCount ?? task.pageCount ?? undefined;
  const paperType=manual.has('paperType') ? current.paperType as string : task.paperType || (task.sourcePaperType==='A4' && original===1?'16K':'8K');
  const pageCount=manual.has('pageCount') ? current.pageCount as number|undefined : convertPages(task.pageCount ?? original,task.sourcePaperType,paperType);
  const printSide=manual.has('printSide') ? current.printSide as string|undefined : task.printSide || (pageCount && pageCount>0 ? pageCount===1?'1':'2' : undefined);
  return {paperType,pageCount,printSide};
}
