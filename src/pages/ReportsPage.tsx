import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../api'
import { getErrorMessage } from '../api/client'
import type { DashboardSummary } from '../types'
import { LoadingSpinner, notify } from '../components/ui'

export default function ReportsPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void dashboardApi
      .summary()
      .then(setSummary)
      .catch((e) => notify(getErrorMessage(e), 'error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const cards = [
    { label: 'Total Certificates', value: summary?.total_certificates ?? 0, bg: 'bg-[#1d6fd8]' },
    { label: "Today's Certificates", value: summary?.certificates_today ?? 0, bg: 'bg-[#1f9d57]' },
    { label: 'Total Printed', value: summary?.total_printed ?? 0, bg: 'bg-[#e67e22]' },
    { label: 'Pending Print', value: summary?.pending_print ?? 0, bg: 'bg-[#d94a8c]' },
  ]

  return (
    <div className="space-y-4">
      <section className="lt-section">
        <div className="lt-section-head bg-[#0b2a5b]">Reports</div>
        <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className={`rounded-xl ${c.bg} p-5 text-white shadow`}>
              <p className="text-sm font-semibold opacity-90">{c.label}</p>
              <p className="mt-2 text-4xl font-extrabold">{c.value}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 border-t border-slate-100 p-4">
          <Link to="/certificates" className="lt-action-btn bg-[#1d6fd8]">All Certificates</Link>
          <Link to="/print-history" className="lt-action-btn bg-[#ea580c]">Print History</Link>
          <Link to="/search" className="lt-action-btn bg-[#7c3aed]">Search</Link>
        </div>
      </section>
    </div>
  )
}
