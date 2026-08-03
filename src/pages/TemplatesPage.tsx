import { type FormEvent, useEffect, useState } from 'react'
import { templatesApi } from '../api'
import { getErrorMessage } from '../api/client'
import type { CertificateTemplate, FieldPositions, FieldPosition } from '../types'
import AuthImage from '../components/AuthImage'
import CertificatePreview from '../components/CertificatePreview'
import {
  ConfirmDialog,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  notify,
} from '../components/ui'
import { DEFAULT_FIELD_POSITIONS } from '../utils'

const FIELD_KEYS = [
  'candidate_name',
  'address',
  'training_date',
  'certificate_number',
  'logo',
  'driving_licence_number',
  'signature',
  'company_name',
  'training_centre_name',
  'authorized_person_name',
  'certificate_title',
  'certificate_description',
] as const

const FIELD_LABELS: Record<string, string> = {
  candidate_name: 'Candidate Name',
  address: 'Address',
  training_date: 'Date',
  certificate_number: 'Certificate Number',
  logo: 'Logo',
  driving_licence_number: 'Driving Licence Number',
  signature: 'Signature',
  company_name: 'Company Name',
  training_centre_name: 'Training Centre Name',
  authorized_person_name: 'Authorized Person Name',
  certificate_title: 'Certificate Title',
  certificate_description: 'Certificate Description',
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CertificateTemplate | null>(null)
  const [positions, setPositions] = useState<FieldPositions>(DEFAULT_FIELD_POSITIONS as FieldPositions)
  const [activeField, setActiveField] = useState<string>('candidate_name')
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isDefault, setIsDefault] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await templatesApi.list()
      setTemplates(data)
      if (selected) {
        const refreshed = data.find((t) => t.id === selected.id) || null
        setSelected(refreshed)
        if (refreshed) setPositions({ ...DEFAULT_FIELD_POSITIONS, ...refreshed.field_positions_json })
      }
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const selectTemplate = (t: CertificateTemplate) => {
    setSelected(t)
    setPositions({ ...DEFAULT_FIELD_POSITIONS, ...t.field_positions_json })
    setName(t.template_name)
    setIsDefault(t.is_default)
  }

  const updatePosition = (field: string, key: keyof FieldPosition, value: string | number) => {
    setPositions((prev) => ({
      ...prev,
      [field]: {
        ...(prev[field] || {}),
        [key]: typeof value === 'string' && ['x', 'y', 'width', 'height', 'font_size'].includes(key)
          ? Number(value)
          : value,
      },
    }))
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !file) {
      notify('Template name and background image are required', 'error')
      return
    }
    setBusy(true)
    try {
      const form = new FormData()
      form.append('template_name', name.trim())
      form.append('is_default', String(isDefault))
      form.append('is_active', 'true')
      form.append('field_positions_json', JSON.stringify(positions))
      form.append('background', file)
      const created = await templatesApi.create(form)
      notify('Template created', 'success')
      setFile(null)
      await load()
      selectTemplate(created)
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleSavePositions = async () => {
    if (!selected) return
    setBusy(true)
    try {
      const form = new FormData()
      form.append('template_name', name.trim() || selected.template_name)
      form.append('field_positions_json', JSON.stringify(positions))
      form.append('is_default', String(isDefault))
      form.append('is_active', String(selected.is_active))
      if (file) form.append('background', file)
      const updated = await templatesApi.update(selected.id, form)
      notify('Template saved', 'success')
      await load()
      selectTemplate(updated)
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleSetDefault = async (id: number) => {
    try {
      await templatesApi.setDefault(id)
      notify('Default template updated', 'success')
      await load()
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    }
  }

  const handleToggleActive = async (t: CertificateTemplate) => {
    try {
      const form = new FormData()
      form.append('is_active', String(!t.is_active))
      await templatesApi.update(t.id, form)
      notify(t.is_active ? 'Template deactivated' : 'Template activated', 'success')
      await load()
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setBusy(true)
    try {
      await templatesApi.remove(deleteId)
      notify('Template deleted', 'success')
      if (selected?.id === deleteId) setSelected(null)
      setDeleteId(null)
      await load()
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  const previewData = {
    candidate_name: 'Sanjay Sen Pramanik',
    address: 'Training Centre, Kolkata',
    training_date: '2026-08-03',
    certificate_number: 'LT/0004000',
    driving_licence_number: 'DL-1234567890',
    company_name: 'Lucent Technology',
    training_centre_name: 'Central Training Hub',
    authorized_person_name: 'Authorized Signatory',
    certificate_title: 'Certificate of Training',
    certificate_description: 'has successfully completed the required training programme.',
  }

  const currentField = positions[activeField] || {}

  return (
    <div>
      <PageHeader
        title="Certificate Templates"
        subtitle="Upload A4 backgrounds and configure field positions as percentages"
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="font-semibold text-slate-800">{selected ? 'Update / New Template' : 'Upload Template'}</h2>
            <div>
              <label className="mb-1 block text-sm font-medium">Template Name</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Background Image (PNG/JPG)</label>
              <input type="file" accept=".png,.jpg,.jpeg" className="block w-full text-sm" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
              Set as default
            </label>
            <div className="flex flex-wrap gap-2">
              {!selected && (
                <button type="submit" disabled={busy} className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  Upload Template
                </button>
              )}
              {selected && (
                <button type="button" disabled={busy} onClick={() => void handleSavePositions()} className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  Save Changes
                </button>
              )}
              {selected && (
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
                  onClick={() => {
                    setSelected(null)
                    setName('')
                    setFile(null)
                    setIsDefault(false)
                    setPositions(DEFAULT_FIELD_POSITIONS as FieldPositions)
                  }}
                >
                  New Template
                </button>
              )}
            </div>
          </form>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-slate-800">Field Position Editor</h2>
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium">Field</label>
              <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={activeField} onChange={(e) => setActiveField(e.target.value)}>
                {FIELD_KEYS.map((k) => (
                  <option key={k} value={k}>{FIELD_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(['x', 'y', 'width'] as const).map((key) => (
                <div key={key}>
                  <label className="mb-1 block capitalize text-slate-600">{key} (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={currentField[key] ?? 0}
                    onChange={(e) => updatePosition(activeField, key, e.target.value)}
                  />
                </div>
              ))}
              {(activeField === 'logo' || activeField === 'signature') && (
                <div>
                  <label className="mb-1 block text-slate-600">Height (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={currentField.height ?? 10}
                    onChange={(e) => updatePosition(activeField, 'height', e.target.value)}
                  />
                </div>
              )}
              {activeField !== 'logo' && activeField !== 'signature' && (
                <>
                  <div>
                    <label className="mb-1 block text-slate-600">Font size (pt)</label>
                    <input type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={currentField.font_size ?? 14} onChange={(e) => updatePosition(activeField, 'font_size', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-600">Font family</label>
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={currentField.font_family ?? ''} onChange={(e) => updatePosition(activeField, 'font_family', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-600">Font weight</label>
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={currentField.font_weight ?? '400'} onChange={(e) => updatePosition(activeField, 'font_weight', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-600">Text color</label>
                    <input type="color" className="h-10 w-full rounded-lg border border-slate-300" value={currentField.text_color ?? '#2d3748'} onChange={(e) => updatePosition(activeField, 'text_color', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-600">Alignment</label>
                    <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={currentField.text_align ?? 'center'} onChange={(e) => updatePosition(activeField, 'text_align', e.target.value)}>
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3 font-semibold">Templates</div>
            {loading ? (
              <LoadingSpinner />
            ) : templates.length === 0 ? (
              <div className="p-5"><EmptyState title="No templates yet" description="Upload an A4 certificate background to begin." /></div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {templates.map((t) => (
                  <li key={t.id} className={`px-5 py-4 ${selected?.id === t.id ? 'bg-brand-50' : ''}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button type="button" className="text-left" onClick={() => selectTemplate(t)}>
                        <p className="font-medium text-slate-800">{t.template_name}</p>
                        <p className="text-xs text-slate-500">
                          {t.is_default ? 'Default · ' : ''}{t.is_active ? 'Active' : 'Inactive'}
                        </p>
                      </button>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <button type="button" className="text-brand-700 hover:underline" onClick={() => selectTemplate(t)}>Preview</button>
                        {!t.is_default && (
                          <button type="button" className="text-brand-700 hover:underline" onClick={() => void handleSetDefault(t.id)}>Set Default</button>
                        )}
                        <button type="button" className="text-brand-700 hover:underline" onClick={() => void handleToggleActive(t)}>
                          {t.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button type="button" className="text-red-600 hover:underline" onClick={() => setDeleteId(t.id)}>Delete</button>
                      </div>
                    </div>
                    <AuthImage
                      path={t.background_image_path}
                      alt={t.template_name}
                      className="mt-3 h-20 w-auto rounded border border-slate-200 object-cover"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <CertificatePreview
            data={previewData}
            template={selected ? { ...selected, field_positions_json: positions } : selected}
            fieldPositions={positions}
          />
        </div>
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete template?"
        message="Only unused templates can be deleted. Templates in use should be deactivated instead."
        confirmLabel="Delete"
        loading={busy}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
