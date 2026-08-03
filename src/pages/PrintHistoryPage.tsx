import { useEffect, useState } from 'react'
import { printHistoryApi } from '../api'
import { getErrorMessage } from '../api/client'
import type { PrintHistoryItem } from '../types'
import { EmptyState, LoadingSpinner, PageHeader, Pagination, notify } from '../components/ui'
import { formatDateTime } from '../utils'

export default function PrintHistoryPage() {
  const [items, setItems] = useState<PrintHistoryItem[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const PAGE_SIZE = 20

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const data = await printHistoryApi.list(p, PAGE_SIZE)
      setItems(data.items)
      setPage(data.page)
      setPages(data.pages)
      setTotal(data.total)
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(1)
  }, [])

  return (
    <div>
      <PageHeader title="Print History" subtitle="Every print action is recorded here" />

      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <EmptyState title="No print history yet" description="Printed certificates will appear in this list." />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Certificate ID</th>
                  <th className="px-4 py-3 font-medium">Certificate Number</th>
                  <th className="px-4 py-3 font-medium">Candidate</th>
                  <th className="px-4 py-3 font-medium">Printed By</th>
                  <th className="px-4 py-3 font-medium">Printed At</th>
                  <th className="px-4 py-3 font-medium">Print Count</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{row.certificate_id}</td>
                    <td className="px-4 py-3 font-medium">{row.certificate_number}</td>
                    <td className="px-4 py-3">{row.candidate_name}</td>
                    <td className="px-4 py-3">{row.printed_by_name || '—'}</td>
                    <td className="px-4 py-3">{formatDateTime(row.printed_at)}</td>
                    <td className="px-4 py-3">{row.print_count ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pages={pages}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={(p) => void load(p)}
          />
        </div>
      )}
    </div>
  )
}
