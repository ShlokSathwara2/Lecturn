import useSWR from "swr"
import { dashboard as dashboardApi, processStatus as processStatusApi, captures as capturesApi } from "./api"

const fetcher = (path: string) => fetch(path).then((r) => r.json())

export function useDashboard(userId: string | null) {
  return useSWR(
    userId ? `/api/proxy?path=${encodeURIComponent(`/dashboard/${userId}`)}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      refreshInterval: 30000,
    }
  )
}

export function useProcessStatus(captureId: string | null, shouldPoll: boolean = false) {
  return useSWR(
    captureId && shouldPoll
      ? `/api/proxy?path=${encodeURIComponent(`/process/${captureId}/status`)}`
      : null,
    fetcher,
    {
      refreshInterval: 2000,
      dedupingInterval: 1000,
    }
  )
}

export function useCaptures(chapterId: string | null) {
  return useSWR(
    chapterId
      ? `/api/proxy?path=${encodeURIComponent(`/captures?chapter_id=${chapterId}`)}`
      : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  )
}
