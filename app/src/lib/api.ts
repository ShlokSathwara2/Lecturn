const PROXY = "/api/proxy"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${PROXY}?path=${encodeURIComponent(path)}`, {
    method: options?.method || "GET",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: options?.body,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

// Subjects
export const subjects = {
  list: (userId?: string) =>
    request<any[]>(`/subjects${userId ? `?user_id=${userId}` : ""}`),
  get: (id: string) =>
    request<any>(`/subjects/${id}`),
  create: (data: { name: string; user_id: string }) =>
    request<any>("/subjects", { method: "POST", body: JSON.stringify(data) }),
}

// Chapters
export const chapters = {
  list: (subjectId?: string) =>
    request<any[]>(`/chapters${subjectId ? `?subject_id=${subjectId}` : ""}`),
  get: (id: string) =>
    request<any>(`/chapters/${id}`),
  create: (data: { subject_id: string; title: string }) =>
    request<any>("/chapters", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { title?: string }) =>
    request<any>(`/chapters/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<any>(`/chapters/${id}`, { method: "DELETE" }),
}

// Processing
export const processing = {
  capture: (captureId: string) =>
    request<any>("/process", { method: "POST", body: JSON.stringify({ capture_id: captureId }) }),
  batch: (captureIds: string[], format: string = "exam-oriented") =>
    request<any[]>("/process/batch", { method: "POST", body: JSON.stringify({ capture_ids: captureIds, format }) }),
}

// Captures
export const captures = {
  list: (chapterId?: string) =>
    request<any[]>(`/captures${chapterId ? `?chapter_id=${chapterId}` : ""}`),
  create: (data: { chapter_id?: string; subject_id?: string; image_url?: string; raw_text?: string }) =>
    request<any>("/captures", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { raw_text?: string; ai_content_json?: any; chapter_id?: string; ai_status?: string }) =>
    request<any>(`/captures/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<any>(`/captures/${id}`, { method: "DELETE" }),
  unassigned: () =>
    request<any[]>("/captures/unassigned"),
  search: async (params: { q?: string; subject_id?: string; chapter_id?: string; ai_status?: string; date_from?: string; date_to?: string; needs_review?: boolean }) => {
    const query = new URLSearchParams()
    if (params.q) query.set("q", params.q)
    if (params.subject_id) query.set("subject_id", params.subject_id)
    if (params.chapter_id) query.set("chapter_id", params.chapter_id)
    if (params.ai_status) query.set("ai_status", params.ai_status)
    if (params.date_from) query.set("date_from", params.date_from)
    if (params.date_to) query.set("date_to", params.date_to)
    if (params.needs_review) query.set("needs_review", "true")
    return request<any[]>(`/search?${query.toString()}`)
  },
  semanticSearch: (q: string, subject_id?: string, ai_status?: string) =>
    request<any[]>(`/search/semantic?q=${encodeURIComponent(q)}&subject_id=${subject_id || ""}&ai_status=${ai_status || ""}`),
  uploadImage: async (file: File) => {
    const form = new FormData()
    form.append("file", file)
    const res = await fetch(`${PROXY}?path=${encodeURIComponent("/captures/upload")}`, {
      method: "POST",
      body: form,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error("Upload failed (" + res.status + "): " + text)
    }
    return res.json() as Promise<{ filename: string; url: string }>
  },
}

export const audioNotes = {
  list: (captureId: string) =>
    request<any[]>(`/audio-notes?capture_id=${captureId}`),
  upload: async (captureId: string, file: Blob) => {
    const form = new FormData()
    form.append("capture_id", captureId)
    form.append("file", file, "audio.webm")
    const res = await fetch(`${PROXY}?path=${encodeURIComponent("/audio-notes/upload")}`, {
      method: "POST",
      body: form,
    })
    if (!res.ok) throw new Error("Audio upload failed")
    return res.json() as Promise<any>
  },
}

export const usageLog = {
  summary: (days: number = 14) =>
    request<{ days: string[]; daily: Record<string, Record<string, number>>; providers: any[]; today_providers: string[]; today_total: number }>(`/usage-log/summary?days=${days}`),
}

export const quiz = {
  get: (subjectId: string) =>
    request<{ subject_id: string; total_cards: number; cards: any[] }>(`/quiz/${subjectId}`),
}

export const exportApi = {
  subjectUrl: (subjectId: string, format: string) =>
    `/api/proxy?path=${encodeURIComponent(`/export/subject/${subjectId}?format=${format}`)}`,
  chapterUrl: (chapterId: string, format: string) =>
    `/api/proxy?path=${encodeURIComponent(`/export/chapter/${chapterId}?format=${format}`)}`,
  async download(url: string, filename: string) {
    const res = await fetch(url)
    if (!res.ok) throw new Error("Export failed")
    const blob = await res.blob()
    if (navigator.share && navigator.canShare?.({ files: [new File([blob], filename)] })) {
      await navigator.share({ files: [new File([blob], filename, { type: blob.type })] })
    } else {
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
    }
  },
}
