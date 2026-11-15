'use client'
import {useEffect,useRef,useState} from 'react'
import type {PrivateDocument} from './OriginalDocumentContext'
import styles from './protocols.module.css'
export default function OriginalPdfViewer({document:source,initialPage=1}:{document:PrivateDocument;initialPage?:number}){
 const canvas=useRef<HTMLCanvasElement>(null),[page,setPage]=useState(initialPage),[zoom,setZoom]=useState(1),[loading,setLoading]=useState(true),[error,setError]=useState(''),[text,setText]=useState(''),[showText,setShowText]=useState(false)
 useEffect(()=>{
  let disposed=false,task:import('pdfjs-dist').PDFDocumentLoadingTask|undefined,render:import('pdfjs-dist').RenderTask|undefined
  async function draw(){
   try{
    const pdfjs=await import('pdfjs-dist');if(disposed)return
    pdfjs.GlobalWorkerOptions.workerSrc=(await import('../../lib/pdf-worker.mjs')).workerUrl
    const loadingTask=pdfjs.getDocument({url:source.url,withCredentials:true,enableXfa:false,disableRange:true,disableStream:true,useSystemFonts:false})
    task=loadingTask;const pdf=await loadingTask.promise;if(disposed)return;if(pdf.numPages!==source.pages)throw new Error('PAGE_COUNT')
    const current=await pdf.getPage(page);if(disposed||!canvas.current)return
    const viewport=current.getViewport({scale:1.05*zoom});canvas.current.width=viewport.width;canvas.current.height=viewport.height
    render=current.render({canvas:canvas.current,viewport});await render.promise
    const content=await current.getTextContent();if(disposed)return
    setText(content.items.map(item=>'str' in item?item.str:'').join(' '));setLoading(false)
   }catch{if(!disposed){setError('Não foi possível abrir o PDF autorizado. A sessão pode ter expirado ou o documento estar indisponível. Reautorize a consulta local.');setLoading(false)}}
  }
  void draw();return()=>{disposed=true;render?.cancel();void task?.destroy()}
 },[source.url,source.pages,page,zoom])
 function changePage(value:number){setLoading(true);setError('');setPage(value)}
 return <section className={styles.panel} data-original-pdf>
  <h2>Documento original • consulta privada</h2><p className={styles.muted}>Bytes originais conferidos por SHA-256 para homologação local. Conteúdo clínico em revisão; redistribuição pública não autorizada.</p>
  <div className={styles.actions}><button className={styles.secondary} disabled={page<=1} onClick={()=>changePage(page-1)}>Página anterior</button><label className={styles.field}>Página<input type="number" min={1} max={source.pages} value={page} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=source.pages)changePage(n)}}/></label><span role="status">Página {page} de {source.pages}</span><button className={styles.secondary} disabled={page>=source.pages} onClick={()=>changePage(page+1)}>Próxima página</button><button className={styles.secondary} disabled={zoom<=.6} onClick={()=>{setLoading(true);setZoom(z=>Math.max(.6,z-.2))}}>Reduzir zoom PDF</button><output aria-label="Zoom PDF">{Math.round(zoom*100)}%</output><button className={styles.secondary} disabled={zoom>=2} onClick={()=>{setLoading(true);setZoom(z=>Math.min(2,z+.2))}}>Ampliar zoom PDF</button></div>
  {loading&&!error&&<p role="status">Renderizando página do PDF original…</p>}{error&&<p role="alert">{error}</p>}
  <div className={styles.pdfViewport} aria-busy={loading} tabIndex={0} role="region" aria-label="Página do PDF original, rolável"><canvas ref={canvas} aria-label={`Página ${page} do documento ${source.filename}`} role="img" data-pdf-rendered={!loading&&!error}/></div>
  <button className={styles.textLink} type="button" aria-expanded={showText} onClick={()=>setShowText(!showText)}>Texto extraído da página</button>{showText&&<p className={styles.pdfText} role="region" aria-label="Texto original da página, rolável" tabIndex={0}>{text||'Sem camada textual nesta página; consulte o PDF original.'}</p>}
  <div className={styles.actions}><a className={styles.secondary} href={source.url} target="_blank" rel="noopener noreferrer">Abrir PDF</a><a className={styles.button} href={source.downloadUrl}>Baixar PDF</a></div><p className={styles.muted}>{source.filename} • {source.bytes} bytes • versão {source.version}</p><p className={styles.hash}>SHA-256: {source.sha256}</p>
 </section>
}
