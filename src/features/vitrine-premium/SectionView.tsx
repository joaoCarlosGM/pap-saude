import Agenda from './views/agenda'
import Help from './views/ajuda'
import Dashboard from './views/dashboard'
import Registro from './views/registro'
import Atendimentos from './views/atendimentos'
import Pacientes from './views/pacientes'
import Unavailable from './components/layout/ShowcaseUnavailable'
import Protocolos from './views/protocolos'
import Ferramentas from './views/ferramentas'
import type {ProtocolLocation} from './lib/protocol-catalog'
import Configuracoes from './views/configuracoes'
import type {PremiumSection} from './lib/routes'
const views={dashboard:Dashboard,registro:Registro,atendimentos:Atendimentos,agenda:Agenda,pacientes:Pacientes,chat:()=> <Unavailable feature="Chat IA"/>,protocolos:Protocolos,ferramentas:Ferramentas,cursos:()=> <Unavailable feature="Cursos"/>,configuracoes:Configuracoes,ajuda:Help}
export default function PremiumSectionView({section,protocolLocation}:{section:PremiumSection;protocolLocation?:ProtocolLocation}){if(section==='protocolos')return <Protocolos location={protocolLocation}/>;const View=views[section];return <View/>}
