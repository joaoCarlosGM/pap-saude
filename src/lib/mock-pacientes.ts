import type { Patient } from "@/types/paciente"

export const mockPacientes: Patient[] = [
  {
    id: "maria-gracas",
    initials: "MG",
    nome: "Maria das Graças Silva",
    cpf: "123.456.789-00",
    sus: "898 0000 1111 2222",
    dataNascimento: "1998-02-14",
    idade: 28,
    telefone: "(91) 99999-1234",
    endereco: "Belém - PA",

    pregnancy: {
      gestationalAge: "28s 4d",
      trimester: "3º trimestre",
      dum: "2025-12-18",
      dpp: "2026-09-24",
    },

    allergies: ["Dipirona"],
    comorbidities: ["Anemia ferropriva leve"],

    consultations: 7,
    alerts: 2,

    latestScore: {
      value: 1,
      classification: "BAIXO_RISCO",
      date: "2026-09-08",
    },

    meowsTrend: [
      { label: "C1", value: 0 },
      { label: "C2", value: 1 },
      { label: "C3", value: 0 },
      { label: "C4", value: 1 },
      { label: "C5", value: 0 },
      { label: "C6", value: 1 },
      { label: "C7", value: 1 },
    ],

    systolicTrend: [
      { label: "C1", value: 118 },
      { label: "C2", value: 124 },
      { label: "C3", value: 121 },
      { label: "C4", value: 132 },
      { label: "C5", value: 114 },
      { label: "C6", value: 126 },
      { label: "C7", value: 130 },
    ],

    obstetricHistory: {
      pregnancies: 2,
      deliveries: 1,
      abortions: 0,
      cesareans: 1,
    },

    timeline: [
      {
        id: "t1",
        type: "vacina",
        title: "Vacina aplicada: COVID-19",
        subtitle: "Dose registrada no acompanhamento pré-natal.",
        date: "2026-09-08T09:00:00",
      },
      {
        id: "t2",
        type: "vacina",
        title: "Vacina aplicada: Influenza",
        subtitle: "Imunização realizada.",
        date: "2026-08-20T10:20:00",
      },
      {
        id: "t3",
        type: "vacina",
        title: "Vacina aplicada: Hepatite B",
        subtitle: "Dose registrada.",
        date: "2026-07-29T08:40:00",
      },
      {
        id: "t4",
        type: "exame",
        title: "Resultado Hemograma completo",
        subtitle: "Resultado disponível no prontuário.",
        date: "2026-07-18T14:00:00",
      },
      {
        id: "t5",
        type: "exame",
        title: "Resultado Glicemia de jejum",
        subtitle: "Resultado registrado.",
        date: "2026-07-18T13:50:00",
      },
      {
        id: "t6",
        type: "consulta",
        title: "Consulta #7 - Enf. Ana Paula Ferreira",
        subtitle:
          "Paciente compareceu para acompanhamento pré-natal.",
        date: "2026-07-10T09:30:00",
      },
    ],

    exams: [
      {
        id: "e1",
        name: "Hemograma completo",
        date: "2026-07-18",
        status: "NORMAL",
        summary: "Resultado dentro dos limites esperados.",
      },
      {
        id: "e2",
        name: "Ácido úrico",
        date: "2026-07-18",
        status: "NORMAL",
      },
      {
        id: "e3",
        name: "Proteinúria 24h",
        date: "2026-07-18",
        status: "NORMAL",
      },
      {
        id: "e4",
        name: "Doppler obstétrico",
        date: "2026-08-02",
        status: "PENDENTE",
      },
    ],

    vaccines: [
      {
        id: "v1",
        name: "Influenza",
        date: "2026-08-20",
        status: "APLICADA",
      },
      {
        id: "v2",
        name: "dTpa",
        date: "2026-08-15",
        dose: "Dose única",
        status: "APLICADA",
      },
      {
        id: "v3",
        name: "Hepatite B",
        date: "2026-07-29",
        dose: "2ª dose",
        status: "APLICADA",
      },
      {
        id: "v4",
        name: "COVID-19",
        date: "2026-09-08",
        status: "APLICADA",
      },
    ],

    medications: [
      {
        id: "m1",
        name: "Sulfato ferroso",
        dose: "40 mg",
        frequency: "1x ao dia",
        route: "Oral",
      },
      {
        id: "m2",
        name: "Ácido fólico",
        dose: "5 mg",
        frequency: "1x ao dia",
        route: "Oral",
      },
    ],

    documents: [
      {
        id: "d1",
        title: "Caderneta da Gestante",
        description: "Documento de acompanhamento do pré-natal.",
        type: "PDF",
      },
      {
        id: "d2",
        title: "Declaração de Comparecimento",
        description: "Emitida no último atendimento.",
        type: "PDF",
      },
      {
        id: "d3",
        title: "Receita Médica",
        description: "Prescrição atual.",
        type: "RECEITA",
      },
      {
        id: "d4",
        title: "Relatório de Encaminhamento",
        description: "Encaminhamento para acompanhamento especializado.",
        type: "ENCAMINHAMENTO",
      },
      {
        id: "d5",
        title: "Cartão de Vacinação",
        description: "Registro atualizado.",
        type: "PDF",
      },
      {
        id: "d6",
        title: "Resultados de Exames",
        description: "Consolidado dos últimos exames.",
        type: "EXAME",
      },
    ],

    previousNotes: [
      {
        id: "o1",
        date: "2026-07-10",
        professional: "Enf. Ana Paula Ferreira",
        text:
          "Paciente em acompanhamento pré-natal, sem intercorrências importantes no atendimento.",
      },
      {
        id: "o2",
        date: "2026-06-18",
        professional: "Dr. Carlos Mendes",
        text:
          "Orientações gerais realizadas. Mantido seguimento de rotina.",
      },
    ],
  },

  {
    id: "fernanda-costa",
    initials: "FC",
    nome: "Fernanda Costa Oliveira",
    cpf: "987.654.321-00",
    sus: "898 0000 3333 4444",
    dataNascimento: "1996-05-04",
    idade: 30,
    telefone: "(91) 98888-4567",
    endereco: "Belém - PA",

    pregnancy: {
      gestationalAge: "29s 5d",
      trimester: "3º trimestre",
      dum: "2026-02-11",
      dpp: "2026-11-18",
    },

    allergies: ["Penicilina"],
    comorbidities: ["Hipertensão gestacional"],

    consultations: 7,
    alerts: 3,

    latestScore: {
      value: 6,
      classification: "URGENCIA",
      date: "2026-09-09",
    },

    meowsTrend: [
      { label: "C1", value: 1 },
      { label: "C2", value: 2 },
      { label: "C3", value: 1 },
      { label: "C4", value: 2 },
      { label: "C5", value: 1 },
      { label: "C6", value: 3 },
      { label: "C7", value: 6 },
    ],

    systolicTrend: [
      { label: "C1", value: 125 },
      { label: "C2", value: 134 },
      { label: "C3", value: 131 },
      { label: "C4", value: 145 },
      { label: "C5", value: 118 },
      { label: "C6", value: 139 },
      { label: "C7", value: 151 },
    ],

    obstetricHistory: {
      pregnancies: 2,
      deliveries: 1,
      abortions: 0,
      cesareans: 0,
    },

    timeline: [
      {
        id: "ft1",
        type: "consulta",
        title: "Consulta #7 - Enf. Ana Paula Ferreira",
        subtitle: "Alterações clínicas identificadas no atendimento.",
        date: "2026-09-09T09:00:00",
      },
      {
        id: "ft2",
        type: "exame",
        title: "Resultado Hemograma completo",
        date: "2026-09-05T12:30:00",
      },
      {
        id: "ft3",
        type: "vacina",
        title: "Vacina aplicada: Influenza",
        date: "2026-08-15T10:00:00",
      },
    ],

    exams: [
      {
        id: "fe1",
        name: "Hemograma completo",
        date: "2026-09-05",
        status: "NORMAL",
      },
      {
        id: "fe2",
        name: "Ácido úrico",
        date: "2026-09-05",
        status: "ALTERADO",
      },
      {
        id: "fe3",
        name: "Proteinúria 24h",
        date: "2026-09-05",
        status: "ALTERADO",
      },
    ],

    vaccines: [
      {
        id: "fv1",
        name: "Influenza",
        date: "2026-08-15",
        status: "APLICADA",
      },
      {
        id: "fv2",
        name: "Hepatite B",
        date: "2026-07-15",
        status: "APLICADA",
      },
    ],

    medications: [
      {
        id: "fm1",
        name: "Metildopa",
        dose: "250 mg",
        frequency: "8/8h",
        route: "Oral",
      },
    ],

    documents: [
      {
        id: "fd1",
        title: "Caderneta da Gestante",
        description: "Documento de acompanhamento.",
        type: "PDF",
      },
      {
        id: "fd2",
        title: "Resultados de Exames",
        description: "Exames recentes.",
        type: "EXAME",
      },
    ],

    previousNotes: [
      {
        id: "fo1",
        date: "2026-09-09",
        professional: "Enf. Ana Paula Ferreira",
        text:
          "Paciente encaminhada para avaliação devido a alterações identificadas.",
      },
    ],
  },

  {
    id: "juliana-pereira",
    initials: "JP",
    nome: "Juliana Pereira Santos",
    cpf: "456.789.123-00",
    sus: "898 0000 5555 6666",
    dataNascimento: "2001-11-10",
    idade: 24,
    telefone: "(91) 97777-8899",
    endereco: "Ananindeua - PA",

    pregnancy: {
      gestationalAge: "16s 4d",
      trimester: "2º trimestre",
      dum: "2026-05-17",
      dpp: "2027-02-21",
    },

    allergies: ["Amoxicilina"],
    comorbidities: [],

    consultations: 7,
    alerts: 1,

    latestScore: {
      value: 1,
      classification: "BAIXO_RISCO",
      date: "2026-09-08",
    },

    meowsTrend: [
      { label: "C1", value: 0 },
      { label: "C2", value: 0 },
      { label: "C3", value: 0 },
      { label: "C4", value: 0 },
      { label: "C5", value: 0 },
      { label: "C6", value: 6 },
      { label: "C7", value: 1 },
    ],

    systolicTrend: [
      { label: "C1", value: 112 },
      { label: "C2", value: 115 },
      { label: "C3", value: 113 },
      { label: "C4", value: 116 },
      { label: "C5", value: 114 },
      { label: "C6", value: 138 },
      { label: "C7", value: 116 },
    ],

    obstetricHistory: {
      pregnancies: 1,
      deliveries: 0,
      abortions: 0,
      cesareans: 0,
    },

    timeline: [
      {
        id: "jt1",
        type: "consulta",
        title: "Consulta #7 - Enf. Ana Paula Ferreira",
        date: "2026-09-08T11:30:00",
      },
      {
        id: "jt2",
        type: "exame",
        title: "Resultado TOTG 75g",
        date: "2026-08-20T09:00:00",
      },
      {
        id: "jt3",
        type: "vacina",
        title: "Vacina aplicada: dTpa",
        date: "2026-08-04T14:00:00",
      },
    ],

    exams: [
      {
        id: "je1",
        name: "TOTG 75g",
        date: "2026-08-20",
        status: "NORMAL",
      },
    ],

    vaccines: [
      {
        id: "jv1",
        name: "dTpa",
        date: "2026-08-04",
        status: "APLICADA",
      },
    ],

    medications: [
      {
        id: "jm1",
        name: "Sulfato ferroso",
        dose: "40 mg",
        frequency: "1x ao dia",
        route: "Oral",
      },
    ],

    documents: [
      {
        id: "jd1",
        title: "Caderneta da Gestante",
        description: "Documento de acompanhamento.",
        type: "PDF",
      },
    ],

    previousNotes: [],
  },
]