import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { certificatesApi } from '../api'
import { getErrorMessage } from '../api/client'
import type { Certificate } from '../types'
import {
  ConfirmDialog,
  EmptyState,
  LoadingSpinner,
  PageHeader,
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
  const [busy, setBusy] = useState(false)

  const load = async (p = page) => {
    setLoading(true)
    try {
      const data = await certificatesApi.list(p, 20)
      setItems(data.items)
      setPages(data.pages)
      setTotal(data.total)
      setPage(data.page)
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(1)
  }, [])

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

  return (
    <div>
      <PageHeader
        title="All Certificates"
        subtitle={`${total} certificate record${total === 1 ? '' : 's'}`}
        actions={
          <Link to="/certificates/new" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
            New Certificate
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <EmptyState title="No certificates found" description="Create a certificate to see it listed here." />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="lt-table-wrap">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
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
                    <td className="px-4 py-3 text-slate-500">{(page - 1) * 20 + idx + 1}</td>
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

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-sm text-slate-500">Page {page} of {pages || 1}</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
                onClick={() => void load(page - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pages}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
                onClick={() => void load(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
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
    </div>
  )
}
