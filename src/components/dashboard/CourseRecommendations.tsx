import Link from "next/link";
import Image from "next/image";
import styles from "./CourseRecommendations.module.css";
export default function CourseRecommendations({ demo = false }: {
    demo?: boolean;
}) {
    return <section className={styles.banner} aria-label="Aprendizagem em equipe"><div>
    <p className={styles.eyebrow}>Aprender também faz parte do cuidado</p>
    <h2>{demo ? "Populares em outras UBS · Demonstração" : "Capacitação para a sua rotina"}</h2>
    <p className={styles.description}>{demo ? "Uma seleção inteiramente fictícia para conhecer a experiência de aprendizagem. Nenhum ranking institucional é consultado." : "Ainda não há recomendações. Nenhuma popularidade é inferida sem dados de catálogo autorizados."}</p>
    {demo && <Link className="workspace-secondary" href="/vitrine/cursos" prefetch={false}>Explorar cursos demonstrativos</Link>}
  </div><Image src="/illustrations/pap-demo-learning.svg" width={360} height={240} alt=""/></section>;
}
