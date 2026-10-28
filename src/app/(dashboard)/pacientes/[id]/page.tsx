import DemoPatientView from "@/components/pacientes/DemoPatientView"
export default async function PatientPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <DemoPatientView id={id}/>}
