# Checklist de UX e comparação visual

- PASS: componentes motion/shell/dashboard/premium são byte-equivalentes ao commit0e0a2d8. Medidos em navegador: página/título260ms, KPI360ms, escalonamento65ms (último455ms), gráfico850ms; reduced-motion remove animação.
- PASS: referências9Protocolos +6PAP-ID inspecionadas; manifesto de dimensões/hashes em evidence/reference-assets.json.
- PASS: cabeçalho com retorno e ações PDF reais quando autorizado, avisos compactos, fontes por bloco, ícones/chips de temas documentados, coluna lateral e checklist agrupado/progresso/expandir-recolher.
- PASS: layout validado em320/375/390/430/768/1024/1440; light/dark, teclado, ausência de overflow e WCAG automatizado nas jornadas. Capturas selecionadas em evidence/.
- PASS: figura original preservada; nenhum fluxo clínico inventado a partir do conceito. Zoom e tela cheia/Escape; descrição textual tem limites explícitos, não substitui fonte rasterizada.
- PASS: câmera não grava nem transmite frames; leitura não revela prontuário antes seleção e confirmação. Permissão negada oferece PNG/código.
- PASS: menu/drawer e estado compartilhado preservados; Cursos/Chat permanecem não interativos. Tutorial de seis etapas continua funcional e exclui rotas pausadas.
- NOT RUN: validação humana do acabamento, leitores de tela reais, câmeras físicas e Safari/iOS. Testes automatizados de acessibilidade não constituem certificação.

Comparar com os9conceitos de `docs/protocolos/referencias/`, com as capturas anteriores em `docs/protocolos/evidence/etapa-1/` e com as novas. A tipografia, identidade Premium e banner compartilhado foram preservados. O conteúdo clínico ilustrativo dos conceitos não foi copiado como fonte. Screenshots ocultam QR/canvas privado quando necessário; não publicar carteirinhas ou PDFs emitidos.
