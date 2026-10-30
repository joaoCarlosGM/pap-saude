import ts from 'typescript';
import {createHash} from 'node:crypto';
export const AUDITED_COURSE_LOCK_PATH='src/server/courses/transaction-locks.ts';
export const COURSE_LOCK_SOURCE_SHA256="c637de9037b4ee70854186ea32eee0980ef7c4aab7293977d9497783ebdadeea";
const allowedSQL=new Set([
 "SELECT \"roleId\" FROM role_permissions WHERE \"roleId\" IN (SELECT \"roleId\" FROM role_assignments WHERE \"userId\"=?) FOR SHARE",
 "SELECT id FROM course_audiences WHERE \"publicationId\"=? FOR SHARE",
 "SELECT id FROM course_enrollments WHERE id=? FOR SHARE",
 "SELECT id FROM course_enrollments WHERE id=? FOR UPDATE",
 "SELECT id FROM course_publications WHERE id=? FOR SHARE",
 "SELECT id FROM course_publications WHERE id=? FOR UPDATE",
 "SELECT id FROM course_versions WHERE id=? FOR UPDATE",
 "SELECT id FROM courses WHERE id=? FOR UPDATE",
 "SELECT id FROM memberships WHERE \"userId\"=? AND \"organizationId\"=? FOR SHARE",
 "SELECT id FROM memberships WHERE \"userId\"=? FOR SHARE",
 "SELECT id FROM mfa_factors WHERE \"userId\"=? FOR SHARE",
 "SELECT id FROM organizations WHERE id=? OR id=(SELECT \"parentId\" FROM organizations WHERE id=?) OR id=(SELECT \"parentId\" FROM organizations WHERE id=(SELECT \"parentId\" FROM organizations WHERE id=?)) FOR SHARE",
 "SELECT id FROM role_assignments WHERE \"userId\"=? FOR SHARE",
 "SELECT id FROM sessions WHERE id=? FOR SHARE",
 "SELECT id FROM users WHERE id=? FOR SHARE"
]);
const functions=new Set(['lockGrants','lockCourseActorRows','lockCourseRecipient','lockCourseScope','lockCourse','lockCourseVersion','lockCoursePublication','lockCourseEnrollment','lockCourseAudiences']);
const parameters=new Set(['userId','sessionId','organizationId','id','publicationId']);
export function auditCourseLockShape(source){
 const file=ts.createSourceFile('locks.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let count=0,error='';
 if(file.parseDiagnostics.length)return {ok:false,reason:'Invalid lock-helper syntax'};
 const reject=()=>{error='Only fixed read-only parameterized row-lock templates and local lock helpers are allowed';};
 for(const statement of file.statements){if(ts.isImportDeclaration(statement)){if(!statement.importClause?.isTypeOnly||statement.moduleSpecifier.text!=='@prisma/client')reject();}else if(!ts.isFunctionDeclaration(statement)||!functions.has(statement.name?.text))reject();}
 function visit(node){
  if(ts.isTaggedTemplateExpression(node)){
   const tag=node.tag;if(!ts.isPropertyAccessExpression(tag)||!ts.isIdentifier(tag.expression)||tag.expression.text!=='tx'||tag.name.text!=='$queryRaw'){reject();return;}
   const t=node.template;let sql='';if(ts.isNoSubstitutionTemplateLiteral(t))sql=t.text;else{sql=t.head.text;for(const span of t.templateSpans){if(!ts.isIdentifier(span.expression)||!parameters.has(span.expression.text)){reject();return;}sql+='?'+span.literal.text;}}
   if(!allowedSQL.has(sql.replace(/\s+/g,' ').trim()))reject();count++;
  }
  if(ts.isCallExpression(node)&&(!ts.isIdentifier(node.expression)||!functions.has(node.expression.text)))reject();
  if(ts.isPropertyAccessExpression(node)&&!(ts.isTaggedTemplateExpression(node.parent)&&node.parent.tag===node))reject();
  if(ts.isElementAccessExpression(node)||ts.isNewExpression(node)||ts.isArrowFunction(node)||ts.isFunctionExpression(node)||ts.isBinaryExpression(node)||ts.isSpreadElement(node))reject();
  ts.forEachChild(node,visit);
 }
 visit(file);
 if(count!==16)reject();
 return error?{ok:false,reason:error}:{ok:true,statements:count};
}
export function validateAuditedCourseLocks(source){
 if(createHash('sha256').update(source).digest('hex')!==COURSE_LOCK_SOURCE_SHA256)return {ok:false,reason:'Audited row-lock source fingerprint changed; dedicated review required'};
 return auditCourseLockShape(source);
}
