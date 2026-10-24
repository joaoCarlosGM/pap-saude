"use client";
import { ArrowDownRight } from "lucide-react";
import { useEffect, useRef } from "react";
export default function OnboardingTour({
  target,
  children,
}: {
  target: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = document.getElementById(target);
    element?.setAttribute("data-spotlight", "true");
    ref.current?.focus({ preventScroll: true });
    return () => element?.removeAttribute("data-spotlight");
  }, [target]);
  return (
    <aside
      ref={ref}
      tabIndex={-1}
      role="note"
      aria-label="Orientação desta etapa"
      className="ob-hint"
      aria-controls={target}
    >
      <ArrowDownRight size={16} aria-hidden="true" />
      <div>{children}</div>
      <a
        href={`#${target}`}
        onClick={(e) => {
          e.preventDefault();
          document.getElementById(target)?.focus();
        }}
      >
        Ir ao controle
      </a>
    </aside>
  );
}
