export type DemoNotice = {
  id: string
  category: 'Pacientes' | 'Atendimentos' | 'Sistema' | 'Protocolos' | 'Documentos'
  title: string
  summary: string
  date: string
  href: string
}
