import {registryResponse} from '@/../scripts/private-review/registry-api'
export const dynamic = 'force-dynamic'
export function GET(request: Request) {
  return registryResponse(request,'activity','atividade')
}
