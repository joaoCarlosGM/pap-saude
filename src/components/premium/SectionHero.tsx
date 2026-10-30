import { useId, type ReactNode } from "react";
export default function SectionHero({title,subtitle,visual,variant="clinical",actions,headingAs="h2"}:{title:string;subtitle:string;visual:string;variant?:"clinical"|"admin";actions?:ReactNode;headingAs?:"h2"|"p"}) {
  const id=useId(), Heading=headingAs;
  return <section className={`section-hero section-hero--${variant}`} aria-labelledby={id}>
    {/* Local, reviewed abstract SVGs. Titles remain accessible DOM text. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={`/brand/banners/${visual}.svg`} alt="" aria-hidden="true" width={960} height={220}/>
    <div><Heading className="section-hero-title" id={id}>{title}</Heading><p>{subtitle}</p>{actions}</div>
  </section>;
}
