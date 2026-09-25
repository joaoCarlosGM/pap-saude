import type { Protocol } from "@/types/protocolo"

export const mockProtocolos: Protocol[] = [
  {
    id: "pre-eclampsia",
    title: "Protocolo de Pré-eclâmpsia",
    description:
      "Manejo e prevenção de pré-eclâmpsia em gestantes de alto risco",
    uploadDate: "2026-01-15",
    fileName: "protocolo-pre-eclampsia.pdf",
  },

  {
    id: "hemorragia-pos-parto",
    title: "Manejo de Hemorragia Pós-parto",
    description:
      "Conduta imediata e prevenção de hemorragia no pós-parto",
    uploadDate: "2026-01-15",
    fileName: "manejo-hemorragia-pos-parto.pdf",
  },

  {
    id: "meows-aplicacao",
    title: "Protocolo MEOWS — Aplicação",
    description:
      "Guia de aplicação do Modified Early Obstetric Warning Score",
    uploadDate: "2026-02-01",
    fileName: "protocolo-meows-aplicacao.pdf",
  },

  {
    id: "trabalho-parto-prematuro",
    title: "Conduta em Trabalho de Parto Prematuro",
    description:
      "Critérios diagnósticos e manejo do parto prematuro",
    uploadDate: "2026-02-10",
    fileName: "conduta-trabalho-parto-prematuro.pdf",
  },

  {
    id: "pre-natal-alto-risco",
    title: "Pré-natal de Alto Risco",
    description:
      "Protocolo ministerial para gestantes de alto risco obstétrico",
    uploadDate: "2026-03-05",
    fileName: "pre-natal-alto-risco.pdf",
  },
]