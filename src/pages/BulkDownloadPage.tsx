import { type FormEvent, useState } from 'react'
import { certificatesApi } from '../api'
import { getErrorMessage } from '../api/client'
import type { Certificate } from '../types'
import { EmptyState, LoadingSpinner, PageHeader, notify } from '../components/ui'
import { formatDate } from '../utils'

export default function BulkDownloadPage() {
  const [mode, setMode] = useState<'single' | 'range'>('single')
  const [trainingDate, setTrainingDate] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [items, setItems] = useState<Certificate[]>([])
  const [total, setTotal] = useState(0)
  const [previewed, setPreviewed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const filterParams = () => {
    if (mode === 'single') {
      if (!trainingDate) return null
      return { training_date: trainingDate }
    }
    if (!dateFrom && !dateTo) return null
    return {
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }
  }

  const preview = async (e?: FormEvent) => {
    e?.preventDefault()
    const params = filterParams()
    if (!params) {
      notify(mode === 'single' ? 'Select a training date' : 'Select date from and/or date to', 'error')
      return
    }
    setLoading(true)
    setPreviewed(true)
    try {
      const data = await certificatesApi.search({ ...params, page: 1, page_size: 100 })
      setItems(data.items)
      setTotal(data.total)
      if (data.total === 0) notify('No certificates found for this date filter', 'info')
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  const downloadZip = async () => {
    const params = filterParams()
    if (!params) {
      notify(mode === 'single' ? 'Select a training date' : 'Select date from and/or date to', 'error')
      return
    }
    setDownloading(true)
    try {
      const response = await certificatesApi.bulkDownload(params)
      const blob = new Blob([response.data], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const stamp =
        mode === 'single'
          ? trainingDate
          : `${dateFrom || 'start'}_to_${dateTo || 'end'}`
      a.download = `certificates-${stamp}.zip`
      a.click()
      URL.revokeObjectURL(url)
      notify(`Downloaded ZIP (${total || 'all'} certificates)`, 'success')
    } catch (error) {
      const err = error as { response?: { data?: Blob } }
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          const parsed = JSON.parse(text) as { detail?: string }
          notify(parsed.detail || 'Bulk download failed', 'error')
        } catch {
          notify(getErrorMessage(error), 'error')
        }
      } else {
        notify(getErrorMessage(error), 'error')
      }
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Bulk Download"
        subtitle="Filter certificates by training date and download all matching PDFs as a ZIP"
      />

      <section className="lt-section mb-6">
        <div className="lt-section-head bg-[#0d9488]">Date filter</div>
        <form onSubmit={(e) => void preview(e)} className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                mode === 'single' ? 'bg-[#0b2a5b] text-white' : 'border border-slate-200 bg-white text-slate-700'
              }`}
            >
              Single date
            </button>
            <button
              type="button"
              onClick={() => setMode('range')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                mode === 'range' ? 'bg-[#0b2a5b] text-white' : 'border border-slate-200 bg-white text-slate-700'
              }`}
            >
              Date range
            </button>
          </div>

          {mode === 'single' ? (
            <div className="max-w-xs">
              <label className="mb-1 block text-xs font-bold text-slate-600">Training Date</label>
              <input
                type="date"
                className="lt-input"
                value={trainingDate}
                onChange={(e) => setTrainingDate(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Date From</label>
                <input
                  type="date"
                  className="lt-input"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Date To</label>
                <input
                  type="date"
                  className="lt-input"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={loading || downloading} className="lt-action-btn bg-[#7c3aed]">
              {loading ? 'Loading...' : 'Preview list'}
            </button>
            <button
              type="button"
              disabled={loading || downloading || (previewed && total === 0)}
              onClick={() => void downloadZip()}
              className="lt-action-btn bg-[#16a34a]"
            >
              {downloading ? 'Preparing ZIP...' : 'Download ZIP'}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Already generated PDFs are packed instantly. Only missing PDFs are created (one shared browser — much faster). Max 500.
          </p>
          {downloading && (
            <p className="text-sm font-semibold text-emerald-700">
              Preparing ZIP… first run can take a minute if many PDFs are missing. Please wait.
            </p>
          )}
        </form>
      </section>

      {loading ? (
        <LoadingSpinner label="Loading certificates..." />
      ) : previewed && total === 0 ? (
        <EmptyState title="No certificates" description="Try a different date filter." />
      ) : previewed ? (
        <section className="lt-section">
          <div className="lt-section-head bg-[#0b2a5b]">
            Matching certificates ({total})
          </div>
          <div className="lt-table-wrap">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#123a75] text-xs uppercase tracking-wide text-white">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">S.No</th>
                  <th className="px-3 py-2.5 font-semibold">Certificate No.</th>
                  <th className="px-3 py-2.5 font-semibold">Candidate</th>
                  <th className="px-3 py-2.5 font-semibold">Location</th>
                  <th className="px-3 py-2.5 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((cert, idx) => (
                  <tr key={cert.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-3 py-2.5 text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-semibold">{cert.certificate_number}</td>
                    <td className="px-3 py-2.5">{cert.candidate_name}</td>
                    <td className="max-w-[180px] truncate px-3 py-2.5">{cert.address}</td>
                    <td className="px-3 py-2.5">{formatDate(cert.training_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > items.length && (
            <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
              Showing first {items.length} of {total}. ZIP download includes all matching certificates.
            </p>
          )}
        </section>
      ) : null}
    </div>
  )
}
