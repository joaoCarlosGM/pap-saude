"use client";
import PatientRecordView from "@/components/workspace/PatientRecordView";
import PatientCollection from "@/components/workspace/PatientCollection";
import EncounterCollection from "@/components/workspace/EncounterCollection";
import AiSparkIcon from "@/components/workspace/AiSparkIcon";
import DemoRegistrationWizard from "./DemoRegistrationWizard";
import { useState } from "react";
import Image from "next/image";
import CourseCard from "@/components/cursos/CourseCard";
import ProtocolCard from "@/components/protocolos/ProtocolCard";
import ToolCard from "@/components/ferramentas/ToolCard";
import CourseRecommendations from "@/components/dashboard/CourseRecommendations";
import DemoDialog from "./DemoDialog";
import type { DemoContent } from "@/lib/demo/types";
export default function DemoExplorer({ data }: {
    data: DemoContent;
}) {
    const [query, setQuery] = useState(""), [selected, setSelected] = useState<{
        title: string;
        text: string;
        courseId?: string;
        patientId?: string;
    } | null>(null);
    const [progress, setProgress] = useState<Record<string, number>>({});
    const [message, setMessage] = useState(""), [chat, setChat] = useState(false);
    const { section } = data;
    const titles = { dashboard: "Dashboard", pacientes: "Pacientes demonstrativas", atendimentos: "Atendimentos demonstrativos", registro: "Simular um registro", protocolos: "Protocolos demonstrativos", ferramentas: "Ferramentas demonstrativas", cursos: "Cursos demonstrativos", chat: "Chat IA · Exemplo de interface", ajuda: "Conheça a demonstração" };
    return <div className="demo-explorer"><header className="demo-section-title"><p className="workspace-eyebrow">PAP Saúde · Dados simulados</p><h1>{section==="chat"&&<AiSparkIcon/>}{titles[section]}</h1><p>Explore exemplos fictícios. Nenhuma informação de pacientes ou UBS reais é consultada.</p></header>
    {section === "pacientes" && <>
      <label className="demo-search">Buscar entre as personagens<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nome demonstrativo"/></label>
      <PatientCollection items={data.patients.filter(p=>p.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))).map(p=>({id:p.id,name:p.name,description:`${p.age} anos · ${p.gestationalAge}`,detail:p.note,active:true}))} onOpen={id=>{const p=data.patients.find(p=>p.id===id)!;setSelected({patientId:p.id,title:p.name,text:`${p.note} Identificador fictício: ${p.id}. Nenhuma pessoa real.`});}}/>

      {!data.patients.some(p => p.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))) && <div className="workspace-card" role="status">Nenhuma personagem encontrada. Experimente outro nome demonstrativo.</div>}
    </>}
    {section === "atendimentos" && <EncounterCollection items={data.dashboard.recent.map(v=>({id:v.id,title:"Acompanhamento demonstrativo",time:v.time,patient:v.patient,status:"DEMO · Sem validade clínica"}))} onOpen={id=>{const v=data.dashboard.recent.find(v=>v.id===id)!;setSelected({title:"Resumo demonstrativo",text:`${v.patient}: exemplo visual de um registro. Nenhum prontuário real é aberto ou atualizado.`});}}/>}
    {section === "registro" && <DemoRegistrationWizard patients={data.patients}/>}
    {section === "protocolos" && <><p className="demo-disclaimer">Documentos fictícios, sem arquivo clínico para download. Use Visualizar para conhecer a apresentação.</p><div className="demo-grid">{data.protocols.map(p => <ProtocolCard key={p.id} protocol={p} demo onPreview={p => setSelected({ title: p.title, text: `${p.description} Esta é uma composição ilustrativa de introdução, etapas e referências; nenhum protocolo assistencial é disponibilizado.` })}/>)}</div></>}
    {section === "ferramentas" && <div className="demo-grid">{data.tools.map(t => <ToolCard key={t.id} tool={t} onOpen={t => setSelected({ title: t.title, text: "Cenário fixo: personagem fictícia com acompanhamento demonstrativo. O resultado é apenas uma apresentação visual, sem executar cálculo clínico, consultar prontuários ou acionar integrações." })}/>)}</div>}
    {section === "cursos" && <><CourseRecommendations demo/><p className="demo-disclaimer">Popularidade, aulas e progresso são fictícios. Não há matrícula, vídeo externo ou certificado.</p><div className="demo-grid">{data.courses.map(c => <div className="demo-course" key={c.id}><Image src="/illustrations/pap-demo-learning.svg" width={360} height={240} alt=""/><CourseCard course={{ ...c, progress: progress[c.id] || 0, status: progress[c.id] ? "IN_PROGRESS" : "NOT_STARTED" }} onOpen={c => setSelected({ title: c.title, text: c.description, courseId: c.id })}/></div>)}</div></>}
    {section === "chat" && <section className="workspace-card"><h2>Uma conversa ilustrativa</h2><p>Este exemplo não usa inteligência artificial e não oferece orientação clínica.</p><button type="button" className="workspace-primary" onClick={() => setChat(true)}>Simular conversa</button>{chat && <div className="demo-chat" role="status"><p><strong>Pergunta de exemplo:</strong> Como a equipe encontra um resumo?</p><p><strong>Resposta fictícia:</strong> A apresentação reúne informações em cartões e ajuda a conhecer a navegação. Este texto é pré-definido; nenhuma IA foi consultada.</p></div>}<button type="button" className="workspace-secondary" onClick={() => setChat(false)}>Limpar exemplo</button></section>}
    {section === "ajuda" && <section className="workspace-card"><h2>Apresente com tranquilidade</h2><ol className="commercial-steps"><li><strong>Todos os dados são fictícios</strong><span>As personagens e os conteúdos não pertencem a pacientes ou instituições reais.</span></li><li><strong>Explore sem salvar</strong><span>Registros, aulas e conversas não alteram o atendimento real. Recarregar descarta as interações locais.</span></li><li><strong>Respeite os limites do perfil</strong><span>Alterar um endereço não libera acesso a prontuários ou funções administrativas.</span></li></ol><p>Para voltar ao trabalho comercial, use Voltar ao Comercial no cabeçalho.</p></section>}
    {selected && <DemoDialog title={selected.title} onClose={() => setSelected(null)}>{selected.patientId&&data.records[selected.patientId]?<PatientRecordView data={data.records[selected.patientId]} demo/>:<p>{selected.text}</p>}{selected.courseId && <button type="button" className="workspace-primary" onClick={() => { setProgress(p => ({ ...p, [selected.courseId!]: 25 })); setMessage("Aula simulada: progresso local de 25%. Nada foi salvo."); }}>Simular início da aula</button>}{selected.courseId && <p role="status">{message}</p>}</DemoDialog>}
  </div>;
}
