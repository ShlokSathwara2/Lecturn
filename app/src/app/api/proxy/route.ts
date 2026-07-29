import { NextRequest, NextResponse } from "next/server"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://lecturn-wa7t.onrender.com"

async function proxyRequest(request: NextRequest, method: string) {
  const url = new URL(request.url)
  const targetPath = url.searchParams.get("path") || "/"

  const headers: Record<string, string> = {}
  const contentType = request.headers.get("content-type")
  if (contentType) {
    headers["Content-Type"] = contentType
  }

  let body: BodyInit | undefined
  if (method !== "GET" && method !== "DELETE") {
    body = await request.arrayBuffer()
  }

  try {
    const res = await fetch(`${API_BASE}${targetPath}`, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(120_000),
    })

    const resContentType = res.headers.get("content-type") || "application/json"

    if (resContentType.includes("application/json")) {
      const data = await res.text()
      return new NextResponse(data, {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      })
    }

    const arrayBuf = await res.arrayBuffer()
    return new NextResponse(arrayBuf, {
      status: res.status,
      headers: {
        "Content-Type": resContentType,
        "Content-Disposition": res.headers.get("content-disposition") || "",
      },
    })
  } catch (error: any) {
    console.error("Proxy request failed:", error)
    const isTimeout = error?.name === "TimeoutError" || error?.name === "AbortError"
    return NextResponse.json(
      { detail: isTimeout ? "Backend request timed out (120s limit)" : "Backend proxy connection failed" },
      { status: isTimeout ? 504 : 502 }
    )
  }
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
