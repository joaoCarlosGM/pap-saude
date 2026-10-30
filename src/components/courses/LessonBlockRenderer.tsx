"use client";
import Image from 'next/image';
import type {PublicLessonBlock} from '@/lib/courses/schema';
export default function LessonBlockRenderer({blocks,answers,onAnswer}:{blocks:PublicLessonBlock[];answers:Record<string,number|boolean>;onAnswer:(id:string,value:number|boolean)=>void}){
 return <div data-course-blocks className="space-y-6">{blocks.map(b=>{
  if(b.type==='heading')return <h3 key={b.id} className="text-2xl font-semibold">{b.text}</h3>;
  if(b.type==='text')return <p key={b.id} className="whitespace-pre-wrap leading-7">{b.text}</p>;
  if(b.type==='callout')return <aside key={b.id} className="rounded-xl border-l-4 border-pink-700 bg-pink-50 p-5 text-slate-800">{b.text}</aside>;
  if(b.type==='steps'||b.type==='timeline')return <ol key={b.id} className="list-inside list-decimal space-y-3">{b.items.map((item,index)=><li key={index}>{item}</li>)}</ol>;
  if(b.type==='accordion')return <details key={b.id} className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">{b.title}</summary><p className="mt-4 whitespace-pre-wrap">{b.text}</p></details>;
  if(b.type==='image')return <figure key={b.id}><Image unoptimized src={`/brand/thumbnails/${b.asset}.svg`} alt={b.alt} width={640} height={360} className="max-h-80 w-full rounded-xl object-contain"/></figure>;
  if(b.type==='checkpoint')return <fieldset key={b.id} className="rounded-xl border p-4"><legend className="px-2 font-semibold">{b.prompt}</legend>{[true,false].map(value=><label key={String(value)} className="flex gap-3 py-3"><input type="radio" name={'block-'+b.id} checked={answers[b.id]===value} onChange={()=>onAnswer(b.id,value)}/>{value?'Verdadeiro':'Falso'}</label>)}</fieldset>;
  if(b.type==='multipleChoice')return <fieldset key={b.id} className="rounded-xl border p-4"><legend className="px-2 font-semibold">{b.prompt}</legend>{b.options.map((option,index)=><label key={index} className="flex gap-3 py-3"><input type="radio" name={'block-'+b.id} checked={answers[b.id]===index} onChange={()=>onAnswer(b.id,index)}/>{option}</label>)}</fieldset>;
  return null;
 })}</div>;
}
