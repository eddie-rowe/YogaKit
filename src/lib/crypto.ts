import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

import { getEnv } from '@/lib/env'

// AES-256-GCM versioned envelope, ported from NextMove's
// src/services/integrations/crypto.ts (research.md item 7). Used to encrypt
// integration_connections.encrypted_credentials at rest — this feature never
// makes a live integration call, but the encryption boundary exists so the
// first real credential (e.g. a MindBody token, added in a later feature)
// lands in an already-hardened column, not a plaintext one retrofitted later.
//
// The `v1:` prefix is a rotation seam: a future ENCRYPTION_KEY rotation adds a
// `v2` branch to decrypt() without needing to re-encrypt every row atomically.
// No `v2` path exists yet and no re-encryption job exists — see
// docs/design/002-schema.md §G. Don't store a real third-party credential
// until that runbook exists.

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const CURRENT_VERSION = 'v1'

function getEncryptionKey(): Buffer {
  // ENCRYPTION_KEY must be 64 hex chars (32 bytes) — enforced by src/lib/env.ts.
  // Hex over base64 deliberately: base64 has multiple canonical alphabets
  // (+/ vs -_) that can silently decode to the wrong byte length; hex doesn't.
  return Buffer.from(getEnv().ENCRYPTION_KEY, 'hex')
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  const packed = Buffer.concat([iv, authTag, encrypted])
  return `${CURRENT_VERSION}:${packed.toString('base64')}`
}

export function decrypt(encryptedValue: string): string {
  const key = getEncryptionKey()

  if (!encryptedValue.startsWith(`${CURRENT_VERSION}:`)) {
    throw new Error(
      `Unrecognized encryption envelope version in value (expected "${CURRENT_VERSION}:" prefix). ` +
        'If this is a genuine key rotation, add the new version branch here — do not silently fall through.',
    )
  }
  const payload = encryptedValue.slice(CURRENT_VERSION.length + 1)
  const packed = Buffer.from(payload, 'base64')

  const iv = packed.subarray(0, IV_LENGTH)
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}
