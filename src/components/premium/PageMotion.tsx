"use client";
import { usePathname } from "next/navigation";
/** Presentation only. Native Next links; no interception, timers or data provider. */
export default function PageMotion({children}:{children:React.ReactNode}) {
  const path=usePathname();
  return <div key={path} className="premium-page" data-premium-page={path}>{children}</div>;
}
