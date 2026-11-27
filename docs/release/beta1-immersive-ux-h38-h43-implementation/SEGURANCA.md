# Isolamento e persistência

A PAP-Gest de apresentação usa somente as fichas sintéticas predefinidas e renderização local. O lado de apresentação não emite, revoga ou renderiza QR, usa metadados sem PDF clínico e não cria uma URL de documento. Os compromissos de leitura dos cenários não entram na Agenda persistida do navegador nem no diário privado.

A sessão privada mantém as verificações de origem, autorização, paciente e expiração. Os recortes dos protocolos usam o URL fornecido pelo mesmo contexto privado. O download e o PDF integral mantêm os bytes e hashes existentes. O mapa documental não executa ações em prontuários.

A datação adotada é um campo opcional no evento JSON de consulta. A validação estrutural rejeita fontes incompletas ou inválidas. A validação do laboratório usa o calendário civil e preserva conteúdo e autoria dos eventos anteriores. Nenhuma migração operacional foi criada. O algoritmo demonstrativo PAP-MEOWS v1.0 conserva os critérios preexistentes. A homologação clínica requer revisão humana.
