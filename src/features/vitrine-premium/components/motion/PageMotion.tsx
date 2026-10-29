'use client'
import { usePathname } from 'next/navigation'
import styles from './demo-motion.module.css'
export default function PageMotion({children}:{children:React.ReactNode}) {
  const pathname=usePathname()
  return <div key={pathname} className={styles.page} data-motion-page={pathname}>{children}</div>
}
