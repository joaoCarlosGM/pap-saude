import Help from './views/ajuda'
import Dashboard from './views/dashboard'
import Registro from './views/registro'
import Atendimentos from './views/atendimentos'
import Pacientes from './views/pacientes'
import Chat from './views/chat'
import Protocolos from './views/protocolos'
import Ferramentas from './views/ferramentas'
import Cursos from './views/cursos'
import Configuracoes from './views/configuracoes'
import type {PremiumSection} from './lib/routes'
const views={dashboard:Dashboard,registro:Registro,atendimentos:Atendimentos,pacientes:Pacientes,chat:Chat,protocolos:Protocolos,ferramentas:Ferramentas,cursos:Cursos,configuracoes:Configuracoes,ajuda:Help}
export default function PremiumSectionView({section}:{section:PremiumSection}){const View=views[section];return <View/>}
