import BetaRequestsClient from "@/components/admin/BetaRequestsClient";
import {notFound} from "next/navigation";
export default async function Page({searchParams}:{searchParams:Promise<{item?:string}>}){const {item}=await searchParams;if(item&&!/^[0-9a-f-]{36}$/i.test(item))notFound();return <BetaRequestsClient focusId={item}/>;}
