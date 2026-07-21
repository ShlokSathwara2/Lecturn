// Shared types across frontend and backend

export interface Subject {
  id: string
  name: string
  user_id: string
}

export interface Chapter {
  id: string
  subject_id: string
  title: string
  created_at: string
}

export interface Capture {
  id: string
  chapter_id: string
  date_taken: string
  image_url: string
  raw_text: string | null
  cleaned_diagram_url: string | null
  original_diagram_crop_url: string | null
  ai_content_json: Record<string, unknown> | null
  ai_status: "not_generated" | "auto_generated" | "manually_generated"
  confidence_score: number | null
  status: "pending" | "processed" | "needs_review"
  embedding: number[] | null
}

export interface AudioNote {
  id: string
  capture_id: string
  transcript: string | null
  audio_url: string | null
}

export interface ApiUsageLog {
  id: string
  provider: string
  date: string
  request_count: number
}
