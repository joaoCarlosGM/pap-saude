graph TD
    subgraph Camada Cliente [Cliente - Navegador / App]
        UI[Interface: Next.js + shadcn/ui]
        Wizard[Wizard de Registro e Score MEOWS]
        ChatUI[Interface do Chat AI]
        
        UI --- Wizard
        UI --- ChatUI
    end

    subgraph Camada Servidor [Backend Next.js - VPS ou Vercel]
        API_RNDS[Route Handler: /api/rnds]
        API_Chat[Route Handler: /api/chat]
        DB[(Banco de Dados Interno)]
    end

    subgraph Servicos Externos [Governo e Nuvem]
        RNDS[DATASUS / RNDS]
        Gemini[Google Gemini API]
    end

    %% Fluxos de Comunicação Client -> Server
    Wizard -- "1. Busca CPF" --> API_RNDS
    Wizard -- "4. Salva Prontuário" --> DB
    ChatUI -- "2. Envia Pergunta" --> API_Chat

    %% Fluxos de Comunicação Server -> External
    API_RNDS -- "mTLS + HL7 FHIR" --> RNDS
    API_Chat -- "API Key Segura + System Prompt" --> Gemini