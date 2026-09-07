"use client"

import { createContext, useContext, ReactNode } from "react"
import { CircuitData, SolverResult, View, Prediction, Explanation, PredictionKey, CorrectionComparison } from "../lib/types"
import { ExampleKey } from "../lib/exampleCircuits"
import { StudentModel } from "../lib/studentModel"
import { StudentProfileForAI } from "../lib/api"

// ─── Context type (matches useExperiment return value) ───────────────

export interface ExperimentContextValue {
  // State
  view: View
  setView: (v: View) => void
  voltage: number
  resistance: number
  closed: boolean
  prediction: Prediction | null
  explanation: Explanation | null
  aiThinking: boolean
  command: string
  commandMessage: string
  selectedExample: ExampleKey | "custom"
  setSelectedExample: (key: ExampleKey | "custom") => void
  circuit: CircuitData | null
  solverResult: SolverResult | null
  loading: boolean
  error: string
  cameraOpen: boolean
  setCameraOpen: (v: boolean) => void
  originalCircuit: CircuitData | null
  correctionComparison: CorrectionComparison | null
  studentModel: StudentModel

  // Derived
  current: number
  brightness: number
  capped: boolean
  question: string
  predictedNext: number | string

  // Refs
  fileInputRef: React.RefObject<HTMLInputElement | null>

  // Handlers
  selectExample: (key: ExampleKey) => Promise<void>
  processImage: (base64: string) => Promise<void>
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  startCapture: () => Promise<void>
  handleCameraCapture: (base64: string) => void
  handleCameraFallback: () => void
  updateComponentValue: (componentId: string, field: string, value: any) => Promise<void>
  addBattery: () => Promise<void>
  autoCompleteCircuit: () => Promise<void>
  handleContinueToSimulate: () => Promise<void>
  change: (key: PredictionKey, next: any, direction: "up" | "down", answer: "up" | "down" | "same") => Promise<void>
  requestChange: (key: PredictionKey, next: any, direction: "up" | "down", componentId?: string) => void
  toggleSwitch: () => Promise<void>
  applyCommand: () => Promise<void>
  setCommand: (v: string) => void
  setCommandMessage: (v: string) => void
  setCorrectionComparison: (v: CorrectionComparison | null) => void
  dismissComparison: () => void
  handleResetStudentModel: () => Promise<void>
  undoPrediction: () => void
  canUndo: boolean
  buildStudentProfile: () => StudentProfileForAI
}

const ExperimentContext = createContext<ExperimentContextValue | null>(null)

export function ExperimentProvider({ children, value }: { children: ReactNode; value: ExperimentContextValue }) {
  return <ExperimentContext.Provider value={value}>{children}</ExperimentContext.Provider>
}

export function useExperimentContext(): ExperimentContextValue {
  const ctx = useContext(ExperimentContext)
  if (!ctx) throw new Error("useExperimentContext must be used inside <ExperimentProvider>")
  return ctx
}
