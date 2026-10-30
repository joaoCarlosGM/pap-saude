/** Deployment availability only. Existing session, MFA, IAM and CSRF guards remain authoritative. */
export function adminBetaOnly(value: string | undefined) {
  // Invalid nonempty configuration fails closed. The Beta entrypoint additionally requires exactly 1.
  return value !== undefined && value !== "" && value !== "0";
}

export const ADMIN_BETA_PAGES = [
  "/", "/login", "/primeiros-passos", "/minha-seguranca", "/ajuda/seguranca",
  "/recuperar-senha", "/redefinir-senha", "/aceitar-convite", "/convite",
  "/aguardando-autorizacao", "/notificacoes", "/admin", "/admin/manager",
  "/admin/manager/municipios", "/admin/pendencias", "/admin/rede", "/admin/organizacoes",
  "/admin/usuarios", "/admin/acessos", "/admin/minha-seguranca", "/admin/seguranca",
  "/admin/auditoria", "/admin/monitoramento", "/admin/metricas", "/admin/solicitacoes",
  "/admin/convites", "/admin/convites-globais",
] as const;
const pages = new Set<string>(ADMIN_BETA_PAGES);
export const ADMIN_BETA_API: Record<string, readonly string[]> = {
  "/api/health": ["GET", "HEAD"],
  "/api/auth/login": ["POST"], "/api/auth/login/verification": ["POST"],
  "/api/auth/logout": ["POST"], "/api/auth/mfa/verify": ["POST"],
  "/api/auth/session": ["GET"], "/api/auth/security": ["GET", "POST"],
  "/api/auth/password/forgot": ["POST"], "/api/auth/password/reset": ["POST"],
  "/api/auth/password/forced-change": ["POST"],
  "/api/account/profile": ["GET", "PATCH"], "/api/account/access-status": ["GET"],
  "/api/account/notifications": ["GET", "PATCH"],
  "/api/access-invitations/accept": ["POST"], "/api/invitations/accept": ["GET", "POST"],
  "/api/admin/context": ["GET"], "/api/admin/access-invitations": ["GET", "POST"],
  "/api/admin/audit": ["GET"], "/api/admin/pending": ["GET"],
  "/api/admin/roles": ["GET"], "/api/admin/role-assignments": ["POST"],
  "/api/admin/security": ["GET", "POST"], "/api/admin/users": ["GET"],
  "/api/admin/organizations": ["GET", "POST"],
  "/api/admin/invitations": ["POST"],
  "/api/admin/beta/invitations": ["GET", "POST"], "/api/admin/beta/metrics": ["GET"],
  "/api/admin/beta/requests": ["GET", "POST"], "/api/admin/beta/users": ["GET"],
  "/api/admin/manager/municipalities": ["GET", "POST"],
  "/api/admin/operations/metrics": ["GET"], "/api/admin/operations/monitoring": ["GET"],
};
const uuid = "[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}";
const organizationPage = new RegExp(`^/admin/rede/${uuid}$`);
const organizationApi = new RegExp(`^/api/admin/organizations/${uuid}$`);
const assignmentApi = new RegExp(`^/api/admin/role-assignments/${uuid}$`);

export function adminBetaPathAllowed(rawPath: string, method = "GET", approvedEmail = false) {
  let path: string;
  try { path = decodeURIComponent(rawPath); } catch { return false; }
  if (/[\\%\u0000-\u0020]/.test(path) || path.includes("//") || path.split("/").some(p => p === "." || p === "..")) return false;
  if (path !== "/" && path.endsWith("/")) path = path.slice(0, -1);
  if (["GET", "HEAD"].includes(method)) {
    if (pages.has(path) || organizationPage.test(path)) return true;
    if (/^\/_next\/static\/[\w/@.()[\]-]+\.(?:js|css|woff2?|ttf|png|jpe?g|webp|avif|svg|ico)$/.test(path)) return true;
    if (/^\/(?:fonts|images|brand|beta1|banners|assets|illustrations)\/[\w/().-]+\.(?:woff2?|ttf|png|jpe?g|webp|svg|ico)$/.test(path)) return true;
    if (["/favicon.ico", "/icon.png", "/apple-icon.png"].includes(path)) return true;
  }
  if (ADMIN_BETA_API[path]?.includes(method)) return true;
  if (approvedEmail && path === "/api/email/resend/webhook") return method === "POST";
  if (organizationApi.test(path)) return method === "PATCH";
  if (assignmentApi.test(path)) return method === "DELETE";
  if (path === "/api/onboarding/admin-core") return ["GET", "PATCH"].includes(method);
  return false;
}
