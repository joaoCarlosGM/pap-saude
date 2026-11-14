import type {ReactNode} from 'react';
import localFont from 'next/font/local';
const inter=localFont({src:'./fonts/inter.woff2',variable:'--font-sans',weight:'100 900',display:'swap'});
const geist=localFont({src:'./fonts/geist.woff2',variable:'--font-geist-sans',weight:'100 900',display:'swap'});
const mono=localFont({src:'./fonts/geist-mono.woff2',variable:'--font-geist-mono',weight:'100 900',display:'swap'});
import PremiumShell from '@/features/vitrine-premium/components/layout/DashboardShell';
import './globals.css';
export const dynamic='force-dynamic';
export default function Layout({children}:{children:ReactNode}){return <html lang="pt-BR" className={`h-full antialiased font-sans ${inter.variable} ${geist.variable} ${mono.variable}`}><body className="min-h-full flex flex-col"><PremiumShell>{children}</PremiumShell></body></html>}
