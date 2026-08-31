import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { settingsApi, templatesApi } from '../api'
import { getErrorMessage } from '../api/client'
import type { AppSettings, CertificateTemplate } from '../types'
import { LoadingSpinner, PageHeader, notify } from '../components/ui'
import { DEFAULT_PAPER_SIZE } from '../utils'

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [templates, setTemplates] = useState<CertificateTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm: '' })

  useEffect(() => {
    const load = async () => {
      try {
        const [s, t] = await Promise.all([settingsApi.get(), templatesApi.list(true)])
        setSettings(s)
        setTemplates(t)
      } catch (error) {
        notify(getErrorMessage(error), 'error')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    try {
      const updated = await settingsApi.update({
        organization_name: settings.organization_name,
        certificate_prefix: settings.certificate_prefix,
        automatic_numbering: settings.automatic_numbering,
        current_year: settings.current_year,
        current_serial_number: settings.current_serial_number,
        number_padding: settings.number_padding,
        default_template_id: settings.default_template_id,
        date_format: settings.date_format,
        default_address: settings.default_address,
        pdf_storage_directory: settings.pdf_storage_directory,
        paper_size: settings.paper_size || DEFAULT_PAPER_SIZE,
      })
      setSettings(updated)
      notify('Settings saved', 'success')
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (passwords.new_password !== passwords.confirm) {
      notify('New passwords do not match', 'error')
      return
    }
    if (passwords.new_password.length < 6) {
      notify('Password must be at least 6 characters', 'error')
      return
    }
    try {
      await settingsApi.changePassword(passwords.current_password, passwords.new_password)
      notify('Password changed', 'success')
      setPasswords({ current_password: '', new_password: '', confirm: '' })
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    }
  }

  if (loading || !settings) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Settings" subtitle="Organization, numbering and admin preferences" />

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={onSave} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">General</h2>
          <Field label="Organization Name">
            <input className="field" value={settings.organization_name} onChange={(e) => update('organization_name', e.target.value)} />
          </Field>
          <Field label="Default Address">
            <input className="field" value={settings.default_address || ''} onChange={(e) => update('default_address', e.target.value)} />
          </Field>
          <Field label="Date Format (Python strftime)">
            <input className="field" value={settings.date_format} onChange={(e) => update('date_format', e.target.value)} />
          </Field>
          <Field label="Default Certificate Template">
            <select
              className="field"
              value={settings.default_template_id ?? ''}
              onChange={(e) => update('default_template_id', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">None</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.template_name}</option>
              ))}
            </select>
          </Field>
          <div className="rounded-xl border-2 border-[#0b2a5b]/20 bg-[#0b2a5b]/[0.03] p-4 space-y-3">
            <div>
              <h3 className="font-bold text-[#0b2a5b]">PDF / Print Paper Size</h3>
              <p className="mt-1 text-xs text-slate-600">
                Choose once — <strong>all certificates</strong> will use this size for PDFs.
                You do not need to change size on each entry.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  { key: 'a4', title: 'A4', subtitle: '210 × 297 mm', hint: 'Standard office printer' },
                  { key: '8.5x12', title: '8.5 × 12 in', subtitle: '215.9 × 304.8 mm', hint: 'US letter-tall stock' },
                  {
                    key: '9.5x13',
                    title: '9.5 × 13 in',
                    subtitle: '241.3 × 330.2 mm',
                    hint: 'Certificate stock — exact match for print (recommended)',
                  },
                ] as const
              ).map((opt) => {
                const selected = (settings.paper_size || DEFAULT_PAPER_SIZE) === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => update('paper_size', opt.key)}
                    className={`rounded-xl border-2 p-4 text-left transition ${
                      selected
                        ? 'border-[#0b2a5b] bg-[#0b2a5b] text-white shadow-md'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-[#0b2a5b]/40'
                    }`}
                  >
                    <p className="text-lg font-extrabold">{opt.title}</p>
                    <p className={`mt-0.5 text-sm ${selected ? 'text-blue-100' : 'text-slate-500'}`}>{opt.subtitle}</p>
                    <p className={`mt-2 text-[11px] ${selected ? 'text-blue-100' : 'text-slate-400'}`}>{opt.hint}</p>
                    {selected && <p className="mt-2 text-xs font-bold uppercase tracking-wide text-emerald-200">Selected for all PDFs</p>}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-slate-500">
              After you save, this size is used for every Download / Print PDF. You do not need to change paper size in the browser print dialog before sharing.
            </p>
          </div>
          <Field label="PDF Storage Directory">
            <input className="field" value={settings.pdf_storage_directory} onChange={(e) => update('pdf_storage_directory', e.target.value)} />
          </Field>

          <h2 className="pt-2 font-semibold text-slate-800">Certificate Numbering</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.automatic_numbering}
              onChange={(e) => update('automatic_numbering', e.target.checked)}
            />
            Automatic Numbering
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Certificate Prefix">
              <input className="field" value={settings.certificate_prefix} onChange={(e) => update('certificate_prefix', e.target.value)} />
            </Field>
            <Field label="Current Year">
              <input type="number" className="field" value={settings.current_year} onChange={(e) => update('current_year', Number(e.target.value))} />
            </Field>
            <Field label="Starting / Current Serial">
              <input type="number" className="field" value={settings.current_serial_number} onChange={(e) => update('current_serial_number', Number(e.target.value))} />
            </Field>
            <Field label="Number Padding">
              <input type="number" min={1} max={10} className="field" value={settings.number_padding} onChange={(e) => update('number_padding', Number(e.target.value))} />
            </Field>
          </div>
          <p className="text-xs text-slate-500">
            Next number preview: {settings.certificate_prefix}/{String(settings.current_serial_number).padStart(settings.number_padding, '0')}
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium">Default Logo</label>
            <input
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                try {
                  await settingsApi.uploadDefaultLogo(f)
                  setSettings(await settingsApi.get())
                  notify('Default logo updated', 'success')
                } catch (error) {
                  notify(getErrorMessage(error), 'error')
                }
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Default Signature</label>
            <input
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                try {
                  await settingsApi.uploadDefaultSignature(f)
                  setSettings(await settingsApi.get())
                  notify('Default signature updated', 'success')
                } catch (error) {
                  notify(getErrorMessage(error), 'error')
                }
              }}
            />
          </div>

          <button type="submit" disabled={saving} className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>

        <form onSubmit={changePassword} className="h-fit rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Change Admin Password</h2>
          <Field label="Current Password">
            <input type="password" className="field" value={passwords.current_password} onChange={(e) => setPasswords((p) => ({ ...p, current_password: e.target.value }))} required />
          </Field>
          <Field label="New Password">
            <input type="password" className="field" value={passwords.new_password} onChange={(e) => setPasswords((p) => ({ ...p, new_password: e.target.value }))} required />
          </Field>
          <Field label="Confirm New Password">
            <input type="password" className="field" value={passwords.confirm} onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))} required />
          </Field>
          <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
            Change Password
          </button>
        </form>
      </div>

      <style>{`
        .field { width: 100%; border-radius: 0.5rem; border: 1px solid #cbd5e1; padding: 0.55rem 0.75rem; font-size: 0.875rem; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  )
}
