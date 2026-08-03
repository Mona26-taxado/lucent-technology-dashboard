import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { certificatesApi } from '../api'
import { getErrorMessage } from '../api/client'
import type { Certificate } from '../types'
import { EmptyState, LoadingSpinner, PageHeader, Pagination, StatusBadge, notify } from '../components/ui'
import { formatDate } from '../utils'

export default function SearchPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    candidate_name: '',
    certificate_number: '',
    address: '',
    training_date: '',
    driving_licence_number: '',
    date_from: '',
    date_to: '',
    print_status: '',
  })
  const [items, setItems] = useState<Certificate[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 20

  const set = (key: keyof typeof filters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  const search = async (p = 1) => {
    setLoading(true)
    setSearched(true)
    try {
      const params: Record<string, string | number> = { page: p, page_size: PAGE_SIZE }
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v
      })
      const data = await certificatesApi.search(params)
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

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void search(1)
  }

  return (
    <div>
      <PageHeader title="Search Certificate" subtitle="Find certificates by candidate details or print status" />

      <form onSubmit={onSubmit} className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Candidate Name</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.candidate_name} onChange={(e) => set('candidate_name', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Certificate Number</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.certificate_number} onChange={(e) => set('certificate_number', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Address / Location</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Training Date</label>
            <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.training_date} onChange={(e) => set('training_date', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Driving Licence Number</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.driving_licence_number} onChange={(e) => set('driving_licence_number', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Print Status</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.print_status} onChange={(e) => set('print_status', e.target.value)}>
              <option value="">All</option>
              <option value="printed">Printed</option>
              <option value="pending">Pending Print</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Date From</label>
            <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.date_from} onChange={(e) => set('date_from', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Date To</label>
            <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.date_to} onChange={(e) => set('date_to', e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
            Search
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
            onClick={() => {
              setFilters({
                candidate_name: '',
                certificate_number: '',
                address: '',
                training_date: '',
                driving_licence_number: '',
                date_from: '',
                date_to: '',
                print_status: '',
              })
              setItems([])
              setSearched(false)
            }}
          >
            Clear
          </button>
        </div>
      </form>

      {loading ? (
        <LoadingSpinner />
      ) : !searched ? (
        <EmptyState title="Enter search criteria" description="Use the filters above to find certificates." />
      ) : items.length === 0 ? (
        <EmptyState title="No matching certificates" description="Try adjusting your search filters." />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="lt-table-wrap">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Certificate No.</th>
                  <th className="px-4 py-3 font-medium">Candidate</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium">Training Date</th>
                  <th className="px-4 py-3 font-medium">Licence</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((cert) => (
                  <tr key={cert.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{cert.certificate_number}</td>
                    <td className="px-4 py-3">{cert.candidate_name}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate">{cert.address}</td>
                    <td className="px-4 py-3">{formatDate(cert.training_date)}</td>
                    <td className="px-4 py-3">{cert.driving_licence_number || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={cert.print_status} /></td>
                    <td className="px-4 py-3">
                      <button type="button" className="text-brand-700 hover:underline" onClick={() => navigate(`/certificates/${cert.id}`)}>
                        View
                      </button>
                    </td>
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
            onChange={(p) => void search(p)}
          />
        </div>
      )}
    </div>
  )
}
