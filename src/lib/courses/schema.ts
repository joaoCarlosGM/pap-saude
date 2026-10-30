import {z} from 'zod';
const id=z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const courseThumbnails=['pre-natal','hipertensao-gestacao','acompanhamento','protocolos','seguranca-paciente','urgencias-obstetricas'] as const;
function schemas(allowEmpty:boolean){
 const text=allowEmpty?z.string().trim().max(4000):z.string().trim().min(1).max(4000);
 const options=z.array(allowEmpty?z.string().trim().max(500):z.string().trim().min(1).max(500)).min(2).max(6);
const lessonBlock=z.discriminatedUnion('type',[
 z.object({id,type:z.literal('heading'),text}).strict(),
 z.object({id,type:z.literal('text'),text}).strict(),
 z.object({id,type:z.literal('callout'),text}).strict(),
 z.object({id,type:z.literal('steps'),items:z.array(text).min(1).max(20)}).strict(),
 z.object({id,type:z.literal('timeline'),items:z.array(text).min(1).max(20)}).strict(),
 z.object({id,type:z.literal('accordion'),title:text,text}).strict(),
 z.object({id,type:z.literal('image'),asset:z.enum(courseThumbnails),alt:text}).strict(),
 z.object({id,type:z.literal('multipleChoice'),prompt:text,options,correctIndex:z.number().int().min(0).max(5)}).strict(),
 z.object({id,type:z.literal('checkpoint'),prompt:text,expected:z.boolean()}).strict(),
]).superRefine((b,ctx)=>{if(b.type==='multipleChoice'&&b.correctIndex>=b.options.length)ctx.addIssue({code:'custom',message:'Invalid answer index'});});
const draftSchema=z.object({
 requestKey:z.string().uuid().optional(),revision:z.number().int().positive().optional(),title:text,description:text,category:(allowEmpty?z.string().trim().max(80):z.string().trim().min(2).max(80)),level:z.enum(['INTRODUCTORY','INTERMEDIATE','ADVANCED']).default('INTRODUCTORY'),language:z.literal('pt-BR').default('pt-BR'),thumbnail:z.enum(courseThumbnails),estimatedMinutes:z.number().int().min(1).max(2400),
 modules:z.array(z.object({title:text,lessons:z.array(z.object({title:text,estimatedMinutes:z.number().int().min(1).max(2400),contentBlocks:z.array(lessonBlock).min(1).max(30)}).strict()).min(1).max(30)}).strict()).min(1).max(20),
 assessment:z.object({passingScore:z.number().int().min(0).max(100),maxAttempts:z.number().int().min(1).max(5),requiredForCompletion:z.boolean(),questions:z.array(z.object({prompt:text,options,correctIndex:z.number().int().min(0).max(5)}).strict().refine(q=>q.correctIndex<q.options.length,'Invalid answer index')).min(1).max(30)}).strict().nullable(),
}).strict().superRefine((draft,ctx)=>{for(const courseModule of draft.modules)for(const lesson of courseModule.lessons)if(new Set(lesson.contentBlocks.map(b=>b.id)).size!==lesson.contentBlocks.length)ctx.addIssue({code:'custom',message:'Duplicate block identity'});});
 return {lessonBlock,draftSchema};
}
export const {lessonBlock,draftSchema}=schemas(false);
export const draftStorageSchema=schemas(true).draftSchema;
export type DraftPayload=z.infer<typeof draftSchema>;
export type LessonBlock=z.infer<typeof lessonBlock>;
export type PublicLessonBlock=Omit<Extract<LessonBlock,{type:'multipleChoice'}>,'correctIndex'>|Omit<Extract<LessonBlock,{type:'checkpoint'}>,'expected'>|Exclude<LessonBlock,{type:'multipleChoice'|'checkpoint'}>;
export const releaseSchema=z.object({organizationIds:z.array(z.string().uuid()).min(1).max(100)}).strict();
export const assignmentSchema=z.object({organizationId:z.string().uuid(),publicationId:z.string().uuid(),all:z.boolean(),userIds:z.array(z.string().uuid()).max(100).default([]),obligation:z.enum(['REQUIRED','RECOMMENDED','OPTIONAL']),deadlineAt:z.string().datetime({offset:true}).nullable()}).strict();
export const progressSchema=z.object({lessonId:z.string().uuid(),revision:z.number().int().nonnegative(),action:z.enum(['VISIT','COMPLETE']),acknowledged:z.boolean().default(false),answers:z.record(z.string(),z.union([z.number().int(),z.boolean()])).default({})}).strict();
export const attemptSchema=z.object({requestKey:z.string().uuid(),answers:z.record(z.string().uuid(),z.number().int().min(0).max(5))}).strict();
export function publicBlocks(blocks:LessonBlock[]):PublicLessonBlock[]{return blocks.map(b=>{const copy={...b} as Record<string,unknown>;delete copy.correctIndex;delete copy.expected;return copy as PublicLessonBlock;});}
