import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Only create the client if both URL and key are configured
const isConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.includes('supabase.co'))

export const supabase = isConfigured ? createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: (url, options = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(3000) }) },
}) : null

/**
 * Get or create an anonymous student session.
 * Uses a local UUID stored in localStorage as the student identifier.
 * Returns null if Supabase is not configured.
 */
export async function getStudentId(): Promise<string | null> {
  let studentId = localStorage.getItem('taleemlab_student_id')
  if (!studentId) {
    studentId = crypto.randomUUID()
    localStorage.setItem('taleemlab_student_id', studentId)
    // Register the student in the database (best-effort)
    if (supabase) {
      try {
        await supabase.from('students').upsert({ id: studentId, created_at: new Date().toISOString() })
      } catch {
        // Supabase unavailable — continue with local-only mode
      }
    }
  }
  return studentId
}

export function clearStudentId(): void {
  localStorage.removeItem('taleemlab_student_id')
}

/**
 * Check if Supabase is available and configured.
 */
export function isSupabaseAvailable(): boolean {
  return isConfigured && supabase !== null && !supabaseDisabled
}

// Circuit breaker: disable Supabase after first failure to stop console spam
let supabaseDisabled = false

export function disableSupabase(): void {
  supabaseDisabled = true
}
