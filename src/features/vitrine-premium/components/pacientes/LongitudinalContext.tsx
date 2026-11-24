'use client'

import {createContext, useContext, useEffect, useState, type ReactNode} from 'react'
import {useCardService} from '../demo/CardServiceContext'
import {latestChartEvents, sortChartEvents, type ChartCommand, type ChartSnapshot} from '../../lib/longitudinal'
import type {ReviewAttachment} from '../../lib/review-registry'

const empty: ChartSnapshot = {events: [], documents: []}
type ChartState = {
  enabled: boolean; loading: boolean; error: boolean; snapshot: ChartSnapshot; documents: ReviewAttachment[];
  latest: ReturnType<typeof latestChartEvents>; reload: () => void; write: (command: ChartCommand) => Promise<void>;
}
const Context = createContext<ChartState | null>(null)
export const useLongitudinal = () => useContext(Context)

export function LongitudinalProvider({patientId, children}: {patientId: string; children: ReactNode}) {
  const service = useCardService()
  const chart = service?.people.some(person => 'patientId' in person && person.patientId === patientId) ? service.chart : undefined
  const getDocuments = service?.documents
  const [loaded, setLoaded] = useState<{snapshot: ChartSnapshot; documents: ReviewAttachment[]}>()
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    if (!chart || !getDocuments) return
    let active = true
    void Promise.all([
      chart.read(patientId),
      getDocuments(patientId).catch(() => []),
    ]).then(([snapshot, documents]) => {
      if (active) {setLoaded({snapshot, documents}); setFailed(false)}
    }).catch(() => {if (active) {setLoaded(undefined); setFailed(true)}})
    return () => {active = false}
  }, [chart, getDocuments, patientId, reloadKey])

  const snapshot = chart && loaded?.snapshot || empty
  return <Context.Provider value={{
    enabled: !!chart, loading: !!chart && !loaded && !failed, error: !!chart && failed, snapshot,
    latest: latestChartEvents(snapshot.events), documents: chart && loaded?.documents || [],
    reload: () => setReloadKey(key => key + 1),
    write: async command => {
      if (!chart) throw Error('CHART_UNAVAILABLE')
      const event = await chart.write(patientId, command)
      setLoaded(current => {
        if (!current) return current
        return {...current, snapshot: {...current.snapshot,
          events: [event,...current.snapshot.events.filter(old => old.id !== event.id)].sort(sortChartEvents)}}
      })
    },
  }}>{children}</Context.Provider>
}
