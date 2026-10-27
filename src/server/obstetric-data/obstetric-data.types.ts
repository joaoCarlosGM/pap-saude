import type { ClinicalMeasurementActorContext } from "../clinical-revision/clinical-provenance.service";
import {
  EdemaGrade,
} from "@prisma/client";

export type CreateObstetricDataInput = {
  actorContext: ClinicalMeasurementActorContext;
  encounterId: string;

  uterineHeightCm?:
    number | null;

  fetalHeartRate?:
    number | null;

  fetalMovement?:
    boolean | null;

  edema?:
    EdemaGrade;

  bleeding?:
    boolean | null;

  weightKg?:
    number | null;

  complaints?:
    string | null;

  notes?:
    string | null;

  recordedAt?:
    Date | string;
};

export type UpdateObstetricDataInput = {
  actorContext: ClinicalMeasurementActorContext;
  uterineHeightCm?:
    number | null;

  fetalHeartRate?:
    number | null;

  fetalMovement?:
    boolean | null;

  edema?:
    EdemaGrade;

  bleeding?:
    boolean | null;

  weightKg?:
    number | null;

  complaints?:
    string | null;

  notes?:
    string | null;

  recordedAt?:
    Date | string;
};
