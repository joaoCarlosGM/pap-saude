import { useId, type ReactNode } from "react";
export default function SectionHero({title,subtitle,visual,variant="clinical",actions}:{title:string;subtitle:string;visual:string;variant?:"clinical"|"admin";actions?:ReactNode}) {
  const id=useId();
  return <section className={`section-hero section-hero--${variant}`} aria-labelledby={id}>
    {/* Local, reviewed abstract SVGs. Titles remain accessible DOM text. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={`/brand/banners/${visual}.svg`} alt="" aria-hidden="true" width={960} height={220}/>
    <div><h2 id={id}>{title}</h2><p>{subtitle}</p>{actions}</div>
  </section>;
}
