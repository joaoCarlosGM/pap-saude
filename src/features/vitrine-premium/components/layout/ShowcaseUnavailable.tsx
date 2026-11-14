import Link from 'next/link'
import {Clock3} from 'lucide-react'
import styles from '@/features/vitrine-premium/components/protocolos/protocols.module.css'
export default function ShowcaseUnavailable({feature}:{feature:'Chat IA'|'Cursos'}){
 return <section className={styles.page}><div className={styles.empty} data-showcase-unavailable><Clock3 size={36} aria-hidden="true"/><p className={styles.badge}>Em breve</p><h1>{feature}</h1><p className={styles.muted}>Este recurso demonstrativo está em preparação e não está disponível nesta etapa.</p><div className={styles.actions}><Link href="/vitrine/protocolos" prefetch={false} className={styles.button}>Explorar Protocolos</Link><Link href="/vitrine/dashboard" prefetch={false} className={styles.secondary}>Voltar ao Dashboard</Link></div></div></section>
}
