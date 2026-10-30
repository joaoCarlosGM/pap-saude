"use client";
import {usePathname} from "next/navigation";
import SectionHero from "./SectionHero";
const sections:Record<string,[string,string]>={dashboard:["Visão geral","dashboard"],registro:["Registro","registro"],atendimentos:["Atendimentos","atendimentos"],pacientes:["Pacientes","pacientes"],protocolos:["Protocolos","protocolos"],ferramentas:["Ferramentas","ferramentas"],chat:["Chat IA","chat"],cursos:["Cursos","cursos"],aprender:["Seu aprendizado","cursos"],notificacoes:["Avisos","avisos"],configuracoes:["Configurações","configuracoes"]};
export default function RouteHero({demo=false,admin=false}:{demo?:boolean;admin?:boolean}){
 const path=usePathname(), parts=path.split('/').filter(Boolean), key=parts[0]==='vitrine'?(parts[1]||'dashboard'):parts[0];
 const info=admin?([parts[1]==='rede'?"Rede de Saúde":parts[1]==='manager'?(parts[2]==='cursos'?"Autoria de cursos":parts[2]==='materiais'?"Biblioteca de materiais":parts[2]==='municipios'?"Inclusão de município":parts[2]==='distribuicao'?"Distribuição institucional":"Bancada de gestão"):"Gestão institucional",parts[1]==='rede'?(parts[2]?'admin-unidade':'admin-rede'):'admin-municipio'] as const):sections[key];
 if(!info)return null;
 return <SectionHero headingAs="p" title={info[0]} visual={info[1]} variant={admin?'admin':'clinical'} subtitle={demo?"Ambiente demonstrativo — informações inteiramente fictícias.":admin?"Gestão institucional dentro das suas permissões. Dados clínicos não são exibidos aqui.":"Seu espaço de trabalho, com informações autorizadas da sua unidade."}/>;
}
