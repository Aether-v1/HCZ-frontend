import { apiOrderList } from './order'

function buildTypedOrderListParams(params = {}, type) {
  return {
    ...params,
    type
  }
}

export function listRechargeOrders(params = {}) {
  return apiOrderList(buildTypedOrderListParams(params, 1))
}

export function listQueryOrders(params = {}) {
  return apiOrderList(buildTypedOrderListParams(params, 2))
}