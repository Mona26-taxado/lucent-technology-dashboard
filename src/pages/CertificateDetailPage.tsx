import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { certificatesApi, templatesApi } from '../api'
import { getErrorMessage } from '../api/client'
import type { Certificate, CertificateTemplate } from '../types'
import CertificatePreview from '../components/CertificatePreview'
import { LoadingSpinner, PageHeader, StatusBadge, notify } from '../components/ui'
import { formatDate, formatDateTime } from '../utils'

export default function CertificateDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cert, setCert] = useState<Certificate | null>(null)
  const [template, setTemplate] = useState<CertificateTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      try {
        const c = await certificatesApi.get(Number(id))
        setCert(c)
        if (c.template_id) {
          const t = await templatesApi.get(c.template_id)
          setTemplate(t)
        } else {
          const tpls = await templatesApi.list(true)
          setTemplate(tpls.find((t) => t.is_default) || tpls[0] || null)
        }
      } catch (error) {
        notify(getErrorMessage(error), 'error')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  const handleDownload = async () => {
    if (!cert) return
    try {
      setBusy(true)
      let current = cert
      if (!current.pdf_path) {
        current = await certificatesApi.generatePdf(cert.id)
        setCert(current)
      }
      const response = await certificatesApi.downloadPdf(current.id)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${current.certificate_number.replace(/\//g, '-')}-${current.candidate_name}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      notify('PDF downloaded', 'success')
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleGenerate = async () => {
    if (!cert) return
    try {
      setBusy(true)
      const updated = await certificatesApi.generatePdf(cert.id)
      setCert(updated)
      notify('PDF generated successfully', 'success')
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!cert) return <p className="text-slate-500">Certificate not found.</p>

  return (
    <div>
      <PageHeader
        title={cert.candidate_name}
        subtitle={cert.certificate_number}
        actions={
          <>
            <Link to={`/certificates/${cert.id}/edit`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">Edit</Link>
            <button type="button" disabled={busy} onClick={() => void handleGenerate()} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">Generate PDF</button>
            <button type="button" disabled={busy} onClick={() => void handleDownload()} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">Download PDF</button>
            <button type="button" onClick={() => navigate(`/certificates/${cert.id}/print`)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">Print</button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Status</span>
            <StatusBadge status={cert.print_status} />
          </div>
          <Row label="Certificate Number" value={cert.certificate_number} />
          <Row label="Candidate Name" value={cert.candidate_name} />
          <Row label="Address / Location" value={cert.address} />
          <Row label="Training Date" value={formatDate(cert.training_date)} />
          <Row label="Driving Licence" value={cert.driving_licence_number || '—'} />
          <Row label="Company" value={cert.company_name || '—'} />
          <Row label="Training Centre" value={cert.training_centre_name || '—'} />
          <Row label="Print Count" value={String(cert.print_count)} />
          <Row label="Created" value={formatDateTime(cert.created_at)} />
          <Row label="PDF" value={cert.pdf_path ? 'Generated' : 'Not generated'} />
        </div>

        <CertificatePreview data={cert} template={template} />
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  )
}
