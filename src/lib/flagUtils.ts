import bcryptjs from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a flag using bcryptjs (one-way hashing)
 */
export async function hashFlag(flag: string): Promise<string> {
  return bcryptjs.hash(flag, SALT_ROUNDS);
}

/**
 * Verify a submitted flag against the stored hash
 */
export async function verifyFlag(submitted: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(submitted, hash);
}

/**
 * Generate variations of a flag (lowercase, uppercase, snake_case, camelCase)
 */
export function generateFlagVariations(flag: string): string[] {
  const variations = new Set<string>();
  variations.add(flag);
  variations.add(flag.toLowerCase());
  variations.add(flag.toUpperCase());
  
  // Basic snake_case to camelCase conversion if applicable
  if (flag.includes('_')) {
    const camel = flag.replace(/([_][a-z])/g, (group) => group.toUpperCase().replace('_', ''));
    variations.add(camel);
  }
  
  // Basic camelCase to snake_case conversion if applicable
  const snake = flag.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  variations.add(snake);
  
  return Array.from(variations);
}

/**
 * Comprehensive check for multiple flags and variations
 */
export async function checkFlag(
  submitted: string, 
  allowedFlags: { flag: string, is_case_insensitive: boolean, allow_variations: boolean }[]
): Promise<boolean> {
  for (const f of allowedFlags) {
    let target = f.flag;
    let input = submitted;

    if (f.is_case_insensitive) {
      if (target.toLowerCase() === input.toLowerCase()) return true;
    }

    if (f.allow_variations) {
      const variations = generateFlagVariations(target);
      if (variations.includes(input)) return true;
    }

    // Direct match (including original behavior of simple equality)
    if (target === input) return true;
  }
  
  return false;
}
