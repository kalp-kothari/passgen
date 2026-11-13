// ─────────────────────────────────────────────────────────────────────────────
// Breach Checker — Have I Been Pwned Pwned Passwords API (k-anonymity)
//
// PRIVACY GUARANTEE:
//  • The password is hashed locally using SubtleCrypto (SHA-1)
//  • Only the first 5 hex chars of the hash are sent to the API
//  • The remaining suffix is compared locally — the full hash NEVER leaves
//    this device
//  • The actual password is NEVER transmitted anywhere
// ─────────────────────────────────────────────────────────────────────────────

export interface BreachResult {
  checked: boolean;
  breached: boolean;
  occurrences: number;
  error: string | null;
}

/** SHA-1 hash a string using SubtleCrypto — returns uppercase hex */
async function sha1Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const buf  = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

export async function checkBreach(password: string): Promise<BreachResult> {
  if (!password) {
    return { checked: false, breached: false, occurrences: 0, error: 'No password entered.' };
  }

  try {
    // 1. Hash locally
    const hash   = await sha1Hex(password);
    const prefix = hash.slice(0, 5);   // sent to API
    const suffix = hash.slice(5);      // compared locally

    // 2. Query HIBP — only the 5-char prefix is sent
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });

    if (!res.ok) {
      throw new Error(`HIBP API returned ${res.status}. Try again shortly.`);
    }

    // 3. Parse and compare locally
    const text = await res.text();
    for (const line of text.split('\r\n')) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix === suffix) {
        return {
          checked: true,
          breached: true,
          occurrences: parseInt(countStr ?? '1', 10),
          error: null,
        };
      }
    }

    return { checked: true, breached: false, occurrences: 0, error: null };
  } catch (err) {
    return {
      checked: false,
      breached: false,
      occurrences: 0,
      error: err instanceof Error ? err.message : 'An unknown error occurred.',
    };
  }
}
