import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { medicalTestsApi } from '../api'
import { getErrorMessage } from '../api/client'
import type { MedicalTestFormData } from '../types'
import { LoadingSpinner, notify } from '../components/ui'
import GlobeHospitalForm from '../components/medical/GlobeHospitalForm'

function todayStr() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

const emptyForm: MedicalTestFormData = {
  exam_date: todayStr(),
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

export default function MedicalTestFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const editId = id ? Number(id) : null
  const showHistory = searchParams.get('view') === 'history'

  const [form, setForm] = useState<MedicalTestFormData>(emptyForm)
  const [savedId, setSavedId] = useState<number | null>(editId)
  const [loading, setLoading] = useState(Boolean(editId))
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<Awaited<ReturnType<typeof medicalTestsApi.list>> | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    if (!editId) return
    const load = async () => {
      setLoading(true)
      try {
        const row = await medicalTestsApi.get(editId)
        setForm({
          exam_date: row.exam_date || todayStr(),
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
        })
        setSavedId(row.id)
      } catch (error) {
        notify(getErrorMessage(error, 'Failed to load'), 'error')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [editId])

  useEffect(() => {
    if (!showHistory) return
    const load = async () => {
      setHistoryLoading(true)
      try {
        setHistory(await medicalTestsApi.list(1, 50))
      } catch (error) {
        notify(getErrorMessage(error, 'Failed to load history'), 'error')
      } finally {
        setHistoryLoading(false)
      }
    }
    void load()
  }, [showHistory])

  const update = <K extends keyof MedicalTestFormData>(key: K, value: MedicalTestFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const payload = useMemo((): MedicalTestFormData => {
    const clean = (v?: string | null) => ((v || '').trim() || null)
    const patient = (form.patient_name || '').trim()
    return {
      exam_date: clean(form.exam_date),
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

  const saveRecord = async () => {
    if (!payload.patient_name) {
      notify('Patient name is required', 'error')
      return null
    }
    setSaving(true)
    try {
      const row = savedId
        ? await medicalTestsApi.update(savedId, payload)
        : await medicalTestsApi.create(payload)
      setSavedId(row.id)
      notify(savedId ? 'Updated' : 'Saved', 'success')
      if (!editId && !savedId) navigate(`/medical-tests/${row.id}`, { replace: true })
      return row
    } catch (error) {
      notify(getErrorMessage(error, 'Failed to save'), 'error')
      return null
    } finally {
      setSaving(false)
    }
  }

  const clearForm = () => {
    setForm({ ...emptyForm, exam_date: todayStr() })
    setSavedId(null)
    if (editId) navigate('/medical-tests', { replace: true })
  }

  const printForm = async () => {
    await saveRecord()
    window.print()
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner label="Loading..." />
      </div>
    )
  }

  if (showHistory) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-extrabold text-[#0b2a5b]">Medical Test History</h1>
          <Link to="/medical-tests" className="rounded-lg bg-[#1d6fd8] px-4 py-2 text-sm font-bold text-white">
            + New Form
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border bg-white">
          {historyLoading ? (
            <div className="p-8"><LoadingSpinner /></div>
          ) : !history?.items.length ? (
            <p className="p-8 text-center text-sm text-slate-500">No records yet.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#0b2a5b] text-white">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.items.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-3">{row.id}</td>
                    <td className="px-4 py-3">{row.exam_date || '—'}</td>
                    <td className="px-4 py-3 font-semibold">{row.patient_name}</td>
                    <td className="px-4 py-3">{row.company_name || '—'}</td>
                    <td className="px-4 py-3">
                      <Link to={`/medical-tests/${row.id}`} className="font-semibold text-[#1d6fd8]">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
          <button type="button" onClick={clearForm} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white">
            Clear
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveRecord()}
            className="rounded-lg bg-[#1d6fd8] px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void printForm()}
            className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            Print / Download PDF
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
