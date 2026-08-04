import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { certificatesApi, dashboardApi, templatesApi, settingsApi } from '../api'
import { getErrorMessage } from '../api/client'
import type { Certificate, CertificateFormData, CertificateTemplate, AppSettings } from '../types'
import AuthImage from '../components/AuthImage'
import {
  ConfirmDialog,
  EmptyState,
  LoadingSpinner,
  Pagination,
  StatusBadge,
  notify,
} from '../components/ui'
import { formatDate } from '../utils'
import { COMPANY_LOGOS, matchCompanyLogo, companyLogoPublicUrl } from '../utils/companyLogos'

const emptyForm: CertificateFormData = {
  candidate_name: '',
  address: '',
  training_date: new Date().toISOString().slice(0, 10),
  certificate_number: '',
  driving_licence_number: '',
  company_name: '',
  template_id: null,
  logo_path: '',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<CertificateFormData>(emptyForm)
  const [templates, setTemplates] = useState<CertificateTemplate[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [recent, setRecent] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [savedId, setSavedId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [searchName, setSearchName] = useState('')
  const [searchDl, setSearchDl] = useState('')
  const [listMode, setListMode] = useState<'recent' | 'search'>('recent')
  const [listPage, setListPage] = useState(1)
  const [listPages, setListPages] = useState(1)
  const [listTotal, setListTotal] = useState(0)
  const LIST_PAGE_SIZE = 10

  const load = async () => {
    setLoading(true)
    try {
      const [tpls, next, sett, rec] = await Promise.all([
        templatesApi.list(true),
        certificatesApi.nextNumber(),
        settingsApi.get(),
        dashboardApi.recent(3),
      ])
      setTemplates(tpls)
      setSettings(sett)
      setRecent(rec)
      setListMode('recent')
      setListPage(1)
      setListPages(1)
      setListTotal(rec.length)
      setForm((prev) => ({
        ...prev,
        certificate_number: next.automatic_numbering ? next.certificate_number : prev.certificate_number,
        address: prev.address || sett.default_address || '',
        template_id: sett.default_template_id || tpls.find((t) => t.is_default)?.id || tpls[0]?.id || null,
        signature_path: sett.default_signature_path || '',
      }))
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const setField = <K extends keyof CertificateFormData>(key: K, value: CertificateFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleCompanyNameChange = (value: string) => {
    const match = matchCompanyLogo(value)
    setForm((prev) => {
      const wasAutoLogo = !prev.logo_path || prev.logo_path.startsWith('uploads/company-logos/')
      return {
        ...prev,
        company_name: value,
        logo_path: match ? match.storagePath : wasAutoLogo ? '' : prev.logo_path,
      }
    })
  }

  const autoLogoUrl = companyLogoPublicUrl(form.logo_path) || matchCompanyLogo(form.company_name)?.publicUrl


  const validate = () => {
    if (!form.candidate_name.trim()) {
      notify('Candidate name is required', 'error')
      return false
    }
    if (!form.address.trim()) {
      notify('Training location is required', 'error')
      return false
    }
    if (!form.training_date) {
      notify('Training date is required', 'error')
      return false
    }
    if (!settings?.automatic_numbering && !form.certificate_number?.trim()) {
      notify('Certificate number is required', 'error')
      return false
    }
    return true
  }

  const buildPayload = (): CertificateFormData => ({
    candidate_name: form.candidate_name.trim(),
    address: form.address.trim(),
    training_date: form.training_date,
    driving_licence_number: form.driving_licence_number || undefined,
    company_name: form.company_name || undefined,
    template_id: form.template_id,
    logo_path: form.logo_path || undefined,
    signature_path: form.signature_path || undefined,
    ...(!settings?.automatic_numbering || savedId
      ? { certificate_number: form.certificate_number }
      : {}),
  })

  const saveRecord = async () => {
    if (!validate()) return null
    setBusy(true)
    try {
      const payload = buildPayload()
      let cert: Certificate
      if (savedId) {
        cert = await certificatesApi.update(savedId, payload)
        notify('Record updated', 'success')
      } else {
        cert = await certificatesApi.create(payload)
        notify('Record saved', 'success')
        setSavedId(cert.id)
        setForm((prev) => ({ ...prev, certificate_number: cert.certificate_number }))
      }
      const rec = await dashboardApi.recent(3)
      setRecent(rec)
      setListMode('recent')
      setListPage(1)
      setListPages(1)
      setListTotal(rec.length)
      return cert
    } catch (error) {
      notify(getErrorMessage(error), 'error')
      return null
    } finally {
      setBusy(false)
    }
  }

  const handleGenerate = async () => {
    const cert = await saveRecord()
    if (!cert) return
    setBusy(true)
    try {
      await certificatesApi.generatePdf(cert.id)
      notify('Certificate generated — ready for next candidate', 'success')
      await loadRecentList()
      // Keep Training Company Details; only clear name + DL for next entry
      await prepareNextCandidate()
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleGenerateAndDownload = async () => {
    const cert = await saveRecord()
    if (!cert) return
    setBusy(true)
    try {
      const updated = await certificatesApi.generatePdf(cert.id)
      const response = await certificatesApi.downloadPdf(updated.id)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${updated.certificate_number.replace(/\//g, '-')}-${updated.candidate_name}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      notify('Certificate generated and downloaded', 'success')
      await loadRecentList()
      await prepareNextCandidate()
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  const handlePrint = async () => {
    const cert = savedId ? await certificatesApi.get(savedId) : await saveRecord()
    if (!cert) return
    navigate(`/certificates/${cert.id}/print`)
  }

  const handleLogo = async (file: File | null) => {
    if (!file) return
    try {
      const res = await certificatesApi.uploadLogo(file)
      setField('logo_path', res.path)
      notify('Logo uploaded', 'success')
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    }
  }

  /** After generate: clear only candidate name + DL; keep company/location/date/logo. */
  const prepareNextCandidate = async () => {
    setSavedId(null)
    try {
      const next = await certificatesApi.nextNumber()
      setForm((prev) => ({
        ...prev,
        candidate_name: '',
        driving_licence_number: '',
        certificate_number: next.automatic_numbering ? next.certificate_number : '',
      }))
    } catch {
      setForm((prev) => ({
        ...prev,
        candidate_name: '',
        driving_licence_number: '',
        certificate_number: '',
      }))
    }
  }

  const resetForm = async () => {
    setSavedId(null)
    try {
      const next = await certificatesApi.nextNumber()
      setForm({
        ...emptyForm,
        training_date: new Date().toISOString().slice(0, 10),
        certificate_number: next.automatic_numbering ? next.certificate_number : '',
        address: settings?.default_address || '',
        template_id: settings?.default_template_id || templates[0]?.id || null,
        signature_path: settings?.default_signature_path || '',
      })
    } catch {
      setForm({ ...emptyForm })
    }
  }

  const loadRecentList = async () => {
    const rec = await dashboardApi.recent(3)
    setRecent(rec)
    setListMode('recent')
    setListPage(1)
    setListPages(1)
    setListTotal(rec.length)
  }

  const runSearch = async (p = 1) => {
    setBusy(true)
    try {
      const data = await certificatesApi.search({
        candidate_name: searchName || undefined,
        driving_licence_number: searchDl || undefined,
        page: p,
        page_size: LIST_PAGE_SIZE,
      })
      setRecent(data.items)
      setListMode('search')
      setListPage(data.page)
      setListPages(data.pages)
      setListTotal(data.total)
      if (data.items.length === 0) notify('No certificates found', 'info')
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onSearch = async (e: FormEvent) => {
    e.preventDefault()
    await runSearch(1)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setBusy(true)
    try {
      await certificatesApi.remove(deleteId)
      notify('Certificate deleted', 'success')
      setDeleteId(null)
      await loadRecentList()
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingSpinner label="Loading dashboard..." />

  return (
    <div className="space-y-4">
      {/* Training Company + Certificate Header side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Training Company Details */}
        <section className="lt-section">
          <div className="lt-section-head bg-[#1d6fd8]">Training Company Details</div>
          <div className="grid gap-4 p-4 md:grid-cols-[140px_1fr]">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-center hover:border-blue-400">
              {autoLogoUrl ? (
                <img
                  src={autoLogoUrl}
                  alt="Company logo"
                  className="h-24 w-28 rounded bg-white object-contain p-1"
                />
              ) : form.logo_path ? (
                <AuthImage
                  path={form.logo_path}
                  alt="Company logo"
                  className="h-24 w-28 rounded bg-white object-contain p-1"
                />
              ) : (
                <>
                  <span className="text-3xl text-slate-400">🖼️</span>
                  <span className="mt-1 text-[11px] font-semibold text-slate-500">Upload Logo</span>
                </>
              )}
              <input
                type="file"
                accept=".png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => void handleLogo(e.target.files?.[0] || null)}
              />
            </label>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Training Company Name</label>
                <input
                  className="lt-input"
                  list="company-name-options"
                  value={form.company_name || ''}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  placeholder="e.g. HPCL / IndianOil / BPCL"
                />
                <datalist id="company-name-options">
                  {COMPANY_LOGOS.map((c) => (
                    <option key={c.key} value={c.name} />
                  ))}
                </datalist>
                <p className="mt-1 text-[10px] text-slate-500">
                  Type HPCL, IndianOil or BPCL — logo auto-fills
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Training Location</label>
                <input
                  className="lt-input"
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Certificate Header Details */}
        <section className="lt-section">
          <div className="lt-section-head bg-[#1f9d57]">Certificate Header Details</div>
          <div className="grid gap-3 p-4 sm:grid-cols-1">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Date</label>
              <input
                type="date"
                className="lt-input"
                value={form.training_date}
                onChange={(e) => setField('training_date', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Certificate No.</label>
              <input
                className="lt-input font-semibold"
                value={form.certificate_number || ''}
                onChange={(e) => setField('certificate_number', e.target.value)}
                disabled={!!settings?.automatic_numbering && !savedId}
                placeholder="LT/0004000"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Location</label>
              <div className="relative">
                <span className="lt-input-icon">📍</span>
                <input
                  className="lt-input lt-input-with-icon"
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Candidate Details */}
      <section className="lt-section">
        <div className="lt-section-head bg-[#7c3aed]">Candidate Details</div>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-bold text-slate-600">Candidate Name</label>
            <div className="relative">
              <span className="lt-input-icon">👤</span>
              <input
                className="lt-input lt-input-with-icon w-full"
                value={form.candidate_name}
                onChange={(e) => setField('candidate_name', e.target.value)}
                placeholder="Full name"
              />
            </div>
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-bold text-slate-600">DL Number</label>
            <div className="relative">
              <span className="lt-input-icon">🪪</span>
              <input
                className="lt-input lt-input-with-icon w-full"
                value={form.driving_licence_number || ''}
                onChange={(e) => setField('driving_licence_number', e.target.value)}
                placeholder="Driving licence no."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="lt-section">
        <div className="lt-section-head bg-[#2563eb]">Actions</div>
        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <button type="button" disabled={busy} onClick={() => void handleGenerate()} className="lt-action-btn w-full bg-[#16a34a]">
            ✦ Generate Certificate
          </button>
          <button type="button" disabled={busy} onClick={() => void handleGenerateAndDownload()} className="lt-action-btn w-full bg-[#1d4ed8]">
            ⬇ Generate & Download
          </button>
          <button type="button" disabled={busy} onClick={() => void handlePrint()} className="lt-action-btn w-full bg-[#ea580c]">
            🖨 Print Certificate
          </button>
          <button type="button" disabled={busy} onClick={() => void saveRecord()} className="lt-action-btn w-full bg-[#0284c7]">
            💾 Save Record
          </button>
          <button type="button" disabled={busy} onClick={() => void resetForm()} className="lt-action-btn w-full bg-[#dc2626] sm:col-span-2 lg:col-span-1">
            ↺ Reset Form
          </button>
        </div>
      </section>

      {/* Bulk download by date */}
      <section className="lt-section">
        <div className="lt-section-head bg-[#0f766e]">Bulk Download by Date</div>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Filter certificates by training date and download all matching PDFs in one ZIP file.
          </p>
          <button
            type="button"
            onClick={() => navigate('/bulk-download')}
            className="lt-action-btn w-full shrink-0 bg-[#0d9488] sm:w-auto"
          >
            Open Bulk Download
          </button>
        </div>
      </section>

      {/* Search */}
      <section className="lt-section">
        <div className="lt-section-head bg-[#0d9488]">Search Certificate</div>
        <form onSubmit={onSearch} className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-bold text-slate-600">Search by Name</label>
            <input className="lt-input" value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="Candidate name" />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-bold text-slate-600">Search by DL Number</label>
            <input className="lt-input" value={searchDl} onChange={(e) => setSearchDl(e.target.value)} placeholder="DL number" />
          </div>
          <button type="submit" disabled={busy} className="lt-action-btn w-full bg-[#7c3aed] px-6 sm:w-auto">
            Search
          </button>
          <button
            type="button"
            className="lt-action-btn w-full bg-[#ea580c] px-6 sm:w-auto"
            onClick={() => {
              setSearchName('')
              setSearchDl('')
              void loadRecentList()
            }}
          >
            Clear
          </button>
        </form>
      </section>

      {/* Recent Certificates — latest 3 only (search results are paginated) */}
      <section className="lt-section">
        <div className="lt-section-head bg-[#0b2a5b]">
          {listMode === 'search' ? 'Search Results' : 'Recent Certificates'}
        </div>
        {recent.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={listMode === 'search' ? 'No matches found' : 'No certificates yet'}
              description={
                listMode === 'search'
                  ? 'Try a different name or DL number.'
                  : 'Generate or save a certificate to see it here.'
              }
            />
          </div>
        ) : (
          <>
            <div className="lt-table-wrap">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#123a75] text-xs uppercase tracking-wide text-white">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">S.No</th>
                    <th className="px-3 py-2.5 font-semibold">Certificate No.</th>
                    <th className="px-3 py-2.5 font-semibold">Candidate Name</th>
                    <th className="px-3 py-2.5 font-semibold">DL Number</th>
                    <th className="px-3 py-2.5 font-semibold">Location</th>
                    <th className="px-3 py-2.5 font-semibold">Date</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((cert, idx) => (
                    <tr key={cert.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-3 py-2.5 text-slate-500">
                        {listMode === 'search' ? (listPage - 1) * LIST_PAGE_SIZE + idx + 1 : idx + 1}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">{cert.certificate_number}</td>
                      <td className="px-3 py-2.5">{cert.candidate_name}</td>
                      <td className="px-3 py-2.5">{cert.driving_licence_number || '—'}</td>
                      <td className="max-w-[160px] truncate px-3 py-2.5">{cert.address}</td>
                      <td className="px-3 py-2.5">{formatDate(cert.training_date)}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={cert.print_status} /></td>
                      <td className="px-3 py-2.5">
                        <div className="flex min-w-[168px] flex-wrap gap-1.5">
                          <button
                            type="button"
                            className="rounded-md bg-[#1d4ed8] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:brightness-110"
                            onClick={() => navigate(`/certificates/${cert.id}`)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="rounded-md bg-[#ea580c] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:brightness-110"
                            onClick={() => navigate(`/certificates/${cert.id}/print`)}
                          >
                            Print
                          </button>
                          <button
                            type="button"
                            className="rounded-md bg-[#dc2626] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:brightness-110"
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
            {listMode === 'search' ? (
              <Pagination
                page={listPage}
                pages={listPages}
                total={listTotal}
                pageSize={LIST_PAGE_SIZE}
                onChange={(p) => void runSearch(p)}
              />
            ) : (
              <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
                Showing latest {recent.length} certificate{recent.length === 1 ? '' : 's'}
              </div>
            )}
          </>
        )}
      </section>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete certificate?"
        message="This will permanently delete the certificate record."
        confirmLabel="Delete"
        loading={busy}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
