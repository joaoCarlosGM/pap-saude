# Geração do Prisma Client no executor Cloud

O comando `prisma generate` do projeto recebeu HTTP 403 em `binaries.prisma.sh` ao baixar o checksum. Uma segunda execução com `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` recebeu HTTP 403 ao baixar o executável. Para testar o build, o executor usou o gerador JavaScript e a leitura de schema em WASM dos pacotes oficiais Prisma 7.10.1. A instalação temporária ficou fora do checkout e a geração escreveu no `node_modules` local. O schema, o lockfile e a configuração do projeto são os da candidata.

Comando equivalente no checkout, se o download do motor estiver indisponível.

```bash
export DATABASE_URL=postgresql://unused:unused@127.0.0.1:1/unused
export PAP_H23_PRISMA_TOOLS="$(mktemp -d)"
npm install --prefix "$PAP_H23_PRISMA_TOOLS" --ignore-scripts --no-save --no-package-lock \
  @prisma/internals@7.10.1 @prisma/client-generator-js@7.10.1
node <<'JS'
const path = require('node:path')
const tools = path.join(process.env.PAP_H23_PRISMA_TOOLS, 'node_modules', '@prisma')
const {getGenerators} = require(path.join(tools, 'internals'))
const {PrismaClientJsGenerator} = require(path.join(tools, 'client-generator-js'))
;(async () => {
  const generators = await getGenerators({
    schemaPath: path.resolve('prisma/schema.prisma'),
    registry: {'prisma-client-js': {
      type: 'in-process',
      generator: new PrismaClientJsGenerator({
        cliCommand: 'prisma',
        runtimePath: path.resolve('node_modules/@prisma/client/runtime')
      })
    }},
    cliCommand: 'prisma',
    skipDownload: true,
  })
  try {
    for (const generator of generators) await generator.generate()
    console.log('Prisma Client 7.10.1 gerado')
  } finally {
    for (const generator of generators) generator.stop()
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
JS
```
