import {readFile} from 'node:fs/promises'
import path from 'node:path'
import type {Pool, PoolClient} from 'pg'
import type {Profile} from './card-store'
import {digest} from './registry-store'
import {chartCommand, chartData, chartDelta, sameDose, patchKinds, singletons, type ChartData, type ChartEvent, type ChartSnapshot} from '../../src/features/vitrine-premium/lib/longitudinal'
import {availableStatuses} from '../../src/features/vitrine-premium/lib/demo-agenda'
import {registrationErrors} from '../../src/features/vitrine-premium/lib/demo/data'

export async function upgradeLongitudinal(pool: Pool, profile: Profile) {
  const file = path.join(process.env.PAP_PRIVATE_REVIEW_ROOT || process.cwd(), 'scripts/private-review/sql/003_longitudinal.sql')
  const sql = await readFile(file, 'utf8')
  await transaction(pool, async db => {
    const {rows: [meta]} = await db.query('SELECT current_database() AS name, owner, schema_version FROM review_meta FOR UPDATE')
    if (meta?.name !== profile.database || meta.owner !== profile.owner || meta.schema_version < 2) throw Error('WRONG_REVIEW_DATABASE')
    await db.query(sql)
  })
}

async function transaction<T>(pool: Pool, run: (db: PoolClient) => Promise<T>) {
  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    const result = await run(db)
    await db.query('COMMIT')
    return result
  } catch (error) {
    await db.query('ROLLBACK')
    throw error
  } finally {
    db.release()
  }
}

export class ChartError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code) }
}

function declaredDate(data: ChartData) {
  return 'date' in data ? data.date : 'start' in data ? data.start : undefined
}

function eventFrom(row: Record<string, unknown>, patientId: string): ChartEvent {
  const data = row.data as ChartData
  return {
    id: row.id as string, entityId: row.entity_id as string, patientId, version: row.version as number,
    data, occurrencePrecision: row.version === 1 && declaredDate(data) && !('time' in data && data.time) ? 'day' : 'time', actions: row.actions as ChartEvent['actions'], fields: row.fields as string[],
    occurredAt: (row.occurred_at as Date).toISOString(), recordedAt: (row.recorded_at as Date).toISOString(),
    actor: row.actor as string, source: row.source as string, reason: (row.reason as string | null) ?? undefined,
  }
}

export async function readChart(pool: Pool, patientId: string): Promise<ChartSnapshot> {
  return transaction(pool, async db => {
    const {rows: [person]} = await db.query('SELECT subject FROM review_people WHERE patient_id=$1 FOR SHARE', [patientId])
    if (!person) throw new ChartError(404, 'PATIENT_NOT_FOUND')
    const {rows} = await db.query('SELECT * FROM review_chart_events WHERE subject=$1 ORDER BY recorded_at DESC,id DESC', [person.subject])
    const {rows: documents} = await db.query(
      "SELECT id,resource_id,kind,at,actor FROM review_audit WHERE subject=$1 AND kind IN ('DOCUMENT_UPLOADED','DOCUMENT_ARCHIVED') ORDER BY at DESC,id DESC", [person.subject])
    return {events: rows.map(row => eventFrom(row, patientId)), documents: documents.map(row => ({
      id: 'document-' + row.id, entityId: row.resource_id,
      action: row.kind === 'DOCUMENT_UPLOADED' ? 'created' : 'status_changed',
      recordedAt: row.at.toISOString(), actor: row.actor,
    }))}
  })
}

export async function readChartActivity(pool: Pool): Promise<ChartEvent[]> {
  const {rows} = await pool.query(`SELECT e.*,p.patient_id FROM review_chart_events e
    JOIN review_people p ON p.subject=e.subject
    WHERE e.kind IN ('consulta','soap','agenda') ORDER BY e.recorded_at DESC, e.id DESC`)
  return rows.map(row => eventFrom(row,row.patient_id))
}

