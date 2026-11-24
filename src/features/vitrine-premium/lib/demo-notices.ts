export type DemoNotice = {
  id: string
  category: 'Pacientes' | 'Atendimentos' | 'Sistema' | 'Protocolos' | 'Documentos' | 'Agenda'
  title: string
  summary: string
  date: string
  href: string
}
