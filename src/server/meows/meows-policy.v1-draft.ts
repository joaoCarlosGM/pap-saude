import type {
  MeowsDraftPolicy,
} from "./meows-policy.types";

export const MEOWS_V1_DRAFT_POLICY:
MeowsDraftPolicy = {
  id:
    "PAP_MEOWS_V1_REAVALIACAO",

  version:
    "1.0-draft",

  status:
    "DRAFT_UNVALIDATED",

  clinicallyValidated:
    false,

  scoreComponents: [
    "systolicBp",
    "diastolicBp",
    "heartRate",
    "respiratoryRate",
    "temperature",
    "oxygenTherapy",
    "consciousness",
  ],

  missingData: {
    outcome:
      "INCOMPLETE",

    totalScore:
      null,

    reportMissingParameters:
      true,
  },

  invalidData: {
    behavior:
      "REJECT",

    convertToZero:
      false,
  },

  oxygenSaturation: {
    collected:
      true,

    includedInFormula:
      false,

    confidence:
      "UNRESOLVED",
  },

  isolatedParameterScoreThree: {
    alertCandidate:
      true,

    confidence:
      "CONSENSUS",
  },

  temperature: {
    parameter:
      "temperature",

    confidence:
      "CONSENSUS",

    bands: [
      {
        max:
          35.0,
        maxInclusive:
          true,
        score:
          2,
      },
      {
        min:
          35.1,
        minInclusive:
          true,
        max:
          37.4,
        maxInclusive:
          true,
        score:
          0,
      },
      {
        min:
          37.5,
        minInclusive:
          true,
        max:
          38.9,
        maxInclusive:
          true,
        score:
          2,
      },
      {
        min:
          39.0,
        minInclusive:
          true,
        score:
          3,
      },
    ],
  },

  provisionalNumericRules: [
    {
      parameter:
        "systolicBp",

      confidence:
        "PROVISIONAL",

      bands: [
        {
          max:
            79,
          maxInclusive:
            true,
          score:
            3,
        },
        {
          min:
            80,
          minInclusive:
            true,
          max:
            89,
          maxInclusive:
            true,
          score:
            2,
        },
        {
          min:
            90,
          minInclusive:
            true,
          max:
            139,
          maxInclusive:
            true,
          score:
            0,
        },
        {
          min:
            140,
          minInclusive:
            true,
          max:
            149,
          maxInclusive:
            true,
          score:
            1,
        },
        {
          min:
            150,
          minInclusive:
            true,
          max:
            159,
          maxInclusive:
            true,
          score:
            2,
        },
        {
          min:
            160,
          minInclusive:
            true,
          score:
            3,
        },
      ],
    },

    {
      parameter:
        "diastolicBp",

      confidence:
        "PROVISIONAL",

      bands: [
        {
          max:
            39,
          maxInclusive:
            true,
          score:
            3,
        },
        {
          min:
            40,
          minInclusive:
            true,
          max:
            49,
          maxInclusive:
            true,
          score:
            2,
        },
        {
          min:
            50,
          minInclusive:
            true,
          max:
            89,
          maxInclusive:
            true,
          score:
            0,
        },
        {
          min:
            90,
          minInclusive:
            true,
          max:
            99,
          maxInclusive:
            true,
          score:
            1,
        },
        {
          min:
            100,
          minInclusive:
            true,
          max:
            109,
          maxInclusive:
            true,
          score:
            2,
        },
        {
          min:
            110,
          minInclusive:
            true,
          score:
            3,
        },
      ],
    },

    {
      parameter:
        "heartRate",

      confidence:
        "PROVISIONAL",

      bands: [
        {
          max:
            59,
          maxInclusive:
            true,
          score:
            3,
        },
        {
          min:
            60,
          minInclusive:
            true,
          max:
            100,
          maxInclusive:
            true,
          score:
            0,
        },
        {
          min:
            101,
          minInclusive:
            true,
          max:
            110,
          maxInclusive:
            true,
          score:
            1,
        },
        {
          min:
            111,
          minInclusive:
            true,
          max:
            149,
          maxInclusive:
            true,
          score:
            2,
        },
        {
          min:
            150,
          minInclusive:
            true,
          score:
            3,
        },
      ],
    },

    {
      parameter:
        "respiratoryRate",

      confidence:
        "PROVISIONAL",

      bands: [
        {
          max:
            11,
          maxInclusive:
            true,
          score:
            3,
        },
        {
          min:
            12,
          minInclusive:
            true,
          max:
            17,
          maxInclusive:
            true,
          score:
            0,
        },
        {
          min:
            18,
          minInclusive:
            true,
          max:
            24,
          maxInclusive:
            true,
          score:
            1,
        },
        {
          min:
            25,
          minInclusive:
            true,
          max:
            29,
          maxInclusive:
            true,
          score:
            2,
        },
        {
          min:
            30,
          minInclusive:
            true,
          score:
            3,
        },
      ],
    },
  ],

  unresolvedDecisions: [
    {
      key:
        "P1_ALERT_THRESHOLD",

      priority:
        "P1",

      description:
        "Global alert threshold remains unresolved between total score >= 4 and >= 5.",
    },

    {
      key:
        "P2_FINAL_NUMERIC_MATRIX",

      priority:
        "P2",

      description:
        "Final approval of PAS, PAD, heart-rate and respiratory-rate scoring bands remains pending.",
    },

    {
      key:
        "P3_OXYGEN_RULE",

      priority:
        "P3",

      description:
        "Supplemental oxygen scoring, units and boundary conditions remain pending validation.",
    },

    {
      key:
        "P4_CONSCIOUSNESS_RULE",

      priority:
        "P4",

      description:
        "Consciousness categories and their computational mapping remain pending validation.",
    },

    {
      key:
        "P5_SPO2_ROLE",

      priority:
        "P5",

      description:
        "SpO2 is collected but its role in MEOWS scoring remains unresolved.",
    },
  ],
};
