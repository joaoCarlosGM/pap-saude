"use client";

import { RotateCcw, Save } from "lucide-react";

import type { MeowsEvaluation } from "@/lib/clinical-api";

import type { RegistrationData } from "@/types/registration";

type ResultStepProps = {
  data: RegistrationData;

  onRestart: () => void;

  onSave: () => void;

  saving: boolean;

  saveError: string | null;

  savedEvaluation: MeowsEvaluation | null;
};

export default function ResultStep({
  data,
  onRestart,
  onSave,
  saving,
  saveError,
  savedEvaluation,
}: ResultStepProps) {
  void data;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900">
          Resultado do Atendimento
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          O resultado MEOWS exibido nesta etapa é produzido exclusivamente pelo
          motor clínico do servidor.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Status MEOWS
          </p>

          <p className="mt-2 text-xl font-bold text-slate-800">
            {savedEvaluation ? savedEvaluation.status : "AGUARDANDO REGISTRO"}
          </p>

          {savedEvaluation && (
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              <p>Score: {savedEvaluation.meowsScore ?? "não calculado"}</p>

              <p>Protocolo: {savedEvaluation.protocolVersion}</p>

              <p>
                Validação clínica:{" "}
                {savedEvaluation.clinicallyValidated
                  ? "validado"
                  : "não validado"}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="text-base font-semibold text-amber-900">Conduta</h3>

          <p className="mt-3 text-sm text-amber-800">
            Enquanto o protocolo MEOWS permanecer com decisões clínicas
            pendentes, o sistema não gera automaticamente uma conduta clínica
            nem converte ausência de regra em score zero.
          </p>
        </div>
      </div>

      {savedEvaluation?.missingParameters &&
        savedEvaluation.missingParameters.length > 0 && (
          <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Parâmetros ausentes: {savedEvaluation.missingParameters.join(", ")}
          </div>
        )}

      {savedEvaluation?.unresolvedParameters &&
        savedEvaluation.unresolvedParameters.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Regras ainda não consolidadas:{" "}
            {savedEvaluation.unresolvedParameters.join(", ")}
          </div>
        )}

      {saveError && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {saveError}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={onRestart}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RotateCcw size={16} />
          Novo Registro
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={saving || Boolean(savedEvaluation)}
          className="flex items-center gap-2 rounded-lg bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save size={16} />

          {saving
            ? "Salvando..."
            : savedEvaluation
              ? "Registro salvo"
              : "Salvar Registro"}
        </button>
      </div>
    </div>
  );
}
