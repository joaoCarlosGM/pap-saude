import {z} from 'zod'

const text=z.string().trim().min(1).max(800)
export const protocolTabs=[
 {id:'visao-geral',label:'Visão geral'}, {id:'fluxograma',label:'Fluxograma'},
 {id:'checklist',label:'Checklist'}, {id:'documento-original',label:'Documento original'},
] as const
export type ProtocolTab=typeof protocolTabs[number]['id']
export const demoProtocolSchema=z.object({
 slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(96), title:text, summary:text,
 theme:text, category:text, origin:text, codes:z.array(text).min(1), version:text,
 identificationNote:text.optional(), reportedIssuedAt:z.iso.date().optional(), reportedReviewDue:z.iso.date().optional(),
 status:z.literal('IN_REVIEW'), keywords:z.array(text),
 document:z.object({availability:z.literal('MISSING'),originalFilename:text,expectedSha256:z.string().regex(/^[a-f0-9]{64}$/),reportedPageCount:z.number().int().positive()}).strict(),
 sections:z.array(z.object({id:text,title:text,description:text}).strict()).min(1),
 flowReference:text,
 flow:z.array(z.object({id:text,label:text,description:text}).strict()).min(1),
 checklist:z.array(z.object({id:text,title:text,items:z.array(z.object({id:text,label:text}).strict()).min(1)}).strict()).min(1),
}).strict().superRefine((p,ctx)=>{
 for(const ids of [p.sections.map(s=>s.id),p.flow.map(s=>s.id),p.checklist.map(s=>s.id),p.checklist.flatMap(g=>g.items.map(i=>i.id))]){
  if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',message:'Identificadores duplicados no documento demonstrativo'})
 }
})
export type DemoProtocol=z.infer<typeof demoProtocolSchema>
const flow=[
 {id:'identificar',label:'Identificar a referência',description:'Conhecer o título e o tema informado.'},
 {id:'procedencia',label:'Conferir a procedência',description:'Observar origem, versão e pendências documentais.'},
 {id:'revisao',label:'Reconhecer os limites',description:'Conteúdo estruturado e uso clínico ainda em revisão.'},
 {id:'fonte',label:'Consultar a fonte',description:'Aguardando PDF original e autorização de uso.'},
]
const checklist=[
 {id:'documento',title:'Documento e procedência',items:[
  {id:'titulo',label:'Li o título e o tema desta referência.'},
  {id:'origem',label:'Identifiquei a origem e a versão informadas.'},
  {id:'pendencias',label:'Li as pendências de conferência documental.'},
 ]},
 {id:'limites',title:'Limites da demonstração',items:[
  {id:'demonstracao',label:'Reconheci que este roteiro é apenas demonstrativo.'},
  {id:'pdf',label:'Identifiquei que o PDF original ainda não está disponível.'},
  {id:'homologacao',label:'Li o aviso de que não há conteúdo assistencial homologado.'},
 ]},
]
const common={category:'Obstetrícia',origin:'Unidade da Mulher • HU-UFGD',status:'IN_REVIEW' as const,flow,checklist}
export const demoProtocols:readonly DemoProtocol[]=z.array(demoProtocolSchema).parse([
 {...common,slug:'sindromes-hipertensivas-gestacao',title:'Síndromes hipertensivas na gestação',theme:'Síndromes hipertensivas',
  summary:'Referência documental sobre síndromes hipertensivas no contexto de origem. Conteúdo aguardando conferência e revisão clínica.',
  codes:['PRT.UMUL.012'],version:'01',reportedIssuedAt:'2026-02-02',reportedReviewDue:'2028-02-02',keywords:['pré-eclâmpsia','hipertensão','HELLP','eclâmpsia'],
  document:{availability:'MISSING',originalFilename:'Pré eclampsia.pdf',expectedSha256:'63a0dc9b93bc3be45632bcf46649c92d7118884135ac2ff8a95aa565830804d1',reportedPageCount:25},
  sections:[
   {id:'escopo',title:'Definições e classificação',description:'Área reservada à organização das definições do documento. Critérios diagnósticos não são apresentados nesta etapa.'},
   {id:'prevencao',title:'Fatores de risco e prevenção',description:'Tópico de leitura informado na especificação. A apresentação de recomendações depende da revisão da fonte original.'},
   {id:'acompanhamento',title:'Temas de acompanhamento',description:'Conteúdo estruturado sobre os quadros descritos na fonte será incluído somente após curadoria clínica.'},
   {id:'referencias',title:'Referências de consulta',description:'Checklist, kit e monitoramento são seções indicadas para futura conferência, sem ativação de ferramentas assistenciais.'},
  ],flowReference:'Seção de fluxograma informada na página impressa 22; posição digital e conteúdo ainda não conferidos.'},
 {...common,slug:'hemorragia-pos-parto',title:'Prevenção e manejo da hemorragia pós-parto',theme:'Hemorragia pós-parto',
  summary:'Referência documental sobre hemorragia pós-parto. Esta apresentação organiza a consulta, sem orientar manejo clínico.',
  codes:['PRT.UMUL.003'],version:'03',reportedIssuedAt:'2026-09-21',reportedReviewDue:'2028-09-21',keywords:['HPP','hemorragia','puerpério'],
  document:{availability:'MISSING',originalFilename:'Hpp.pdf',expectedSha256:'f48c79881152eae50e25ebaf8d354f1219db7c8dd9d5c41b8cfb8ff2360337d2',reportedPageCount:34},
  sections:[
   {id:'escopo',title:'Escopo do documento',description:'A fonte informada aborda prevenção e manejo no contexto institucional de origem. Sua aplicabilidade não foi homologada nesta plataforma.'},
   {id:'responsabilidades',title:'Responsabilidades',description:'Seção prevista para consulta após validação do documento. Nenhuma atribuição profissional é definida por esta demonstração.'},
   {id:'organizacao',title:'Organização da referência',description:'Etiologia, prevenção e seguimento são tópicos documentais informados, aguardando conferência com o PDF.'},
   {id:'referencias',title:'Referências de consulta',description:'Fluxograma, kit e documentação dependem da revisão da fonte; não há sequência de intervenção nesta página.'},
  ],flowReference:'Seção 12 de fluxograma informada na página impressa 32; posição digital e conteúdo ainda não conferidos.'},
 {...common,slug:'sepse-obstetrica',title:'Protocolo de sepse em pacientes obstétricas',theme:'Sepse obstétrica',origin:'HUAB-UFRN / EBSERH',
  summary:'Referência documental sobre sepse no contexto obstétrico. Identificação e conteúdo aguardam validação documental e clínica.',
  codes:['PRT.UPS.007','PRT.DMED.013'],version:'2 (2025)',identificationNote:'Capa e cabeçalho informam códigos diferentes. Identificador documental a confirmar.',keywords:['sepse','infecção','obstetrícia'],
  document:{availability:'MISSING',originalFilename:'Sepse.pdf',expectedSha256:'5d4e5756b397ade0adc829cca8336eec86db14e955c22a528fa533a9a75f093b',reportedPageCount:36},
  sections:[
   {id:'escopo',title:'Objetivos e escopo',description:'Área destinada à descrição do contexto do documento após revisão. Não apresenta critérios de suspeição ou diagnóstico.'},
   {id:'criterios',title:'Critérios e responsabilidades',description:'Inclusão, exclusão e responsabilidades são tópicos indicados na fonte, ainda sem conteúdo clínico conferido.'},
   {id:'organizacao',title:'Organização da consulta',description:'Kit, plano terapêutico e monitoramento aparecem como referências documentais; não são recomendações desta demonstração.'},
   {id:'identificacao',title:'Conferência documental',description:'Há divergência de códigos e paginação informada. Não é feita equivalência entre ferramentas de classificação ou escores.'},
  ],flowReference:'Seção 7, fluxo de processo, indicada no índice impresso 9. O arquivo informado teria 36 páginas digitais; posição e conteúdo não conferidos.'},
])
export type ProtocolFilters={query:string;theme:string;origin:string;version:string}
export const emptyProtocolFilters:ProtocolFilters={query:'',theme:'',origin:'',version:''}
const normalize=(text:string)=>text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
export function filterProtocols(entries:readonly DemoProtocol[],filters:ProtocolFilters){
 const query=normalize(filters.query)
 return entries.filter(p=> (!filters.theme||p.theme===filters.theme)&&(!filters.origin||p.origin===filters.origin)&&(!filters.version||p.version===filters.version)&&(!query||normalize([p.title,p.summary,p.category,p.theme,p.origin,p.version,...p.codes,...p.keywords].join(' ')).includes(query)))
}
export type ProtocolLocation={view:'library'}|{view:'detail';slug:string;tab:ProtocolTab;page?:number}
export function parseProtocolLocation(search:Record<string,string|string[]|undefined>,entries:readonly DemoProtocol[]=demoProtocols):ProtocolLocation|null{
 if(Object.keys(search).some(k=>!['protocolo','aba','pagina'].includes(k)))return null
 if(!Object.keys(search).length)return {view:'library'}
 if(typeof search.protocolo!=='string'||!entries.some(p=>p.slug===search.protocolo))return null
 const tab=search.aba===undefined?'visao-geral':search.aba
 if(typeof tab!=='string'||!protocolTabs.some(t=>t.id===tab))return null
 const page=search.pagina;
 if(page!==undefined&&(typeof page!=='string'||tab!=='documento-original'||!/^([1-9]\d*)$/.test(page)||Number(page)>entries.find(p=>p.slug===search.protocolo)!.document.reportedPageCount))return null
 return {view:'detail',slug:search.protocolo,tab:tab as ProtocolTab,...(page!==undefined?{page:Number(page)}:{})}
}
export function protocolHref(slug:string,tab:ProtocolTab='visao-geral',page?:number){
 return '/vitrine/protocolos?'+new URLSearchParams({protocolo:slug,aba:tab,...(page!==undefined&&tab==='documento-original'?{pagina:String(page)}:{})}).toString()
}
export const reportedDate=(value?:string)=>value?value.split('-').reverse().join('/'):'Não informada'