async function requireEntity(db: PoolClient, subject: string, entityId: string, kind: string) {
  const result = await db.query('SELECT 1 FROM review_chart_events WHERE subject=$1 AND entity_id=$2 AND kind=$3 LIMIT 1', [subject, entityId, kind])
  if (!result.rowCount) throw new ChartError(404, 'REFERENCE_NOT_FOUND')
}

export async function writeChart(pool: Pool, patientId: string, input: unknown) {
  const command = chartCommand.parse(input)
  const {operationId, entityId, expectedVersion, reason} = command
  const hash = digest(JSON.stringify(command))
  return transaction(pool, async db => {
    const {rows: [person]} = await db.query('SELECT subject,identity FROM review_people WHERE patient_id=$1 FOR UPDATE', [patientId])
    if (!person) throw new ChartError(404, 'PATIENT_NOT_FOUND')
    const {subject} = person
    const {rows: [retry]} = await db.query('SELECT * FROM review_chart_events WHERE id=$1', [operationId])
    if (retry) {
      if (retry.subject !== subject || retry.digest !== hash) throw new ChartError(409, 'OPERATION_CONFLICT')
      return eventFrom(retry, patientId)
    }
    const {rows: [previous]} = await db.query('SELECT * FROM review_chart_events WHERE entity_id=$1 ORDER BY version DESC LIMIT 1', [entityId])
    if (previous && (previous.subject !== subject || previous.kind !== command.data.kind)) throw new ChartError(404, 'RECORD_NOT_FOUND')
    if ((previous?.version ?? 0) !== expectedVersion) throw new ChartError(409, 'VERSION_CONFLICT')
    if (expectedVersion >= 1000 || (previous && ['consulta','soap'].includes(previous.kind))) throw new ChartError(409, 'RECORD_IMMUTABLE')
    if (!previous && singletons.includes(command.data.kind)) {
      const result = await db.query('SELECT 1 FROM review_chart_events WHERE subject=$1 AND kind=$2 LIMIT 1', [subject, command.data.kind])
      if (result.rowCount) throw new ChartError(409, 'VERSION_CONFLICT')
    }
    const quota = await db.query('SELECT count(*) FROM review_chart_events WHERE subject=$1', [subject])
    if (Number(quota.rows[0].count) >= 1000) throw new ChartError(409, 'CHART_QUOTA')
    const data = chartData.parse(patchKinds.includes(command.data.kind) ? {...previous?.data, ...command.data} : command.data)
    const correction = !!command.correction
    const {fields, actions} = chartDelta(previous?.data, data, correction)
    if (previous && fields.length === 0) throw new ChartError(409, 'NO_CHANGE')
    if (!reason && previous && (actions.includes('corrected') || (actions.includes('status_changed') &&
      ['medicacao','alergia','comorbidade'].includes(data.kind)))) throw new ChartError(400, 'REASON_REQUIRED')
    if ('documentId' in data && data.documentId && data.documentId !== previous?.data.documentId) {
      const document = await db.query('SELECT id FROM review_documents WHERE id=$1 AND subject=$2 AND NOT archived FOR SHARE', [data.documentId, subject])
      if (!document.rowCount) throw new ChartError(404, 'DOCUMENT_NOT_FOUND')
    }
    if (data.kind === 'resultado' && data.requestId) await requireEntity(db, subject, data.requestId, 'pedido')
    if ((data.kind === 'pedido' || data.kind === 'soap') && data.encounterId) await requireEntity(db, subject, data.encounterId, 'consulta')
    if (data.kind === 'resultado' && data.status === 'retificado' && !previous) throw new ChartError(400, 'RESULT_REQUIRED')
    if (data.kind === 'identidade' && data.cpf) {
      // Serialize administrative CPF corrections across subjects without changing PAP-ID's issued identity.
      await db.query("SELECT pg_advisory_xact_lock(hashtextextended('review-chart-cpf',0))")
      const conflict = await db.query(`SELECT 1 FROM review_people WHERE subject<>$1 AND identity->>'document'=$2
        UNION ALL SELECT 1 FROM (
          SELECT DISTINCT ON (subject) subject,data FROM review_chart_events WHERE kind='identidade' AND subject<>$1 ORDER BY subject,version DESC
        ) c WHERE c.data->>'cpf'=$2 LIMIT 1`, [subject, data.cpf])
      if (conflict.rowCount) throw new ChartError(409, 'IDENTITY_CONFLICT')
    }
    if (data.kind === 'vacina') {
      if (previous?.data.status === 'aplicada' && (data.status !== 'aplicada' || data.date !== previous.data.date) && (!correction || !reason))
        throw new ChartError(400, 'DOSE_CORRECTION_REQUIRED')
      const other = await db.query("SELECT DISTINCT ON (entity_id) data FROM review_chart_events WHERE subject=$1 AND kind='vacina' AND entity_id<>$2 ORDER BY entity_id,version DESC", [subject, entityId])
      if (other.rows.some(row => sameDose(row.data, data))) throw new ChartError(409, 'DOSE_ALREADY_RECORDED')
    }
    if (data.kind === 'agenda') {
      if (data.vaccineId) await requireEntity(db, subject, data.vaccineId, 'vacina')
      const before = previous?.data as typeof data | undefined
      const rescheduled = !!before && (before.slot?.date !== data.slot?.date || before.slot?.time !== data.slot?.time)
      const invalidCreation = !before && (data.status !== 'planejado' ||
        (data.appointmentKind === 'solicitacao') === !!data.slot ||
        (data.appointmentKind === 'vacinacao' && !data.vaccineId))
      const kind = before?.appointmentKind === 'solicitacao' && rescheduled ? 'exame' : before?.appointmentKind
      const invalidChange = before && (data.appointmentKind !== kind || data.vaccineId !== before.vaccineId ||
        data.professional !== before.professional || data.unit !== before.unit || data.notes !== before.notes ||
        (rescheduled ? (!['planejado','confirmado'].includes(before.status) || !data.slot || data.status !== 'planejado')
          : !availableStatuses(before).includes(data.status)))
      if (invalidCreation || invalidChange) throw new ChartError(409, 'APPOINTMENT_CONFLICT')
      if (!before && data.vaccineId) {
        const {rows: existing} = await db.query("SELECT DISTINCT ON (entity_id) data FROM review_chart_events WHERE subject=$1 AND kind='agenda' AND data->>'vaccineId'=$2 ORDER BY entity_id,version DESC", [subject,data.vaccineId])
        if (existing.some(row => ['planejado','confirmado'].includes(row.data.status))) throw new ChartError(409, 'APPOINTMENT_CONFLICT')
      }
    }
    if (data.kind === 'consulta') {
      const registration = {...data.record, cpf: person.identity.document, nomeCompleto: person.identity.name, dataNascimento: person.identity.birthDate}
      if ([1,2,3,4,5].some(step => registrationErrors(registration, step).length)) throw new ChartError(400, 'INVALID_REGISTRATION')
      if (new Set(data.record.soapNotes?.map(note => note.id)).size !== (data.record.soapNotes?.length ?? 0)) throw new ChartError(400, 'INVALID_REGISTRATION')
    }
    const clinicalDate = declaredDate(data)
    const clinicalTime = ('time' in data && data.time) || '00:00'
    const occurredAt = !previous && clinicalDate ? clinicalDate + 'T' + clinicalTime + ':00-03:00' : null
    const source = 'source' in data ? data.source : 'registro_vitrine'
    const {rows: [row]} = await db.query(`INSERT INTO review_chart_events
      (id,subject,entity_id,kind,version,data,actions,fields,occurred_at,actor,source,reason,digest)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::timestamptz,clock_timestamp()),$10,$11,$12,$13) ON CONFLICT DO NOTHING RETURNING *`,
    [operationId, subject, entityId, data.kind, expectedVersion + 1, data, actions, fields, occurredAt, 'PRIVATE_SESSION', source, reason ?? null, hash])
    if (!row) throw new ChartError(409, 'OPERATION_CONFLICT')
    return eventFrom(row, patientId)
  })
}
