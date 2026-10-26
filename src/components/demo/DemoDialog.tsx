"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
export default function DemoDialog({ title, children, onClose }: {
    title: string;
    children: ReactNode;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDialogElement>(null), id = useId();
    useEffect(() => { if (!ref.current?.open)
        ref.current?.showModal(); }, []);
    return <dialog ref={ref} aria-labelledby={id} className="demo-dialog" onClose={onClose}>
    <div className="demo-dialog-header"><div><p className="workspace-eyebrow">Conteúdo demonstrativo</p><h2 id={id}>{title}</h2></div><button type="button" aria-label="Fechar exemplo" onClick={() => ref.current?.close()}>×</button></div>
    {children}
    <p className="demo-disclaimer">Exemplo fictício, sem validade clínica. Não salva dados, não emite certificados e não aciona integrações.</p>
    <button type="button" className="workspace-secondary" onClick={() => ref.current?.close()}>Voltar à demonstração</button>
  </dialog>;
}
