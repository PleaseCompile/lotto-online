/**
 * Client-side password pre-hashing using SHA-256.
 *
 * Purpose: Ensures the raw plaintext password NEVER leaves the browser.
 * Even if TLS is intercepted (MITM proxy, compromised CA), only the
 * hash is transmitted — protecting password reuse across services.
 *
 * Technique used by: 1Password, Bitwarden, and many enterprise apps.
 *
 * The APP_PEPPER provides domain separation so the same password on
 * different apps produces different hashes (rainbow table resistant).
 */

const APP_PEPPER = 'lotto-online-v1'

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`${APP_PEPPER}:${password}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
