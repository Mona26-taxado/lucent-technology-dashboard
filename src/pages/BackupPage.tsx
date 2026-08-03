import { useState } from 'react'
import api from '../api/client'
import { getErrorMessage } from '../api/client'
import { PageHeader, notify } from '../components/ui'

export default function BackupPage() {
  const [busy, setBusy] = useState(false)

  const downloadBackup = async () => {
    setBusy(true)
    try {
      const response = await api.get('/backup/download', { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      a.href = url
      a.download = `certificate-backup-${stamp}.zip`
      a.click()
      URL.revokeObjectURL(url)
      notify('Backup downloaded', 'success')
    } catch (error) {
      notify(getErrorMessage(error, 'Backup failed'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title="Backup" subtitle="Download a zip archive of the database and uploaded files" />
      <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">
          The backup includes the SQLite database (if used), uploaded logos, templates, signatures, and generated PDF certificates.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void downloadBackup()}
          className="mt-5 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {busy ? 'Preparing backup...' : 'Download Backup ZIP'}
        </button>
      </div>
    </div>
  )
}
