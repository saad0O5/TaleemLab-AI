/**
 * Teacher Dashboard Data Layer
 * 
 * Fetches all student data from Supabase for the teacher view.
 * Falls back to pre-built mock student profiles for demo purposes.
 */

import { supabase, isSupabaseAvailable } from './supabase'

export interface TeacherStudentData {
  id: string
  name: string
  avatar: string // first letter
  totalPredictions: number
  totalCorrect: number
  accuracy: number
  conceptsExplored: number
  lastActive: string
  misconceptions: { id: string; label: string; confidence: number }[]
  recentSummary: string
  aiSummary: string | null
  aiSummaryLoading: boolean
  badge: 'strong' | 'developing' | 'beginner'
}

const MOCK_STUDENTS: TeacherStudentData[] = [
  {
    id: 'mock-1',
    name: 'Ayesha K.',
    avatar: 'A',
    totalPredictions: 24,
    totalCorrect: 20,
    accuracy: 83,
    conceptsExplored: 3,
    lastActive: '2 min ago',
    misconceptions: [],
    recentSummary: 'Explored all three concepts with strong accuracy.',
    aiSummary: "Ayesha demonstrates a strong grasp of Ohm's Law and circuit behavior. She correctly predicted how current changes with voltage and resistance adjustments across multiple trials. She shows no significant misconceptions and is ready for more complex scenarios involving parallel circuits.",
    aiSummaryLoading: false,
    badge: 'strong',
  },
  {
    id: 'mock-2',
    name: 'Bilal M.',
    avatar: 'B',
    totalPredictions: 18,
    totalCorrect: 11,
    accuracy: 61,
    conceptsExplored: 2,
    lastActive: '15 min ago',
    misconceptions: [
      { id: 'linear_current', label: 'Linear Thinking', confidence: 0.45 },
    ],
    recentSummary: 'Good progress on voltage, struggling with resistance.',
    aiSummary: "Bilal understands that voltage changes affect current, but tends to think the relationship is always linear. When resistance doubled, he predicted current would halve — which is correct — but he struggled with combined changes (e.g., voltage up AND resistance up). He would benefit from exercises that vary two parameters simultaneously.",
    aiSummaryLoading: false,
    badge: 'developing',
  },
  {
    id: 'mock-3',
    name: 'Sara T.',
    avatar: 'S',
    totalPredictions: 8,
    totalCorrect: 3,
    accuracy: 38,
    conceptsExplored: 1,
    lastActive: '1 hour ago',
    misconceptions: [
      { id: 'more_voltage_more_current_always', label: 'Voltage-Current Direct', confidence: 0.6 },
      { id: 'switch_current_source', label: 'Switch as Power Source', confidence: 0.35 },
    ],
    recentSummary: 'Just starting — only explored voltage changes so far.',
    aiSummary: "Sara is in the early stages of building circuit intuition. She consistently predicts that more voltage always means more current, which is correct for simple circuits but doesn't account for resistance. She also seems to think switches generate current rather than just controlling the path. Start with single-variable changes and build up gradually.",
    aiSummaryLoading: false,
    badge: 'beginner',
  },
]

/**
 * Fetch all students from Supabase with their prediction stats.
 * Returns mock data if Supabase is unavailable or empty.
 */
export async function fetchTeacherData(): Promise<{ students: TeacherStudentData[]; isMock: boolean }> {
  if (!isSupabaseAvailable() || !supabase) return { students: MOCK_STUDENTS, isMock: true }
  const db = supabase
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('id, last_active_at, total_predictions, total_correct')
      .order('last_active_at', { ascending: false })
      .limit(30)

    if (error || !students || students.length === 0) {
      return { students: MOCK_STUDENTS, isMock: true }
    }

    // Fetch misconceptions for all students
    const studentIds = students.map(s => s.id)
    const { data: misData } = await supabase
      .from('misconceptions')
      .select('*')
      .in('student_id', studentIds)
      .gte('confidence', 0.15)

    // Build student data
    const misByStudent: Record<string, { id: string; label: string; confidence: number }[]> = {}
    if (misData) {
      for (const row of misData) {
        if (!misByStudent[row.student_id]) misByStudent[row.student_id] = []
        misByStudent[row.student_id].push({
          id: row.misconception_id,
          label: row.misconception_id.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          confidence: row.confidence,
        })
      }
    }

    const result: TeacherStudentData[] = students.map(s => {
      const accuracy = s.total_predictions > 0 ? Math.round((s.total_correct / s.total_predictions) * 100) : 0
      const mis = misByStudent[s.id] || []
      const badge: TeacherStudentData['badge'] = accuracy >= 70 ? 'strong' : accuracy >= 45 ? 'developing' : 'beginner'
      const name = `Student ${s.id.slice(0, 4)}`
      return {
        id: s.id,
        name,
        avatar: name.charAt(0),
        totalPredictions: s.total_predictions || 0,
        totalCorrect: s.total_correct || 0,
        accuracy,
        conceptsExplored: s.total_predictions > 12 ? 3 : s.total_predictions > 5 ? 2 : 1,
        lastActive: s.last_active_at ? timeAgo(new Date(s.last_active_at)) : 'unknown',
        misconceptions: mis.sort((a, b) => b.confidence - a.confidence).slice(0, 3),
        recentSummary: `${s.total_predictions || 0} predictions, ${accuracy}% accuracy`,
        aiSummary: null,
        aiSummaryLoading: false,
        badge,
      }
    })

    return { students: result, isMock: false }
  } catch {
    return { students: MOCK_STUDENTS, isMock: true }
  }
}

/**
 * Generate a teacher-focused AI summary for a specific student.
 */
export async function generateTeacherSummary(student: TeacherStudentData): Promise<string | null> {
  // For mock data, return the pre-built summary
  if (student.id.startsWith('mock-')) return student.aiSummary

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${API_URL}/api/learning-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentProfile: {
          totalPredictions: student.totalPredictions,
          accuracy: student.accuracy / 100,
          conceptAccuracy: { resistance: student.accuracy / 100, voltage: student.accuracy / 100, state: student.accuracy / 100 },
          topMisconceptions: student.misconceptions.map(m => ({
            id: m.id, label: m.label, description: m.label, confidence: m.confidence,
          })),
        },
      }),
      signal: AbortSignal.timeout(18000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.summary || null
  } catch {
    return null
  }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}
