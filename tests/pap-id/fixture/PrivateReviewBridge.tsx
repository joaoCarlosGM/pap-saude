'use client'
import {useRef,useState,type ReactNode} from 'react';
import {OriginalDocumentProvider,type PrivateDocument} from '@/features/vitrine-premium/components/protocolos/OriginalDocumentContext';
export default function PrivateReviewBridge({children}:{children:ReactNode}){
 const panel=useRef<HTMLDetailsElement>(null);
 const [documents,setDocuments]=useState<PrivateDocument[]>([]),[error,setError]=useState('');
 async function authorize(){try{const response=await fetch('/homologacao/sessao',{method:documents.length?'DELETE':'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-pap-local-review':'consent'},body:documents.length?undefined:JSON.stringify({consent:true})});if(!response.ok)throw new Error();setDocuments((await response.json()).documents);setError('');if(panel.current)panel.current.open=false}catch{setError('Consulta privada indisponível. Confira a integridade dos originais e reinicie somente esta fixture.')}}
 return <OriginalDocumentProvider documents={documents}>{children}<details ref={panel} data-private-review aria-label="Homologação local privada" style={{position:'fixed',top:8,right:8,zIndex:65,maxWidth:'min(280px,80vw)',background:'#fff',border:'1px solid #be186a',borderRadius:12,padding:12,color:'#172033',fontSize:12}}><summary style={{minHeight:28,cursor:'pointer'}}>PDFs privados • {documents.length?'consulta autorizada':'bloqueados'}</summary><p>Somente homologação privada • sem publicação de PDFs.</p><button type="button" style={{minHeight:44,color:'#be186a',textDecoration:'underline'}} onClick={()=>void authorize()}>{documents.length?'Encerrar consulta privada':'Autorizar consulta local dos PDFs'}</button>{error&&<p role="alert">{error}</p>}</details></OriginalDocumentProvider>
}
