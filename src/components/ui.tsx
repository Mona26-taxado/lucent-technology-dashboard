import { useEffect, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

let toastId = 0
const listeners = new Set<(toast: Toast) => void>()

export function notify(message: string, type: ToastType = 'info') {
  const toast: Toast = { id: ++toastId, message, type }
  listeners.forEach((fn) => fn(toast))
}

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (toast: Toast) => {
      setToasts((prev) => [...prev, toast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, 4000)
    }
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm no-print">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg px-4 py-3 text-sm shadow-lg border ${
            t.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : t.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-brand-50 border-brand-200 text-brand-800'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

export function LoadingSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <p className="text-base font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const printed = status === 'printed'
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
        printed ? 'bg-[#16a34a] text-white' : 'bg-[#f59e0b] text-white'
      }`}
    >
      {printed ? 'Printed' : 'Pending'}
    </span>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-xl font-bold text-[#0b2a5b] sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Pagination({
  page,
  pages,
  total,
  pageSize = 20,
  onChange,
  className = '',
}: {
  page: number
  pages: number
  total?: number
  pageSize?: number
  onChange: (page: number) => void
  className?: string
}) {
  const safePages = Math.max(1, pages || 1)
  const safePage = Math.min(Math.max(1, page), safePages)
  const from = total && total > 0 ? (safePage - 1) * pageSize + 1 : 0
  const to = total ? Math.min(safePage * pageSize, total) : 0

  const pageNumbers = (() => {
    const maxButtons = 5
    if (safePages <= maxButtons) {
      return Array.from({ length: safePages }, (_, i) => i + 1)
    }
    let start = Math.max(1, safePage - 2)
    let end = start + maxButtons - 1
    if (end > safePages) {
      end = safePages
      start = Math.max(1, end - maxButtons + 1)
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  })()

  if (safePages <= 1 && (total === undefined || total <= pageSize)) {
    return total !== undefined ? (
      <div className={`flex items-center justify-between border-t border-slate-100 px-4 py-3 ${className}`}>
        <p className="text-sm text-slate-500">
          {total === 0 ? 'No records' : `Showing ${total} record${total === 1 ? '' : 's'}`}
        </p>
      </div>
    ) : null
  }

  return (
    <div
      className={`flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-sm text-slate-500">
        {total !== undefined
          ? `Showing ${from}–${to} of ${total}`
          : `Page ${safePage} of ${safePages}`}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={safePage <= 1}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onChange(safePage - 1)}
        >
          Previous
        </button>
        {pageNumbers.map((n) => (
          <button
            key={n}
            type="button"
            className={`min-w-9 rounded-lg border px-2.5 py-1.5 text-sm font-semibold ${
              n === safePage
                ? 'border-[#0b2a5b] bg-[#0b2a5b] text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          disabled={safePage >= safePages}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onChange(safePage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
