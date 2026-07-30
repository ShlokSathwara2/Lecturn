const PROXY = "/api/proxy"

async function request<T>(path: string, options?: RequestInit, timeoutMs: number = 30000): Promise<T> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${PROXY}?path=${encodeURIComponent(path)}`, {
      method: options?.method || "GET",
      headers: { "Content-Type": "application/json", ...options?.headers },
      body: options?.body,
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text()
      let detail = text
      try {
        const json = JSON.parse(text)
        if (json.detail) detail = typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail)
      } catch {}
      throw new Error(detail || `API ${res.status}`)
    }
    return res.json()
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.")
    }
    throw err
  } finally {
    clearTimeout(id)
  }
}

// Subjects
export const subjects = {
  list: (userId?: string) =>
    request<any[]>(`/subjects${userId ? `?user_id=${userId}` : ""}`),
  get: (id: string) =>
    request<any>(`/subjects/${id}`),
  create: (data: { name: string; user_id: string }) =>
    request<any>("/subjects", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<any>(`/subjects/${id}`, { method: "DELETE" }),
}

// Chapters
export const chapters = {
  list: (subjectId?: string, userId?: string) => {
    const params = new URLSearchParams()
    if (subjectId) params.set("subject_id", subjectId)
    if (userId) params.set("user_id", userId)
    const qs = params.toString()
    return request<any[]>(`/chapters${qs ? `?${qs}` : ""}`)
  },
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
  list: (chapterId?: string, userId?: string) => {
    const params = new URLSearchParams()
    if (chapterId) params.set("chapter_id", chapterId)
    if (userId) params.set("user_id", userId)
    const qs = params.toString()
    return request<any[]>(`/captures${qs ? `?${qs}` : ""}`)
  },
  get: (id: string) =>
    request<any>(`/captures/${id}`),
  create: (data: { chapter_id?: string; subject_id?: string; image_url?: string; raw_text?: string }) =>
    request<any>("/captures", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { raw_text?: string; ai_content_json?: any; chapter_id?: string; ai_status?: string; subject_id?: string; image_url?: string; is_pinned?: boolean }) =>
    request<any>(`/captures/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<any>(`/captures/${id}`, { method: "DELETE" }),
  unassigned: (userId?: string) =>
    request<any[]>(`/captures/unassigned${userId ? `?user_id=${userId}` : ""}`),
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
  batch: (captureIds: string[]) =>
    request<Record<string, any[]>>("/audio-notes/batch", { method: "POST", body: JSON.stringify({ capture_ids: captureIds }) }),
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

export const aiNotes = {
  generate: (subjectId: string, userId: string) =>
    request<any>("/ai-notes/generate", { method: "POST", body: JSON.stringify({ subject_id: subjectId, user_id: userId }) }, 130000),
  get: (subjectId: string) =>
    request<any>(`/ai-notes/${subjectId}`),
  delete: (subjectId: string) =>
    request<any>(`/ai-notes/${subjectId}`, { method: "DELETE" }),
}

export const dashboard = {
  get: (userId: string) =>
    request<{ subjects: any[]; chapters_count: Record<string, number>; notes_count: Record<string, number>; unassigned: any[] }>(`/dashboard/${userId}`),
}

export const processStatus = {
  get: (captureId: string) =>
    request<{ capture_id: string; status: string; ai_status: string }>(`/process/${captureId}/status`),
}

export const quiz = {
  get: (subjectId: string, chapterIds?: string) => {
    const params = chapterIds ? `?chapters=${chapterIds}` : ""
    return request<{ subject_id: string; total_cards: number; cards: any[] }>(`/quiz/${subjectId}${params}`)
  },
}

export const exportApi = {
  subjectUrl: (subjectId: string, format: string, includeImages: boolean = true) =>
    `/api/proxy?path=${encodeURIComponent(`/export/subject/${subjectId}?format=${format}&include_images=${includeImages}`)}`,
  chapterUrl: (chapterId: string, format: string, includeImages: boolean = true) =>
    `/api/proxy?path=${encodeURIComponent(`/export/chapter/${chapterId}?format=${format}&include_images=${includeImages}`)}`,
  async download(url: string, filename: string) {
    let res: Response
    try {
      res = await fetch(url)
    } catch {
      throw new Error("Network error — backend may be waking up. Try again in 30s.")
    }
    if (!res.ok) {
      let msg = `Export failed (${res.status})`
      try {
        const body = await res.json()
        if (body.detail) msg = body.detail
      } catch {}
      throw new Error(msg)
    }
    const blob = await res.blob()
    if (blob.size < 100) throw new Error("Export returned empty file")
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
