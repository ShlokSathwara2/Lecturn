import { NextRequest, NextResponse } from "next/server"

const API_BASE = "https://lecturn-wa7t.onrender.com"

async function proxyRequest(request: NextRequest, method: string) {
  const url = new URL(request.url)
  const targetPath = url.searchParams.get("path") || "/"
  const contentType = request.headers.get("content-type") || "application/json"

  const headers: Record<string, string> = { "Content-Type": contentType }

  let body: BodyInit | undefined
  if (method !== "GET" && method !== "DELETE") {
    body = await request.arrayBuffer()
  }

  const res = await fetch(`${API_BASE}${targetPath}`, { method, headers, body })
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function GET(request: NextRequest) {
  return proxyRequest(request, "GET")
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, "POST")
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request, "PATCH")
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request, "DELETE")
}
