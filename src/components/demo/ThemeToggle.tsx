"use client";
import { useState } from "react";
import { Moon, Sun } from "lucide-react";
export default function ThemeToggle() {
    const [dark, setDark] = useState<boolean | null>(null);
    return <button type="button" className="workspace-theme" aria-label="Alternar tema claro e escuro" onClick={event => {
            const root = event.currentTarget.closest<HTMLElement>(".pap-demo, .pap-commercial");
            const next = !(dark ?? window.matchMedia("(prefers-color-scheme: dark)").matches);
            root?.setAttribute("data-theme", next ? "dark" : "light");
            setDark(next);
        }}>{dark ? <Sun size={18} aria-hidden="true"/> : <Moon size={18} aria-hidden="true"/>}</button>;
}
