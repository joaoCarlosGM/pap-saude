'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {initialCourseProgress,completeDemoLesson,type DemoCourseProgress} from './data';
type Value={state:Record<string,DemoCourseProgress>;complete:(id:string,lesson:string,answer?:number)=>void;visit:(id:string,lesson:string)=>void};
const Context=createContext<Value|null>(null);
export function CourseMemory({children}:{children:React.ReactNode}){const [state,setState]=useState(initialCourseProgress);useEffect(()=>{const reset=()=>setState(initialCourseProgress());window.addEventListener('pap:vitrine-reset',reset);return()=>window.removeEventListener('pap:vitrine-reset',reset);},[]);return <Context.Provider value={{state,complete:(id,lesson,answer)=>setState(s=>completeDemoLesson(s,id,lesson,answer)),visit:(id,lesson)=>setState(s=>({...s,[id]:{completed:s[id]?.completed||[],lastLesson:lesson}}))}}>{children}</Context.Provider>;}
export function useCourseMemory(){const value=useContext(Context);if(!value)throw Error('Synthetic course context required');return value;}
