import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { certificatesApi } from '../api'
import { getErrorMessage } from '../api/client'
import type { Certificate } from '../types'
import {
  ConfirmDialog,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  Pagination,
  StatusBadge,
  notify,
} from '../components/ui'
import { formatDate, formatDateTime } from '../utils'

export default function CertificatesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Certificate[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [filters, setFilters] = useState({
    candidate_name: '',
    certificate_number: '',
    training_date: '',
    date_from: '',
    date_to: '',
  })
  const PAGE_SIZE = 20

  const setFilter = (key: keyof typeof filters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  const buildParams = (p: number) => {
    const params: Record<string, string | number | undefined> = {
      page: p,
      page_size: PAGE_SIZE,
    }
    if (filters.candidate_name.trim()) params.candidate_name = filters.candidate_name.trim()
    if (filters.certificate_number.trim()) params.certificate_number = filters.certificate_number.trim()
    if (filters.training_date) params.training_date = filters.training_date
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to
    return params
  }

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const data = await certificatesApi.search(buildParams(p))
      setItems(data.items)
      setPages(data.pages)
      setTotal(data.total)
      setPage(data.page)
      setSelected(new Set())
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onFilter = (e: FormEvent) => {
    e.preventDefault()
    void load(1)
  }

  const clearFilters = () => {
    setFilters({
      candidate_name: '',
      certificate_number: '',
      training_date: '',
      date_from: '',
      date_to: '',
    })
    // load after state update via timeout — call search with empty immediately
    void (async () => {
      setLoading(true)
      try {
        const data = await certificatesApi.search({ page: 1, page_size: PAGE_SIZE })
        setItems(data.items)
        setPages(data.pages)
        setTotal(data.total)
        setPage(data.page)
        setSelected(new Set())
      } catch (error) {
        notify(getErrorMessage(error), 'error')
      } finally {
        setLoading(false)
      }
    })()
  }

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(items.map((c) => c.id)))
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setBusy(true)
    try {
      await certificatesApi.remove(deleteId)
      notify('Certificate deleted', 'success')
      setDeleteId(null)
      await load(page)
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    setBusy(true)
    try {
      const res = await certificatesApi.bulkRemove([...selected])
      notify(res.message || `Deleted ${selected.size} certificate(s)`, 'success')
      setBulkDeleteOpen(false)
      setSelected(new Set())
      await load(1)
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleDownload = async (cert: Certificate) => {
    try {
      setBusy(true)
      let current = cert
      if (!current.pdf_path) {
        current = await certificatesApi.generatePdf(cert.id)
      }
      const response = await certificatesApi.downloadPdf(current.id)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${current.certificate_number.replace(/\//g, '-')}-${current.candidate_name}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  const filterSummary = () => {
    if (filters.training_date) {
      return `${total} certificate${total === 1 ? '' : 's'} on ${formatDate(filters.training_date)}`
    }
    if (filters.date_from || filters.date_to) {
      const from = filters.date_from ? formatDate(filters.date_from) : '…'
      const to = filters.date_to ? formatDate(filters.date_to) : '…'
      return `${total} certificate${total === 1 ? '' : 's'} (${from} – ${to})`
    }
    return `${total} certificate record${total === 1 ? '' : 's'}`
  }

  return (
    <div>
      <PageHeader
        title="All Certificates"
        subtitle={filterSummary()}
        actions={
          <Link to="/certificates/new" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
            New Certificate
          </Link>
        }
      />

      <section className="lt-section mb-4">
        <div className="lt-section-head bg-[#0d9488]">Filters & search</div>
        <form onSubmit={onFilter} className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:items-end">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Training Date (exact)</label>
            <input
              type="date"
              className="lt-input"
              value={filters.training_date}
              onChange={(e) => setFilter('training_date', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Date From</label>
            <input
              type="date"
              className="lt-input"
              value={filters.date_from}
              onChange={(e) => setFilter('date_from', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Date To</label>
            <input
              type="date"
              className="lt-input"
              value={filters.date_to}
              onChange={(e) => setFilter('date_to', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Candidate Name</label>
            <input
              className="lt-input"
              value={filters.candidate_name}
              onChange={(e) => setFilter('candidate_name', e.target.value)}
              placeholder="Search name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Certificate No.</label>
            <input
              className="lt-input"
              value={filters.certificate_number}
              onChange={(e) => setFilter('certificate_number', e.target.value)}
              placeholder="LT/0004000"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="lt-action-btn flex-1 bg-[#7c3aed]">
              Apply
            </button>
            <button type="button" onClick={clearFilters} className="lt-action-btn flex-1 bg-[#ea580c]">
              Clear
            </button>
          </div>
        </form>
      </section>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-800">
            {selected.size} selected
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => setBulkDeleteOpen(true)}
            className="lt-action-btn bg-[#dc2626]"
          >
            Bulk Delete
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <EmptyState title="No certificates found" description="Try another date, name, or certificate number." />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="lt-table-wrap">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    <input
                      type="checkbox"
                      checked={items.length > 0 && selected.size === items.length}
                      onChange={toggleAll}
                      aria-label="Select all on page"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">S.No</th>
                  <th className="px-4 py-3 font-medium">Certificate No.</th>
                  <th className="px-4 py-3 font-medium">Candidate</th>
                  <th className="px-4 py-3 font-medium">Address / Location</th>
                  <th className="px-4 py-3 font-medium">Training Date</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Print Count</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((cert, idx) => (
                  <tr key={cert.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(cert.id)}
                        onChange={() => toggleOne(cert.id)}
                        aria-label={`Select ${cert.certificate_number}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-4 py-3 font-medium">{cert.certificate_number}</td>
                    <td className="px-4 py-3">{cert.candidate_name}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate">{cert.address}</td>
                    <td className="px-4 py-3">{formatDate(cert.training_date)}</td>
                    <td className="px-4 py-3">{formatDateTime(cert.created_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={cert.print_status} /></td>
                    <td className="px-4 py-3">{cert.print_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[220px] flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="rounded-md bg-[#1d4ed8] px-2.5 py-1 text-[11px] font-semibold text-white hover:brightness-110"
                          onClick={() => navigate(`/certificates/${cert.id}`)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="rounded-md bg-[#475569] px-2.5 py-1 text-[11px] font-semibold text-white hover:brightness-110"
                          onClick={() => navigate(`/certificates/${cert.id}/edit`)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-md bg-[#0284c7] px-2.5 py-1 text-[11px] font-semibold text-white hover:brightness-110 disabled:opacity-50"
                          onClick={() => void handleDownload(cert)}
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          className="rounded-md bg-[#ea580c] px-2.5 py-1 text-[11px] font-semibold text-white hover:brightness-110"
                          onClick={() => navigate(`/certificates/${cert.id}/print`)}
                        >
                          Print
                        </button>
                        <button
                          type="button"
                          className="rounded-md bg-[#dc2626] px-2.5 py-1 text-[11px] font-semibold text-white hover:brightness-110"
                          onClick={() => setDeleteId(cert.id)}
                        >
                          Delete
                        </button>
                      </div>
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
            onChange={(p) => void load(p)}
          />
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete certificate?"
        message="This will permanently remove the certificate record."
        confirmLabel="Delete"
        loading={busy}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selected.size} certificates?`}
        message="Selected certificates will be permanently removed. This cannot be undone."
        confirmLabel="Bulk Delete"
        loading={busy}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => void handleBulkDelete()}
      />
    </div>
  )
}
