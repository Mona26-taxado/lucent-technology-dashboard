import api from './client'
import type {
  User,
  Certificate,
  CertificateListResponse,
  CertificateFormData,
  CertificateTemplate,
  DashboardSummary,
  AppSettings,
  PrintHistoryListResponse,
  NextNumberResponse,
  FieldPositions,
} from '../types'

export const authApi = {
  requestOtp: async (email: string, password: string) => {
    const { data } = await api.post<{ message: string; dev_otp?: string | null }>('/auth/request-otp', {
      email,
      password,
    })
    return data
  },
  verifyOtp: async (email: string, otp: string) => {
    const { data } = await api.post<{ access_token: string; token_type: string }>(
      '/auth/verify-otp',
      { email, otp },
    )
    return data
  },
  loginConfig: async () => {
    const { data } = await api.get<{ otp_length: number; dev_otp_mode?: boolean }>('/auth/login-config')
    return data
  },
  me: async () => {
    const { data } = await api.get<User>('/auth/me')
    return data
  },
  changePassword: async (current_password: string, new_password: string) => {
    const { data } = await api.post('/auth/change-password', { current_password, new_password })
    return data
  },
}

export const dashboardApi = {
  summary: async () => {
    const { data } = await api.get<DashboardSummary>('/dashboard/summary')
    return data
  },
  recent: async (limit = 3) => {
    const { data } = await api.get<Certificate[]>('/dashboard/recent-certificates', {
      params: { limit },
    })
    return data
  },
}

export const certificatesApi = {
  list: async (page = 1, pageSize = 20, printStatus?: string) => {
    const { data } = await api.get<CertificateListResponse>('/certificates', {
      params: { page, page_size: pageSize, print_status: printStatus },
    })
    return data
  },
  search: async (params: Record<string, string | number | undefined>) => {
    const { data } = await api.get<CertificateListResponse>('/certificates/search', { params })
    return data
  },
  bulkDownload: async (params: {
    training_date?: string
    date_from?: string
    date_to?: string
  }) => {
    const response = await api.get('/certificates/bulk-download', {
      params,
      responseType: 'blob',
      timeout: 600000,
    })
    return response
  },
  get: async (id: number) => {
    const { data } = await api.get<Certificate>(`/certificates/${id}`)
    return data
  },
  create: async (payload: CertificateFormData) => {
    const { data } = await api.post<Certificate>('/certificates', payload)
    return data
  },
  update: async (id: number, payload: Partial<CertificateFormData>) => {
    const { data } = await api.put<Certificate>(`/certificates/${id}`, payload)
    return data
  },
  remove: async (id: number) => {
    const { data } = await api.delete(`/certificates/${id}`)
    return data
  },
  bulkRemove: async (ids: number[]) => {
    const { data } = await api.post<{ message: string }>('/certificates/bulk-delete', { ids })
    return data
  },
  nextNumber: async () => {
    const { data } = await api.get<NextNumberResponse>('/certificates/next-number')
    return data
  },
  generatePdf: async (id: number) => {
    const { data } = await api.post<Certificate>(`/certificates/${id}/generate-pdf`)
    return data
  },
  downloadPdf: async (id: number) => {
    const response = await api.get(`/certificates/${id}/download`, { responseType: 'blob' })
    return response
  },
  markPrinted: async (id: number) => {
    const { data } = await api.post<Certificate>(`/certificates/${id}/mark-printed`)
    return data
  },
  uploadLogo: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<{ path: string; url: string }>('/certificates/upload/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
  uploadSignature: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<{ path: string; url: string }>(
      '/certificates/upload/signature',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return data
  },
}

export const templatesApi = {
  list: async (activeOnly = false) => {
    const { data } = await api.get<CertificateTemplate[]>('/templates', {
      params: { active_only: activeOnly },
    })
    return data
  },
  get: async (id: number) => {
    const { data } = await api.get<CertificateTemplate>(`/templates/${id}`)
    return data
  },
  create: async (form: FormData) => {
    const { data } = await api.post<CertificateTemplate>('/templates', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
  update: async (id: number, form: FormData) => {
    const { data } = await api.put<CertificateTemplate>(`/templates/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
  remove: async (id: number) => {
    const { data } = await api.delete(`/templates/${id}`)
    return data
  },
  setDefault: async (id: number) => {
    const { data } = await api.post<CertificateTemplate>(`/templates/${id}/set-default`)
    return data
  },
  updatePositions: async (id: number, positions: FieldPositions) => {
    const form = new FormData()
    form.append('field_positions_json', JSON.stringify(positions))
    const { data } = await api.put<CertificateTemplate>(`/templates/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
}

export const settingsApi = {
  get: async () => {
    const { data } = await api.get<AppSettings>('/settings')
    return data
  },
  update: async (payload: Partial<AppSettings>) => {
    const { data } = await api.put<AppSettings>('/settings', payload)
    return data
  },
  uploadDefaultLogo: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post('/settings/upload/default-logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
  uploadDefaultSignature: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post('/settings/upload/default-signature', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
  changePassword: async (current_password: string, new_password: string) => {
    const { data } = await api.post('/settings/change-password', { current_password, new_password })
    return data
  },
}

export const printHistoryApi = {
  list: async (page = 1, pageSize = 20) => {
    const { data } = await api.get<PrintHistoryListResponse>('/print-history', {
      params: { page, page_size: pageSize },
    })
    return data
  },
}

export const healthApi = {
  check: async () => {
    const { data } = await api.get('/health')
    return data
  },
}
