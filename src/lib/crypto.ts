// Cifra simétrica AES-256-GCM para segredos guardados na base de dados (chaves de API
// dos professores). A chave nunca é gravada em texto simples nem enviada ao cliente.
// O segredo do servidor vem de API_KEY_ENCRYPTION_SECRET (32 bytes em base64, ou
// qualquer string da qual se deriva a chave por scrypt).
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

let cached: Buffer | null = null
function key(): Buffer {
  if (cached) return cached
  const raw = process.env.API_KEY_ENCRYPTION_SECRET
  if (!raw) throw new Error('API_KEY_ENCRYPTION_SECRET não está definido')
  const b = Buffer.from(raw, 'base64')
  cached = b.length === 32 ? b : scryptSync(raw, 'profai-user-api-keys', 32)
  return cached
}

export function isEncryptionConfigured(): boolean {
  return !!process.env.API_KEY_ENCRYPTION_SECRET
}

// Formato: v1.<iv b64>.<authTag b64>.<ciphertext b64>
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1.${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`
}

export function decryptSecret(blob: string): string {
  const parts = blob.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('formato de cifra desconhecido')
  const [, ivB, tagB, dataB] = parts
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(dataB, 'base64')), decipher.final()]).toString('utf8')
}
