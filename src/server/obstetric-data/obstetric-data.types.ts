import {
  EdemaGrade,
} from "@prisma/client";

export type CreateObstetricDataInput = {
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
