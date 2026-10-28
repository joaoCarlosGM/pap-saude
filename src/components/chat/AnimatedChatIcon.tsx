import {Bot,Star,type LucideProps} from 'lucide-react'
import styles from './animated-chat-icon.module.css'
export default function AnimatedChatIcon(props:LucideProps){const size=props.size||20;return <span className={styles.icon} style={{width:size,height:size}} aria-hidden="true"><Bot {...props}/>{[0,1,2].map(i=><Star key={i} size={6} className={`${styles.star} ${styles['star'+i]}`} fill="currentColor"/>)}</span>}
