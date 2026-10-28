import type { DemoContent, DemoSection } from "@/lib/demo/types";
/** Deliberately independent of every database, clinical service and integration.
 * Only fictional identifiers; each call returns a fresh, unshared object graph.
 */
const patients = [
    { id: "demo-patient-aurora", name: "Paciente Demo Aurora", age: 29, gestationalAge: "18 semanas", note: "Personagem fictícia para apresentar o acompanhamento." },
    { id: "demo-patient-iara", name: "Paciente Demo Iara", age: 34, gestationalAge: "32 semanas", note: "Personagem fictícia para apresentar uma linha de cuidado." },
    { id: "demo-patient-vitoria", name: "Paciente Demo Vitória", age: 25, gestationalAge: "28 semanas", note: "Personagem fictícia para apresentar um retorno." },
];
const content: Omit<DemoContent, "section"> = {
    mode: "DEMO", scope: "SYNTHETIC", patients,
    records:Object.fromEntries(patients.map((p,i)=>[p.id,{
      patient:{id:p.id,fullName:p.name,socialName:null,birthDate:`${2026-p.age}-01-01`,cpf:null,cns:null,phone:null},
      pregnancies:[{id:`demo-pregnancy-${i}`,status:"ACTIVE",lastMenstrualDate:"2026-06-01",estimatedDueDate:"2027-03-08"}],
      encounters:[{id:`demo-encounter-${i}`,status:"COMPLETED",occurredAt:"2026-10-01T09:00:00.000Z",chiefComplaint:"Acompanhamento fictício · sem validade clínica"}],
      allergies:[],flags:[],revisions:[{id:`demo-revision-${i}`,resourceType:"VITAL_SIGNS",reason:"Exemplo fictício de proposta não aplicada. Nenhuma alteração clínica ocorreu.",occurredAt:"2026-10-01T09:00:00.000Z"}],
    }])) ,
    dashboard: {
        kpis: [
            { id: "demo-kpi-patients", title: "Pacientes simuladas", value: "3", description: "Personagens deste cenário", icon: "users", tone: "pink" },
            { id: "demo-kpi-visits", title: "Atendimentos fictícios", value: "3", description: "Exemplos, sem validade clínica", icon: "clipboard", tone: "blue" },
            { id: "demo-kpi-courses", title: "Cursos demonstrativos", value: "3", description: "Conteúdos inteiramente fictícios", icon: "calendar", tone: "emerald" },
            { id: "demo-kpi-tools", title: "Ferramentas de exemplo", value: "2", description: "Simulações sem integração", icon: "activity", tone: "violet" },
        ],
        monthly: ["Mai", "Jun", "Jul", "Ago", "Set", "Out"].map((month, i) => ({ month, total: i < 3 ? 0 : 1 })),
        risks: [{ label: "Baixo risco (demo)", value: 1, type: "low" }, { label: "Atenção (demo)", value: 1, type: "attention" }, { label: "Urgência (demo)", value: 1, type: "urgent" }],
        recent: patients.map((p, i) => ({ id: `demo-visit-${i + 1}`, patient: p.name, initials: ["DA", "DI", "DV"][i], gestationalAge: p.gestationalAge, professional: "Equipe demonstrativa", time: ["09:00", "10:00", "11:00"][i], score: [0, 2, 5][i], classification: (["BAIXO_RISCO", "ATENCAO", "URGENCIA"] as const)[i] })),
        deliveries: patients.map((p, i) => ({ id: `demo-delivery-${i + 1}`, patient: p.name, gestationalAge: p.gestationalAge, dpp: ["20/03/2027", "12/12/2026", "09/01/2027"][i], remainingDays: [147, 49, 77][i] })),
    },
    courses: [
        { id: "demo-course-care", title: "Jornada do cuidado · Demo", description: "Uma apresentação fictícia de como organizar uma trilha de aprendizagem em equipe.", category: "PRE_NATAL", durationMinutes: 35, lessons: 4, progress: 0, status: "NOT_STARTED" },
        { id: "demo-course-safety", title: "Cultura de segurança · Demo", description: "Conteúdo ilustrativo, sem certificação, matrícula ou recomendação clínica.", category: "SEGURANCA", durationMinutes: 25, lessons: 4, progress: 0, status: "NOT_STARTED" },
        { id: "demo-course-team", title: "Protocolos em equipe · Demo", description: "Um exemplo de capacitação para explorar a experiência do PAP Saúde.", category: "PROTOCOLOS", durationMinutes: 40, lessons: 4, progress: 0, status: "NOT_STARTED" },
    ],
    protocols: [
        { id: "demo-protocol-care", title: "Fluxo de acolhimento · Demo", description: "Exemplo visual de um protocolo, sem instruções clínicas ou validade assistencial.", uploadDate: "2026-10-01", fileName: "exemplo-demonstrativo" },
        { id: "demo-protocol-return", title: "Organização do retorno · Demo", description: "Documento fictício para demonstrar a consulta de conteúdos da equipe.", uploadDate: "2026-10-01", fileName: "exemplo-demonstrativo" },
    ],
    tools: [
        { id: "demo-tool-calendar", title: "Calendário gestacional · Demo", description: "Conheça a apresentação de um cálculo por meio de um cenário fixo e fictício.", status: "AVAILABLE", icon: "calendar-days" },
        { id: "demo-tool-summary", title: "Resumo do acompanhamento · Demo", description: "Explore um resumo ilustrativo. Nenhuma consulta ou integração é executada.", status: "AVAILABLE", icon: "heart-pulse" },
    ],
};
export function demoContent(section: DemoSection): DemoContent {
    return structuredClone({ ...content, section });
}
export function simulateDemoRegistration(patientId: unknown, kind: unknown) {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || typeof kind !== "string" || !["PRE_NATAL", "RETORNO"].includes(kind))
        throw new Error("INVALID_DEMO_INPUT");
    return { mode: "DEMO", simulated: true, persisted: false, patient: patient.name, message: "Simulação concluída. Nenhum registro foi salvo." };
}
