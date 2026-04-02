import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useCompanyOrders(status: string, page: number) {
  return useQuery({
    queryKey: ['company-orders', status, page],
    queryFn: () =>
      api
        .get(`/company/orders?status=${status}&page=${page}&limit=20`)
        .then((r) => r.data),
    // Socket.io handles real-time invalidation — no polling needed
    refetchInterval: false,
  })
}
