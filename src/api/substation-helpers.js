export function buildSubstationTierSavePayload(productId, tiers, productDescribe = '') {
  return {
    product_id: productId,
    product_describe: String(productDescribe || '').trim(),
    tiers: JSON.stringify(tiers || [])
  }
}