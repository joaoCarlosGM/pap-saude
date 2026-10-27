export * from "../../src/server/obstetric-data";
import { createObstetricData as realCreate, updateObstetricData as realUpdate } from "../../src/server/obstetric-data/obstetric-data.service";
import type { CreateObstetricDataInput, UpdateObstetricDataInput } from "../../src/server/obstetric-data/obstetric-data.types";
import { clinicalFixtureActor } from "./clinical-fixture-actor";
type CreateInput = Omit<CreateObstetricDataInput, "actorContext"> & Partial<Pick<CreateObstetricDataInput, "actorContext">>;
type UpdateInput = Omit<UpdateObstetricDataInput, "actorContext"> & Partial<Pick<UpdateObstetricDataInput, "actorContext">>;
export async function createObstetricData(input: CreateInput) {
  const actorContext = Object.hasOwn(input, "actorContext") ? input.actorContext! : await clinicalFixtureActor(input.encounterId);
  return realCreate({ ...input, actorContext });
}
export async function updateObstetricData(encounterId: string, input: UpdateInput) {
  const actorContext = Object.hasOwn(input, "actorContext") ? input.actorContext! : await clinicalFixtureActor(encounterId);
  return realUpdate(encounterId, { ...input, actorContext });
}
