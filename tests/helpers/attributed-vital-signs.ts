export * from "../../src/server/vital-signs";
import { createVitalSigns as realCreate, updateVitalSigns as realUpdate } from "../../src/server/vital-signs/vital-signs.service";
import type { CreateVitalSignsInput, UpdateVitalSignsInput } from "../../src/server/vital-signs/vital-signs.types";
import { clinicalFixtureActor } from "./clinical-fixture-actor";
type CreateInput = Omit<CreateVitalSignsInput, "actorContext"> & Partial<Pick<CreateVitalSignsInput, "actorContext">>;
type UpdateInput = Omit<UpdateVitalSignsInput, "actorContext"> & Partial<Pick<UpdateVitalSignsInput, "actorContext">>;
export async function createVitalSigns(input: CreateInput) {
  const actorContext = Object.hasOwn(input, "actorContext") ? input.actorContext! : await clinicalFixtureActor(input.encounterId);
  return realCreate({ ...input, actorContext });
}
export async function updateVitalSigns(encounterId: string, input: UpdateInput) {
  const actorContext = Object.hasOwn(input, "actorContext") ? input.actorContext! : await clinicalFixtureActor(encounterId);
  return realUpdate(encounterId, { ...input, actorContext });
}
