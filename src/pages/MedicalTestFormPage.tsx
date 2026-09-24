import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { medicalTestsApi } from '../api'
import { getErrorMessage } from '../api/client'
import type { MedicalTest, MedicalTestFormData, MedicalTestListResponse } from '../types'
import { ConfirmDialog, LoadingSpinner, Pagination, notify } from '../components/ui'
import GlobeHospitalForm from '../components/medical/GlobeHospitalForm'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
const DEFAULT_PAGE_SIZE = 10

function todayStamp() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function triggerZipDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function sleep(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function runBulkExportJob(
  payload: { ids?: number[]; export_all?: boolean },
  onProgress: (p: { done: number; total: number }) => void,
): Promise<{ blob: Blob; total: number }> {
  const created = await medicalTestsApi.createBulkDownloadJob(payload)
  onProgress({ done: created.processed, total: created.total })
  let job = created
  while (job.status === 'queued' || job.status === 'processing') {
    await sleep(800)
    job = await medicalTestsApi.getBulkDownloadJob(job.job_id)
    onProgress({ done: job.processed, total: job.total })
  }
  if (job.status === 'failed') {
    throw new Error(job.error || 'Export failed')
  }
  if (job.status !== 'completed') {
    throw new Error(`Unexpected export status: ${job.status}`)
  }
  const response = await medicalTestsApi.downloadBulkDownloadJobFile(job.job_id)
  return {
    blob: new Blob([response.data], { type: 'application/zip' }),
    total: job.total,
  }
}

function todayStr() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

function blankForm(): MedicalTestFormData {
  return {
    exam_date: todayStr(),
    vehicle_number: '',
    company_name: '',
    patient_name: '',
    age: null,
    gender: '',
    height: '',
    weight: '',
    chest: '',
    blood_pressure: '',
    pulse: '',
    blood_sugar: '',
    lab_investigation: '',
    final_impression: '',
    certified_name: '',
    examiner_name: '',
    examiner_qualification: '',
    examiner_place: 'Lucknow',
  }
}

function formFromRow(row: MedicalTest): MedicalTestFormData {
  return {
    exam_date: row.exam_date || todayStr(),
    vehicle_number: row.vehicle_number || '',
    company_name: row.company_name || '',
    patient_name: row.patient_name || '',
    age: row.age ?? null,
    gender: row.gender || '',
    height: row.height || '',
    weight: row.weight || '',
    chest: row.chest || '',
    blood_pressure: row.blood_pressure || '',
    pulse: row.pulse || '',
    blood_sugar: row.blood_sugar || '',
    lab_investigation: row.lab_investigation || '',
    final_impression: row.final_impression || '',
    certified_name: row.certified_name || row.patient_name || '',
    examiner_name: row.examiner_name || '',
    examiner_qualification: row.examiner_qualification || '',
    examiner_place: row.examiner_place || 'Lucknow',
  }
}

async function triggerPdfDownload(id: number, patientName: string) {
  const response = await medicalTestsApi.downloadPdf(id)
  const blob = new Blob([response.data], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safe = (patientName || 'form').replace(/[^\w\-]+/g, '_').slice(0, 40)
  a.download = `medical-${id}-${safe}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function MedicalTestFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const editId = id ? Number(id) : null
  const showHistory = searchParams.get('view') === 'history'
  const isEditMode = Boolean(editId)

  const [form, setForm] = useState<MedicalTestFormData>(blankForm)
  const [savedId, setSavedId] = useState<number | null>(editId)
  const [loading, setLoading] = useState(Boolean(editId))
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const [history, setHistory] = useState<MedicalTestListResponse | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [bulkDownloading, setBulkDownloading] = useState(false)
  const [selectedDownloading, setSelectedDownloading] = useState(false)
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number } | null>(null)
  const [exportFailed, setExportFailed] = useState<string | null>(null)
  const [lastExportKind, setLastExportKind] = useState<'selected' | 'all' | null>(null)
  const [historyPage, setHistoryPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  // Load existing record when editing; clear when opening a brand-new form
  useEffect(() => {
    if (!editId) {
      setForm(blankForm())
      setSavedId(null)
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      try {
        const row = await medicalTestsApi.get(editId)
        setForm(formFromRow(row))
        setSavedId(row.id)
      } catch (error) {
        notify(getErrorMessage(error, 'Failed to load'), 'error')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [editId])

  const loadHistory = useCallback(async (page: number, size: number) => {
    setHistoryLoading(true)
    try {
      let data = await medicalTestsApi.list(page, size)
      const maxPage = Math.max(1, data.pages || 1)
      if (page > maxPage && data.total > 0) {
        data = await medicalTestsApi.list(maxPage, size)
        setHistoryPage(maxPage)
      } else {
        setHistoryPage(page)
      }
      setHistory(data)
      setSelected(new Set())
    } catch (error) {
      notify(getErrorMessage(error, 'Failed to load history'), 'error')
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!showHistory) return
    void loadHistory(historyPage, pageSize)
  }, [showHistory, historyPage, pageSize, loadHistory])

  const update = <K extends keyof MedicalTestFormData>(key: K, value: MedicalTestFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const payload = useMemo((): MedicalTestFormData => {
    const clean = (v?: string | null) => ((v || '').trim() || null)
    const patient = (form.patient_name || '').trim()
    return {
      exam_date: clean(form.exam_date),
      vehicle_number: clean(form.vehicle_number),
      company_name: clean(form.company_name),
      patient_name: patient,
      age: form.age == null || Number.isNaN(Number(form.age)) ? null : Number(form.age),
      gender: clean(form.gender),
      height: clean(form.height),
      weight: clean(form.weight),
      chest: clean(form.chest),
      blood_pressure: clean(form.blood_pressure),
      pulse: clean(form.pulse),
      blood_sugar: clean(form.blood_sugar),
      lab_investigation: clean(form.lab_investigation),
      final_impression: clean(form.final_impression),
      certified_name: clean(form.certified_name) || patient || null,
      examiner_name: clean(form.examiner_name),
      examiner_qualification: clean(form.examiner_qualification),
      examiner_place: clean(form.examiner_place),
    }
  }, [form])

  const saveRecord = async (opts?: { stayOnForm?: boolean }) => {
    if (!payload.patient_name) {
      notify('Patient name is required', 'error')
      return null
    }
    setSaving(true)
    try {
      const wasUpdate = Boolean(savedId)
      const row = savedId
        ? await medicalTestsApi.update(savedId, payload)
        : await medicalTestsApi.create(payload)
      setSavedId(row.id)
      if (wasUpdate) {
        notify('Medical test updated successfully.', 'success')
        if (!opts?.stayOnForm) {
          navigate('/medical-tests?view=history')
        }
      } else {
        notify('Saved', 'success')
        if (!editId) navigate(`/medical-tests/${row.id}`, { replace: true })
      }
      return row
    } catch (error) {
      notify(getErrorMessage(error, 'Failed to save'), 'error')
      return null
    } finally {
      setSaving(false)
    }
  }

  const clearForm = () => {
    setForm(blankForm())
    setSavedId(null)
    if (editId) navigate('/medical-tests', { replace: true })
  }

  const startNewForm = () => {
    setForm(blankForm())
    setSavedId(null)
    navigate('/medical-tests')
  }

  const printForm = async () => {
    const row = await saveRecord({ stayOnForm: true })
    if (!row) return
    window.setTimeout(() => window.print(), 50)
  }

  const downloadPdf = async () => {
    const row = await saveRecord({ stayOnForm: true })
    if (!row) return
    setDownloading(true)
    try {
      await triggerPdfDownload(row.id, row.patient_name)
      notify('PDF downloaded', 'success')
    } catch (error) {
      notify(getErrorMessage(error, 'PDF download failed'), 'error')
    } finally {
      setDownloading(false)
    }
  }

  const downloadAllReports = async () => {
    if (!history || history.total <= 0) {
      notify('No reports to download', 'info')
      return
    }
    setBulkDownloading(true)
    setExportFailed(null)
    setLastExportKind('all')
    setExportProgress({ done: 0, total: history.total })
    try {
      const { blob, total } = await runBulkExportJob({ export_all: true }, setExportProgress)
      triggerZipDownload(blob, `medical-reports-${todayStamp()}.zip`)
      notify(`Downloaded ZIP (${total} reports)`, 'success')
      setExportProgress(null)
    } catch (error) {
      const message = getErrorMessage(error, 'Bulk download failed')
      setExportFailed(message)
      notify(message, 'error')
    } finally {
      setBulkDownloading(false)
    }
  }

  const downloadSelectedReports = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) {
      notify('Select at least one report to download', 'info')
      return
    }
    setSelectedDownloading(true)
    setExportFailed(null)
    setLastExportKind('selected')
    setExportProgress({ done: 0, total: ids.length })
    try {
      const { blob, total } = await runBulkExportJob({ ids }, setExportProgress)
      triggerZipDownload(blob, `medical-test-reports-${todayStamp()}.zip`)
      notify(`Downloaded ZIP (${total} selected report${total === 1 ? '' : 's'})`, 'success')
      setExportProgress(null)
    } catch (error) {
      const message = getErrorMessage(error, 'Download selected failed')
      setExportFailed(message)
      notify(message, 'error')
    } finally {
      setSelectedDownloading(false)
    }
  }

  const retryLastExport = () => {
    if (lastExportKind === 'all') void downloadAllReports()
    else if (lastExportKind === 'selected') void downloadSelectedReports()
  }

  const pageItems = history?.items ?? []
  const currentPage = history?.page ?? historyPage
  const currentPageSize = history?.page_size ?? pageSize
  const serialForRow = (rowIndex: number) => (currentPage - 1) * currentPageSize + rowIndex + 1
  const allPageSelected = pageItems.length > 0 && pageItems.every((r) => selected.has(r.id))
  const anyBulkBusy = busy || bulkDownloading || selectedDownloading
  const preparingLabel =
    exportProgress != null
      ? `Preparing ${exportProgress.done}/${exportProgress.total}…`
      : 'Preparing…'

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        pageItems.forEach((r) => next.delete(r.id))
      } else {
        pageItems.forEach((r) => next.add(r.id))
      }
      return next
    })
  }

  const toggleOne = (rowId: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  const handleDeleteOne = async () => {
    if (deleteId == null) return
    setBusy(true)
    try {
      await medicalTestsApi.remove(deleteId)
      notify('1 medical test report deleted successfully.', 'success')
      setDeleteId(null)
      await loadHistory(historyPage, pageSize)
    } catch (error) {
      notify(getErrorMessage(error, 'Delete failed'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    setBusy(true)
    try {
      const ids = [...selected]
      const res = await medicalTestsApi.bulkRemove(ids)
      notify(res.message || `${ids.length} medical test reports deleted successfully.`, 'success')
      setBulkDeleteOpen(false)
      setSelected(new Set())
      await loadHistory(historyPage, pageSize)
    } catch (error) {
      notify(getErrorMessage(error, 'Bulk delete failed'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleRowDownload = async (row: MedicalTest) => {
    setBusy(true)
    try {
      await triggerPdfDownload(row.id, row.patient_name)
      notify('PDF downloaded', 'success')
    } catch (error) {
      notify(getErrorMessage(error, 'PDF download failed'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleRowPrint = async (row: MedicalTest) => {
    setBusy(true)
    try {
      const response = await medicalTestsApi.downloadPdf(row.id)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (win) {
        win.addEventListener('load', () => {
          win.focus()
          win.print()
        })
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      notify(getErrorMessage(error, 'Print failed'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const changePageSize = (size: number) => {
    setPageSize(size)
    setHistoryPage(1)
    setSelected(new Set())
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner label="Loading..." />
      </div>
    )
  }

  if (showHistory) {
    const actionBtn =
      'rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-white hover:brightness-110 disabled:opacity-60 sm:py-1'

    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h1 className="text-lg font-extrabold text-[#0b2a5b] sm:text-xl">Medical Test History</h1>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            {selected.size > 0 ? (
              <>
                <span className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 sm:justify-start">
                  {selected.size} selected
                </span>
                <button
                  type="button"
                  disabled={anyBulkBusy}
                  onClick={() => void downloadSelectedReports()}
                  className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 sm:py-2"
                >
                  {selectedDownloading
                    ? preparingLabel
                    : `⬇ Download Selected (${selected.size})`}
                </button>
                <button
                  type="button"
                  disabled={anyBulkBusy}
                  onClick={() => setBulkDeleteOpen(true)}
                  className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 sm:py-2"
                >
                  Delete Selected ({selected.size})
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => void downloadAllReports()}
              disabled={anyBulkBusy || historyLoading || !history || history.total <= 0}
              className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 sm:py-2"
            >
              {bulkDownloading ? preparingLabel : '⬇ Download All Reports'}
            </button>
            <button
              type="button"
              onClick={startNewForm}
              className="rounded-lg bg-[#1d6fd8] px-4 py-2.5 text-sm font-bold text-white sm:py-2"
            >
              + New Form
            </button>
          </div>
        </div>

        {exportFailed && !anyBulkBusy ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <span>{exportFailed}</span>
            <button
              type="button"
              onClick={retryLastExport}
              className="rounded-md bg-red-600 px-3 py-1 text-xs font-bold text-white"
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="w-full overflow-hidden rounded-xl border bg-white">
          <div className="flex w-full flex-col gap-2 border-b border-slate-100 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 md:hidden">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleAllOnPage}
                  aria-label="Select all on page"
                  className="h-4 w-4"
                  disabled={!pageItems.length}
                />
                Select page
              </label>
              <p className="text-sm text-slate-500">
                {history
                  ? `${history.total} report${history.total === 1 ? '' : 's'}`
                  : '—'}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span className="whitespace-nowrap">Rows per page</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium"
                value={pageSize}
                onChange={(e) => changePageSize(Number(e.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {historyLoading ? (
            <div className="p-8">
              <LoadingSpinner />
            </div>
          ) : !history?.items.length ? (
            <p className="p-8 text-center text-sm text-slate-500">No records yet.</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="divide-y divide-slate-100 md:hidden">
                {pageItems.map((row, rowIndex) => (
                  <div key={row.id} className="space-y-3 p-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        aria-label={`Select report ${row.id}`}
                        className="mt-1 h-4 w-4 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="shrink-0 text-xs font-bold text-slate-400">
                            #{serialForRow(rowIndex)}
                          </span>
                          <p className="truncate text-base font-bold text-[#0b2a5b]">{row.patient_name}</p>
                        </div>
                        <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
                          <div>
                            <dt className="font-semibold text-slate-400">Date</dt>
                            <dd>{row.exam_date || '—'}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-slate-400">Vehicle</dt>
                            <dd className="truncate font-medium text-slate-800">{row.vehicle_number || '—'}</dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="font-semibold text-slate-400">Company</dt>
                            <dd className="truncate">{row.company_name || '—'}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                      <Link
                        to={`/medical-tests/${row.id}`}
                        className={`${actionBtn} bg-slate-600 text-center`}
                      >
                        View
                      </Link>
                      <Link
                        to={`/medical-tests/${row.id}`}
                        className={`${actionBtn} bg-[#1d6fd8] text-center`}
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={anyBulkBusy}
                        onClick={() => void handleRowPrint(row)}
                        className={`${actionBtn} bg-violet-600`}
                      >
                        Print
                      </button>
                      <button
                        type="button"
                        disabled={anyBulkBusy}
                        onClick={() => void handleRowDownload(row)}
                        className={`${actionBtn} bg-orange-500`}
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        disabled={anyBulkBusy}
                        onClick={() => setDeleteId(row.id)}
                        className={`${actionBtn} col-span-3 bg-red-600 sm:col-span-1`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table — fills full card width */}
              <div className="medical-history-table-wrap hidden md:block">
                <table className="medical-history-table text-left text-sm">
                  <colgroup>
                    <col className="mh-col-check" />
                    <col className="mh-col-sno" />
                    <col className="mh-col-date" />
                    <col className="mh-col-vehicle" />
                    <col className="mh-col-patient" />
                    <col className="mh-col-company" />
                    <col className="mh-col-actions" />
                  </colgroup>
                  <thead className="bg-[#0b2a5b] text-white">
                    <tr>
                      <th className="px-3 py-3 font-medium">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          onChange={toggleAllOnPage}
                          aria-label="Select all on page"
                          className="h-4 w-4 accent-white"
                        />
                      </th>
                      <th className="px-2 py-3 text-center">S.No.</th>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Vehicle Number</th>
                      <th className="px-3 py-3">Patient</th>
                      <th className="px-3 py-3">Company</th>
                      <th className="px-3 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((row, rowIndex) => (
                      <tr key={row.id} className="border-t border-slate-100 align-middle">
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(row.id)}
                            onChange={() => toggleOne(row.id)}
                            aria-label={`Select report ${row.id}`}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-2 py-3 text-center font-semibold text-slate-600">
                          {serialForRow(rowIndex)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">{row.exam_date || '—'}</td>
                        <td className="truncate px-3 py-3 font-medium">{row.vehicle_number || '—'}</td>
                        <td className="truncate px-3 py-3 font-semibold">{row.patient_name}</td>
                        <td className="truncate px-3 py-3">{row.company_name || '—'}</td>
                        <td className="px-3 py-3">
                          <div className="mh-actions">
                            <Link
                              to={`/medical-tests/${row.id}`}
                              className={`${actionBtn} bg-slate-600`}
                            >
                              View
                            </Link>
                            <Link
                              to={`/medical-tests/${row.id}`}
                              className={`${actionBtn} bg-[#1d6fd8]`}
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              disabled={anyBulkBusy}
                              onClick={() => void handleRowPrint(row)}
                              className={`${actionBtn} bg-violet-600`}
                            >
                              Print
                            </button>
                            <button
                              type="button"
                              disabled={anyBulkBusy}
                              onClick={() => void handleRowDownload(row)}
                              className={`${actionBtn} bg-orange-500`}
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              disabled={anyBulkBusy}
                              onClick={() => setDeleteId(row.id)}
                              className={`${actionBtn} bg-red-600`}
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
                page={history.page}
                pages={history.pages}
                total={history.total}
                pageSize={history.page_size}
                className="w-full"
                onChange={(p) => {
                  setSelected(new Set())
                  setHistoryPage(p)
                }}
              />
            </>
          )}
        </div>

        <ConfirmDialog
          open={deleteId !== null}
          title="Delete report?"
          message="Are you sure you want to permanently delete this medical test record? This action cannot be undone."
          confirmLabel="Delete Report"
          loading={busy}
          onCancel={() => setDeleteId(null)}
          onConfirm={() => void handleDeleteOne()}
        />

        <ConfirmDialog
          open={bulkDeleteOpen}
          title="Delete Selected Reports?"
          message={`You are about to permanently delete ${selected.size} medical test report${selected.size === 1 ? '' : 's'}. This action cannot be undone.`}
          confirmLabel="Delete Reports"
          loading={busy}
          onCancel={() => setBulkDeleteOpen(false)}
          onConfirm={() => void handleBulkDelete()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Link to="/certificates/new" className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
            1. Certificate Format
          </Link>
          <span className="border-l bg-[#1d6fd8] px-4 py-2 text-sm font-bold text-white">
            2. Medical Test Format
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/medical-tests?view=history" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white">
            View History
          </Link>
          <button type="button" onClick={startNewForm} className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-bold text-white">
            + New Form
          </button>
          <button type="button" onClick={clearForm} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white">
            Clear
          </button>
          <button
            type="button"
            disabled={saving || downloading}
            onClick={() => void saveRecord()}
            className="rounded-lg bg-[#1d6fd8] px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save'}
          </button>
          <button
            type="button"
            disabled={saving || downloading}
            onClick={() => void printForm()}
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            Print
          </button>
          <button
            type="button"
            disabled={saving || downloading}
            onClick={() => void downloadPdf()}
            className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {downloading ? 'Downloading…' : 'Download PDF'}
          </button>
        </div>
      </div>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          void saveRecord()
        }}
      >
        <div className="hospital-form-stage">
          <GlobeHospitalForm form={form} onChange={update} />
        </div>
      </form>
    </div>
  )
}
