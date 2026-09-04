import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://skfklkjbvpbvmjudgvvw.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Get or create an anonymous student session.
 * Uses a local UUID stored in localStorage as the student identifier.
 * This allows progress persistence without requiring login.
 */
export async function getStudentId(): Promise<string> {
  let studentId = localStorage.getItem('taleemlab_student_id')
  if (!studentId) {
    studentId = crypto.randomUUID()
    localStorage.setItem('taleemlab_student_id', studentId)
    // Register the student in the database
    await supabase.from('students').upsert({ id: studentId, created_at: new Date().toISOString() })
  }
  return studentId
}

export function clearStudentId(): void {
  localStorage.removeItem('taleemlab_student_id')
}
