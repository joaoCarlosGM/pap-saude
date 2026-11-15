'use client'
import {createContext,useContext,type ReactNode} from 'react'
import {originalDocuments,type OriginalDocument} from '../../lib/protocol-originals'
export type PrivateDocument=OriginalDocument&{url:string;downloadUrl:string}
const Context=createContext<readonly PrivateDocument[]>([])
export function OriginalDocumentProvider({documents,children}:{documents:readonly PrivateDocument[];children:ReactNode}){
 // The host supplies capabilities only after its own authorization. No public URL/provider is mounted by the production app.
 const safe=documents.flatMap(d=>{const known=originalDocuments.find(p=>p.slug===d.slug&&p.sha256===d.sha256&&p.pages===d.pages&&p.bytes===d.bytes);return known&&d.url==='/homologacao/documentos/'+known.slug&&d.downloadUrl===d.url+'?download=1'?[{...known,url:d.url,downloadUrl:d.downloadUrl}]:[]})
 return <Context.Provider value={safe}>{children}</Context.Provider>
}
export function useOriginalDocument(slug:string){return useContext(Context).find(d=>d.slug===slug)}
