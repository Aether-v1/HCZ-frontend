export function buildFreshMessageParams(params = {}) {
  return {
    ...params,
    _t: Date.now()
  }
}