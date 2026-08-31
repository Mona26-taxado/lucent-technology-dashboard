import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { certificatesApi, settingsApi } from '../api'
import { getErrorMessage } from '../api/client'
import type { Certificate, AppSettings } from '../types'
import { LoadingSpinner, notify } from '../components/ui'
import { PAPER_SIZES, DEFAULT_PAPER_SIZE, type PaperSizeKey } from '../utils'

export default function PrintCertificatePage() {
  const { id } = useParams()
  const [cert, setCert] = useState<Certificate | null>(null)
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [preparing, setPreparing] = useState(false)
  const [savingSize, setSavingSize] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const pdfUrlRef = useRef<string | null>(null)

  const revokePdfUrl = () => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current)
      pdfUrlRef.current = null
    }
    setPdfUrl(null)
  }

  const loadPdfPreview = async (certificateId: number) => {
    setPreparing(true)
    try {
      // Always regenerate so preview === download/print file (uses Settings paper_size)
      const updated = await certificatesApi.generatePdf(certificateId)
      setCert(updated)
      const response = await certificatesApi.downloadPdf(certificateId)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current)
      const url = URL.createObjectURL(blob)
      pdfUrlRef.current = url
      setPdfUrl(url)
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setPreparing(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const [c, sett] = await Promise.all([
          certificatesApi.get(Number(id)),
          settingsApi.get(),
        ])
        setCert(c)
        setAppSettings(sett)
        setLoading(false)
        await loadPdfPreview(c.id)
      } catch (error) {
        notify(getErrorMessage(error), 'error')
        setLoading(false)
      }
    }
    void load()
    return () => {
      revokePdfUrl()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const paperKey = (appSettings?.paper_size || DEFAULT_PAPER_SIZE) as PaperSizeKey
  const paper = PAPER_SIZES[paperKey] || PAPER_SIZES[DEFAULT_PAPER_SIZE]

  const setGlobalPaperSize = async (key: PaperSizeKey) => {
    if (!cert || !appSettings || key === paperKey) return
    setSavingSize(true)
    try {
      const updated = await settingsApi.update({ paper_size: key })
      setAppSettings(updated)
      notify(`Paper size set to ${PAPER_SIZES[key].label} for ALL certificates`, 'success')
      await loadPdfPreview(cert.id)
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setSavingSize(false)
    }
  }

  const openPdfForPrintOrShare = async (downloadOnly = false) => {
    if (!cert) return
    setPreparing(true)
    try {
      await loadPdfPreview(cert.id)
      await certificatesApi.markPrinted(cert.id)

      const url = pdfUrlRef.current
      if (!url) throw new Error('PDF preview not ready')
      const filename = `${cert.certificate_number.replace(/\//g, '-')}-${cert.candidate_name}.pdf`

      if (downloadOnly) {
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        notify(`PDF downloaded (${paper.label})`, 'success')
      } else {
        const win = window.open(url, '_blank')
        if (win) {
          setTimeout(() => {
            try {
              win.focus()
              win.print()
            } catch {
              /* ignore */
            }
          }, 600)
          notify(`PDF ready — ${paper.label}. Do not change paper size in the browser print dialog.`, 'success')
        } else {
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          a.click()
          notify('Popup blocked. PDF downloaded instead.', 'info')
        }
      }
    } catch (error) {
      notify(getErrorMessage(error), 'error')
    } finally {
      setPreparing(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!cert) return <p>Certificate not found</p>

  return (
    <div>
      <div className="no-print mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-[#0b2a5b]">Print / PDF</h1>
          <p className="truncate text-sm text-slate-500">
            {cert.certificate_number} · {cert.candidate_name}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Link
            to={`/certificates/${cert.id}`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm"
          >
            Back
          </Link>
          <Link
            to="/settings"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm"
          >
            Settings
          </Link>
          <button
            type="button"
            disabled={preparing || !pdfUrl}
            onClick={() => void openPdfForPrintOrShare(true)}
            className="rounded-lg bg-[#0284c7] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {preparing ? 'Preparing...' : 'Download PDF'}
          </button>
          <button
            type="button"
            disabled={preparing || !pdfUrl}
            onClick={() => void openPdfForPrintOrShare(false)}
            className="rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {preparing ? 'Preparing...' : 'Print PDF'}
          </button>
        </div>
      </div>

      <div className="no-print mb-3 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-bold text-[#0b2a5b]">Global paper size (all certificates)</p>
        <p className="mt-1 text-xs text-slate-500">
          Changing here also updates Settings — every certificate PDF will use this size.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(PAPER_SIZES) as PaperSizeKey[]).map((key) => {
            const opt = PAPER_SIZES[key]
            const selected = key === paperKey
            return (
              <button
                key={key}
                type="button"
                disabled={savingSize || preparing}
                onClick={() => void setGlobalPaperSize(key)}
                className={`rounded-lg border-2 px-4 py-3 text-left transition disabled:opacity-60 ${
                  selected
                    ? 'border-[#0b2a5b] bg-[#0b2a5b] text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-[#0b2a5b]/40'
                }`}
              >
                <span className="block text-sm font-extrabold">{opt.label}</span>
                {selected && <span className="mt-1 block text-[11px] text-emerald-200">Active for every PDF</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="no-print mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Exact PDF ({paper.label}) — certificate fills the full page. Ready to download, print, or share. Do not change the size in the browser print dialog.
      </div>

      <div className="mx-auto overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
        {preparing && !pdfUrl ? (
          <div className="flex min-h-[70vh] items-center justify-center">
            <LoadingSpinner label="Preparing exact print PDF..." />
          </div>
        ) : pdfUrl ? (
          <iframe
            title="Certificate PDF preview"
            src={`${pdfUrl}#view=FitH`}
            className="h-[75vh] w-full bg-white"
          />
        ) : (
          <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-slate-500">
            PDF preview unavailable. Try Download PDF again.
          </div>
        )}
      </div>
    </div>
  )
}
