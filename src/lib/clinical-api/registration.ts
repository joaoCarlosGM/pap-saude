import type { RegistrationData } from "@/types/registration";
import type { MeowsEvaluation } from "./types";
import { ClinicalApiError, getClinicalContext } from "./client";
import { validateClinicalRegistrationLocally } from "./registration-preflight";

export type RegistrationResult = { patientId: string; pregnancyId: string | null; encounterId: string; meows: MeowsEvaluation };
export type RegistrationOperationState =
  | { status: "NOT_FOUND" | "CANCELLED" }
  | { status: "COMPLETED"; replayed: boolean; registration: RegistrationResult };
type Context = { userId: string; organizationId: string; storageKey: string; operationKey: string | null };
const STORAGE_PREFIX = "pap.clinicalRegistration.pending.v1:";

function retainedKey(storageKey: string) {
  let operationKey: string | null;
  try { operationKey = window.localStorage.getItem(storageKey); }
  catch { throw new Error("Não foi possível preservar a operação. Habilite o armazenamento local antes de registrar."); }
  if (operationKey && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationKey)) {
    throw new Error("A identificação da operação está inválida. Consulte a equipe responsável antes de continuar.");
  }
  return operationKey;
}

async function context(): Promise<Context> {
  if (typeof window === "undefined") throw new Error("O registro clínico exige um navegador.");
  const current = await getClinicalContext();
  const selected = window.localStorage.getItem("pap.activeOrganizationId");
  const organizationId = current.organizations.find(o => o.id === selected)?.id ?? current.organizations[0]?.id;
  if (!organizationId) throw new Error("Nenhuma UBS ativa está disponível para o registro.");
  const storageKey = `${STORAGE_PREFIX}${current.user.id}:${organizationId}`;
  return { userId: current.user.id, organizationId, storageKey, operationKey: retainedKey(storageKey) };
}

async function operationLock<T>(ctx: Context, action: (current: Context) => Promise<T>): Promise<T> {
  if (!window.navigator?.locks) throw new Error("Este navegador não permite coordenar o registro entre abas. Use um navegador atualizado antes de enviar.");
  return window.navigator.locks.request(ctx.storageKey, { mode: "exclusive" }, async () => {
    const identity = await getClinicalContext();
    if (identity.user.id !== ctx.userId || !identity.organizations.some(o => o.id === ctx.organizationId)) {
      throw new Error("A sessão ou a UBS mudou durante a operação. Recarregue a página antes de continuar.");
    }
    return action({ ...ctx, operationKey: retainedKey(ctx.storageKey) });
  });
}
function message(code: string) {
  if (code === "REGISTRATION_OPERATION_PAYLOAD_CONFLICT") return "A operação anterior usa outros dados. Consulte seu estado ou cancele-a antes de iniciar um novo registro.";
  if (code === "REGISTRATION_OPERATION_CANCELLED") return "A operação anterior foi cancelada com segurança. Inicie um novo registro.";
  if (code === "REGISTRATION_INVALID_INPUT") return "Revise os campos do registro. Nenhuma gravação parcial foi confirmada.";
  if (code === "MFA_REQUIRED") return "Entre novamente com o segundo fator já cadastrado antes de salvar.";
  if (code === "ACCESS_DENIED" || code === "AUTHENTICATION_REQUIRED") return "A sessão ou a autorização da UBS não está mais disponível. Entre novamente.";
  return "Não foi possível confirmar o registro. Consulte seu estado ou repita com os mesmos dados; a identificação da operação foi preservada.";
}
async function request(ctx: Context, method: "GET" | "POST" | "DELETE", data?: RegistrationData): Promise<RegistrationOperationState> {
  if (!ctx.operationKey) throw new Error("A operação ainda não possui uma identificação.");
  let response: Response;
  try {
    response = await fetch("/api/clinical/registrations", {
      method, credentials: "include", cache: "no-store",
      headers: { "content-type": "application/json", "x-organization-id": ctx.organizationId, "idempotency-key": ctx.operationKey },
      ...(data ? { body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error("A resposta foi interrompida. A identificação foi preservada; consulte o estado ou repita o envio com os mesmos dados.");
  }
  const value = await response.json().catch(() => null);
  if (!response.ok) {
    const code = typeof value?.error === "string" ? value.error : "REGISTRATION_UNAVAILABLE";
    throw new ClinicalApiError(response.status, code, message(code));
  }
  if (!["NOT_FOUND", "CANCELLED", "COMPLETED"].includes(value?.status)) throw new Error(message("REGISTRATION_UNAVAILABLE"));
  return value as RegistrationOperationState;
}
export async function submitClinicalRegistration(data: RegistrationData): Promise<RegistrationResult> {
  validateClinicalRegistrationLocally(data);
  return operationLock(await context(), async ctx => {
    if (!ctx.operationKey) {
      ctx.operationKey = crypto.randomUUID();
      // Durable across reload/new tabs; only an opaque UUID, never form/PHI/token/result.
      try { window.localStorage.setItem(ctx.storageKey, ctx.operationKey); }
      catch { throw new Error("Não foi possível preservar a operação. Nenhum envio foi iniciado."); }
    }
    const result = await request(ctx, "POST", data);
    if (result.status !== "COMPLETED") throw new Error(message("REGISTRATION_UNAVAILABLE"));
    return result.registration;
  });
}
export async function resumeClinicalRegistration(): Promise<RegistrationOperationState | null> {
  const ctx = await context();
  if (!ctx.operationKey) return null;
  const state = await request(ctx, "GET");
  // Reads never clear the durable identity: only serialized cancellation/ack does.
  // NOT_FOUND is not proof that an earlier POST cannot still arrive. Keep the UUID.
  return state;
}
export async function restartClinicalRegistration(acknowledgedCompleted = false): Promise<RegistrationOperationState | null> {
  return operationLock(await context(), async ctx => {
    if (!ctx.operationKey) return null;
    const state = await request(ctx, "DELETE");
    if (state.status === "CANCELLED" || (state.status === "COMPLETED" && acknowledgedCompleted)) window.localStorage.removeItem(ctx.storageKey);
    // A completed-but-unacknowledged operation is displayed before allowing a new one.
    return state;
  });
}
