import http from './http'

export const IMAGE_ACCEPT_ATTR = 'image/png,image/jpeg,image/jpg,image/webp'
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
const MAX_IMAGE_SIZE = 10 * 1024 * 1024

function getFileExtension(name = '') {
  const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] || ''
}

export function validateImageFile(file, label = '图片') {
  if (!(file instanceof File)) return
  const type = String(file.type || '').toLowerCase()
  const ext = getFileExtension(file.name)
  const extAllowed = ['png', 'jpg', 'jpeg', 'webp'].includes(ext)
  const typeAllowed = ALLOWED_IMAGE_TYPES.has(type)
  if (!typeAllowed && !extAllowed) {
    throw new Error(`${label}仅支持 JPG、JPEG、PNG、WEBP 格式`)
  }
  if (Number(file.size || 0) > MAX_IMAGE_SIZE) {
    throw new Error(`${label}大小不能超过 10MB`)
  }
}

async function compressImageFile(file) {
  if (!(file instanceof File) || typeof document === 'undefined') {
    return file
  }

  const maxSide = 1600
  const quality = 0.84
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file

  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * ratio))
  const height = Math.max(1, Math.round(bitmap.height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, width, height)

  const targetBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!targetBlob) return file
  return new File([targetBlob], `${file.name || `upload-${Date.now()}`}.jpg`, { type: 'image/jpeg' })
}

function pickUploadUrl(res) {
  const data = res?.data && typeof res.data === 'object' ? res.data : {}
  return String(data.url || '').trim()
}

export async function uploadImageFile(input) {
  const originalFile = input instanceof File ? input : input?.file instanceof File ? input.file : null
  if (!(originalFile instanceof File)) {
    throw new Error('请选择图片文件')
  }
  validateImageFile(originalFile, '图片')

  const file = await compressImageFile(originalFile).catch(() => originalFile)
  const form = new FormData()
  form.append('file', file, file.name || `upload-${Date.now()}.jpg`)
  form.append('type', 'image')

  try {
    const res = await http.post('/api/upload/image', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    const url = pickUploadUrl(res)
    if (!url) {
      throw new Error(res?.message || res?.data?.message || '上传失败')
    }
    const path = String(res?.data?.path || '').trim()
    return {
      ...res,
      data: {
        url,
        ...(path ? { path } : {})
      }
    }
  } catch (error) {
    const code = Number(error?.code || 0)
    if (code >= 500) throw new Error('上传接口异常，请稍后重试')
    throw error || new Error('上传失败')
  }
}
