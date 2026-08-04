import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { certificatesApi, templatesApi, settingsApi } from '../api'
import { getErrorMessage } from '../api/client'
import type { CertificateFormData, CertificateTemplate, AppSettings, Certificate } from '../types'
import CertificatePreview from '../components/CertificatePreview'
import { LoadingSpinner, PageHeader, notify } from '../components/ui'

const emptyForm: CertificateFormData = {
  candidate_name: '',
  address: '',
  training_date: new Date().toISOString().slice(0, 10),
  certificate_number: '',
  driving_licence_number: '',
  company_name: '',
  training_centre_name: '',
  authorized_person_name: '',
  certificate_title: '',
  certificate_description: '',
  template_id: null,
  logo_path: '',
  signature_path: '',
}

export default function CertificateFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState<CertificateFormData>(emptyForm)
  const [templates, setTemplates] = useState<CertificateTemplate[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [savedId, setSavedId] = useState<number | null>(id ? Number(id) : null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === form.template_id) || templates.find((t) => t.is_default) || templates[0],
    [templates, form.template_id],
  )

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [tpls, next, sett] = await Promise.all([
          templatesApi.list(true),
          certificatesApi.nextNumber(),
          settingsApi.get(),
        ])
        setTemplates(tpls)
        setSettings(sett)

        if (isEdit && id) {
          const cert = await certificatesApi.get(Number(id))
          setForm({
            candidate_name: cert.candidate_name,
            address: cert.address,
            training_date: cert.training_date,
            certificate_number: cert.certificate_number,
            driving_licence_number: cert.driving_licence_number || '',
            company_name: cert.company_name || '',
            training_centre_name: cert.training_centre_name || '',
            authorized_person_name: cert.authorized_person_name || '',
            certificate_title: cert.certificate_title || '',
            certificate_description: cert.certificate_description || '',
            template_id: cert.template_id,
            logo_path: cert.logo_path || '',
            signature_path: cert.signature_path || '',
          })
          setSavedId(cert.id)
        } else {
          setForm((prev) => ({
            ...prev,
            certificate_number: next.automatic_numbering ? next.certificate_number : '',
            address: sett.default_address || '',
            // Do not auto-fill title/company — already printed on Certificate.pdf artwork
            company_name: '',
            template_id: sett.default_template_id || tpls.find((t) => t.is_default)?.id || tpls[0]?.id || null,
            logo_path: '',
            signature_path: sett.default_signature_path || '',
          }))
        }
      } catch (error) {
        notify(getErrorMessage(error), 'error')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id, isEdit])

  const setField = <K extends keyof CertificateFormData>(key: K, value: CertificateFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.candidate_name.trim()) next.candidate_name = 'Candidate name is required'
    if (!form.address.trim()) next.address = 'Address / location is required'
    if (!form.training_date) next.training_date = 'Training date is required'
    if (!settings?.automatic_numbering && !form.certificate_number?.trim()) {
      next.certificate_number = 'Certificate number is required'
    }
    if (!form.template_id) next.template_id = 'Please select a template'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const buildPayload = (): CertificateFormData => {
    const payload: CertificateFormData = {
      candidate_name: form.candidate_name.trim(),
      address: form.address.trim(),
      training_date: form.training_date,
      driving_licence_number: form.driving_licence_number || undefined,
      company_name: form.company_name || undefined,
      training_centre_name: form.training_centre_name || undefined,
      authorized_person_name: form.authorized_person_name || undefined,
      certificate_title: form.certificate_title || undefined,
      certificate_description: form.certificate_description || undefined,
      template_id: form.template_id,
      logo_path: form.logo_path || undefined,
      signature_path: form.signature_path || undefined,
    }
    if (!settings?.automatic_numbering || isEdit) {
      payload.certificate_number = form.certificate_number
    }
    return payload
  }

  const saveRecord = async () => {
    if (!validate()) {
      notify('Please fill all mandatory fields', 'error')
      return null
    }
    setSaving(true)
    try {
      const payload = buildPayload()
      let cert: Certificate
      if (savedId) {
        cert = await certificatesApi.update(savedId, payload)
        notify('Certificate updated', 'success')
      } else {
        cert = await certificatesApi.create(payload)
        notify('Certificate saved', 'success')
        setSavedId(cert.id)
        setForm((prev) => ({ ...prev, certificate_number: cert.certificate_number }))
      }
      return cert
    } catch (error) {
      notify(getErrorMessage(error), 'error')
      return null
    } finally {
      setSaving(false)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const cert = await saveRecord()
    if (cert) navigate(`/certificates/${cert.id}`)
  }

  const handleGenerate = async () => {
    const cert = await saveRecord()
    if (!cert) return
    try {
      setSaving(true)
      await certificatesApi.generatePdf(cert.id)
      notify('Certificate PDF generated', 'success')
      navigate(`/certificates/${cert.id}`)
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async () => {
    let certId = savedId
    if (!certId) {
      const cert = await saveRecord()
      if (!cert) return
      certId = cert.id
    }
    try {
      setSaving(true)
      let cert = await certificatesApi.get(certId)
      if (!cert.pdf_path) {
        cert = await certificatesApi.generatePdf(certId)
      }
      const response = await certificatesApi.downloadPdf(cert.id)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${cert.certificate_number.replace(/\//g, '-')}-${cert.candidate_name}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      notify('PDF downloaded', 'success')
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = async () => {
    const cert = savedId ? await certificatesApi.get(savedId) : await saveRecord()
    if (!cert) return
    navigate(`/certificates/${cert.id}/print`)
  }

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return
    try {
      const res = await certificatesApi.uploadLogo(file)
      setField('logo_path', res.path)
      notify('Logo uploaded', 'success')
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    }
  }

  const resetForm = () => {
    if (isEdit) return
    setForm({
      ...emptyForm,
      training_date: new Date().toISOString().slice(0, 10),
      address: settings?.default_address || '',
            company_name: '',
      template_id: settings?.default_template_id || templates[0]?.id || null,
      logo_path: '',
      signature_path: settings?.default_signature_path || '',
      certificate_number: settings?.automatic_numbering ? form.certificate_number : '',
    })
    setSavedId(null)
    setShowPreview(false)
    setErrors({})
  }

  if (loading) return <LoadingSpinner label="Loading form..." />

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Certificate' : 'Create Certificate'}
        subtitle="Enter candidate details and generate a printable certificate"
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Candidate Name *</label>
              <input
                className="input"
                value={form.candidate_name}
                onChange={(e) => setField('candidate_name', e.target.value)}
              />
              {errors.candidate_name && <p className="error">{errors.candidate_name}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Address / Training Location *</label>
              <textarea
                className="input min-h-[80px]"
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
              />
              {errors.address && <p className="error">{errors.address}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Training Date *</label>
              <input
                type="date"
                className="input"
                value={form.training_date}
                onChange={(e) => setField('training_date', e.target.value)}
              />
              {errors.training_date && <p className="error">{errors.training_date}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Certificate Number {!settings?.automatic_numbering && '*'}
              </label>
              <input
                className="input"
                value={form.certificate_number}
                onChange={(e) => setField('certificate_number', e.target.value)}
                disabled={!!settings?.automatic_numbering && !isEdit}
                placeholder={settings?.automatic_numbering ? 'Auto-generated' : 'LT/0004000'}
              />
              {errors.certificate_number && <p className="error">{errors.certificate_number}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Certificate Template *</label>
              <select
                className="input"
                value={form.template_id ?? ''}
                onChange={(e) => setField('template_id', e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Select template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.template_name}{t.is_default ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
              {errors.template_id && <p className="error">{errors.template_id}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Driving Licence Number</label>
              <input
                className="input"
                value={form.driving_licence_number || ''}
                onChange={(e) => setField('driving_licence_number', e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Company / Client Logo</label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                className="block w-full text-sm"
                onChange={(e) => void handleLogoUpload(e.target.files?.[0] || null)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Company Name</label>
              <input
                className="input"
                value={form.company_name || ''}
                onChange={(e) => setField('company_name', e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Training Centre Name</label>
              <input
                className="input"
                value={form.training_centre_name || ''}
                onChange={(e) => setField('training_centre_name', e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Authorized Person Name</label>
              <input
                className="input"
                value={form.authorized_person_name || ''}
                onChange={(e) => setField('authorized_person_name', e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Certificate Title</label>
              <input
                className="input"
                value={form.certificate_title || ''}
                onChange={(e) => setField('certificate_title', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Certificate Description</label>
              <textarea
                className="input min-h-[70px]"
                value={form.certificate_description || ''}
                onChange={(e) => setField('certificate_description', e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button type="button" disabled={saving} onClick={() => void handleGenerate()} className="btn-primary">
              Generate Certificate
            </button>
            <button type="button" onClick={() => setShowPreview(true)} className="btn-secondary">
              Preview Certificate
            </button>
            <button type="submit" disabled={saving} className="btn-secondary">
              Save Record
            </button>
            <button type="button" disabled={saving} onClick={() => void handleDownload()} className="btn-secondary">
              Download PDF
            </button>
            <button type="button" disabled={saving} onClick={() => void handlePrint()} className="btn-secondary">
              Print Certificate
            </button>
            {!isEdit && (
              <button type="button" onClick={resetForm} className="btn-ghost">
                Reset Form
              </button>
            )}
          </div>
        </form>

        <div>
          {(showPreview || isEdit) && (
            <CertificatePreview data={form} template={selectedTemplate} />
          )}
          {!showPreview && !isEdit && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Click <strong>Preview Certificate</strong> to see the A4 layout with your fields overlaid on the template background.
            </div>
          )}
        </div>
      </div>

      <style>{`
        .input { width: 100%; border-radius: 0.5rem; border: 1px solid #cbd5e1; padding: 0.55rem 0.75rem; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
        .error { margin-top: 0.25rem; font-size: 0.75rem; color: #dc2626; }
        .btn-primary { border-radius: 0.5rem; background: #1d4ed8; color: white; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 600; }
        .btn-primary:hover { background: #1e40af; }
        .btn-primary:disabled { opacity: 0.6; }
        .btn-secondary { border-radius: 0.5rem; border: 1px solid #cbd5e1; background: white; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #1e293b; }
        .btn-secondary:hover { background: #f8fafc; }
        .btn-ghost { border-radius: 0.5rem; padding: 0.5rem 1rem; font-size: 0.875rem; color: #64748b; }
        .btn-ghost:hover { background: #f1f5f9; }
      `}</style>
    </div>
  )
}
