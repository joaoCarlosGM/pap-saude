import { EncounterStatus, type Prisma } from "@prisma/client";
import { db } from "../db/client";

// Prisma 7.10.1 also exposes $transaction on interactive clients, so the method
// cannot identify a root client. This internal runtime brand is deliberately
// checked fail-closed and covered with real root/interactive client tests.
const TRANSACTION_SCOPE = Symbol.for("prisma.client.transaction.scope_context");

function isInteractiveTransaction(client: Prisma.TransactionClient): boolean {
  const scope = (client as unknown as Record<symbol, unknown>)[TRANSACTION_SCOPE];
  if (!scope || typeof scope !== "object") return false;
  const context = scope as Record<string, unknown>;
  return context.kind === "nested"
    && typeof context.txId === "string" && context.txId.length > 0
    && typeof context.scopeId === "string" && context.scopeId.length > 0;
}

/** Internal callers must pass an actual interactive transaction, never a root client. */
export async function inClinicalWriteTransaction<T>(
  action: (tx: Prisma.TransactionClient) => Promise<T>,
  client?: Prisma.TransactionClient,
): Promise<T> {
  if (client && !isInteractiveTransaction(client)) {
    throw new Error("CLINICAL_ROOT_CLIENT_NOT_ALLOWED");
  }
  return client ? action(client) : db.$transaction(action);
}

/**
 * Prisma's conditional UPDATE acquires a PostgreSQL row lock. A competing
 * finalization and a clinical write therefore serialize on the same encounter.
 * Re-read after the UPDATE: a preliminary state lookup is never authorization
 * to mutate after another transaction has completed or cancelled the encounter.
 * Failed validation rolls back the touch along with the clinical mutation.
 */
export async function lockEditableEncounter(
  client: Prisma.TransactionClient,
  encounterId: string,
  allowedStates: EncounterStatus[] = [EncounterStatus.DRAFT, EncounterStatus.IN_PROGRESS],
) {
  await client.encounter.updateMany({
    where: { id: encounterId, status: { in: allowedStates } },
    data: { updatedAt: new Date() },
  });
  return client.encounter.findUnique({ where: { id: encounterId } });
}
