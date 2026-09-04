import { useState, useRef, useEffect } from 'react'
import {
  CircuitComponent, CircuitData, SolverResult, SolverFlag,
  View, PredictionKey, Prediction, Explanation
} from '../lib/types'
import {
  recognizeCircuit, solveCircuit, applyChange, sendTextCommand,
  TextCommandResult, explainPrediction, StudentProfileForAI
} from '../lib/api'
import { ExampleKey, mockCircuitExamples } from '../lib/exampleCircuits'
import {
  recordPrediction, removeLastPrediction, resetProgress,
  loadStudentModel, updateStudentModel, resetStudentModel,
  detectCircuitContext, saveStudentModel, loadFromSupabase,
  StudentModel, MISCONCEPTIONS
} from '../lib/studentModel'

const hasFlag = (flags: SolverFlag[] | undefined, flag: string) =>
  flags ? flags.some((item) => typeof item === 'string' ? item === flag : item.type === flag) : false

const hasBlockingFlags = (flags: SolverFlag[] | undefined) => {
  if (!flags) return false
  const blocking = ['battery_polarity_unset', 'no_battery_detected', 'incomplete_circuit']
  return flags.some(f => {
    if (typeof f === 'string') return blocking.includes(f)
    return f.type === 'value_out_of_range'
  })
}

interface CorrectionComparison {
  changes: { componentId: string; field: string; originalValue: number; correctedValue: number }[]
  originalCurrent: number
  correctedCurrent: number
  originalTotalResistance: number | null
  correctedTotalResistance: number | null
}

/** Build a student profile for the AI tutor API */
function buildStudentProfile(model: StudentModel): StudentProfileForAI {
  const conceptAccuracy: Record<string, number> = {}
  for (const [key, tracking] of Object.entries(model.concepts)) {
    conceptAccuracy[key] = tracking.predictions > 0 ? tracking.correct / tracking.predictions : 0
  }

  const totalPredictions = Object.values(model.concepts).reduce((s, c) => s + c.predictions, 0)
  const totalCorrect = Object.values(model.concepts).reduce((s, c) => s + c.correct, 0)

  const topMisconceptions = MISCONCEPTIONS
    .map(m => {
      const h = model.misconceptions[m.id]
      if (!h || h.confidence < 0.15) return null
      return { id: m.id, label: m.label, description: m.description, confidence: h.confidence }
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)

  // Build recent streak description
  const recent = model.evidence.slice(-5)
  let recentStreak = 'no recent pattern'
  if (recent.length >= 3) {
    const lastThree = recent.slice(-3)
    const allCorrect = lastThree.every(e => e.correct)
    const allWrong = lastThree.every(e => !e.correct)
    if (allCorrect) recentStreak = `${lastThree.length} correct in a row`
    else if (allWrong) recentStreak = `${lastThree.length} wrong in a row`
    else recentStreak = 'mixed results recently'
  }

  return {
    totalPredictions,
    accuracy: totalPredictions > 0 ? totalCorrect / totalPredictions : 0,
    conceptAccuracy,
    topMisconceptions,
    recentStreak,
  }
}

export function useExperiment() {
  const [view, setView] = useState<View>('capture')
  const [voltage, setVoltage] = useState(9)
  const [resistance, setResistance] = useState(470)
  const [closed, setClosed] = useState(false)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [explanation, setExplanation] = useState<Explanation | null>(null)
  const [command, setCommand] = useState('')
  const [commandMessage, setCommandMessage] = useState('')
  const [selectedExample, setSelectedExample] = useState<ExampleKey | 'custom'>('clean_circuit')

  const [circuit, setCircuit] = useState<CircuitData | null>(null)
  const [solverResult, setSolverResult] = useState<SolverResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [originalCircuit, setOriginalCircuit] = useState<CircuitData | null>(null)
  const [correctionComparison, setCorrectionComparison] = useState<CorrectionComparison | null>(null)
  const [studentModel, setStudentModel] = useState<StudentModel>(() => loadStudentModel())
  const [aiThinking, setAiThinking] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Undo: save state before each prediction
  interface UndoSnapshot {
    circuit: CircuitData
    solverResult: SolverResult | null
    voltage: number
    resistance: number
    closed: boolean
    studentModel: StudentModel
    explanation: Explanation | null
  }
  const undoRef = useRef<UndoSnapshot | null>(null)

  // Load from Supabase on mount
  useEffect(() => {
    loadFromSupabase().then(remoteModel => {
      if (remoteModel) {
        setStudentModel(remoteModel)
        saveStudentModel(remoteModel)
      }
    }).catch(() => {})
  }, [])

  const selectExample = async (key: ExampleKey) => {
    setSelectedExample(key)
    setLoading(true)
    setError('')
    const freshSRM = resetStudentModel()
    setStudentModel(freshSRM)
    resetProgress()
    try {
      const ex = mockCircuitExamples[key]
      const res = await solveCircuit(ex)
      setCircuit(ex)
      setSolverResult(res)

      const bat = ex.components.find(c => c.type === 'battery')
      const resis = ex.components.find(c => c.type === 'resistor')
      const bulb = ex.components.find(c => c.type === 'bulb')
      const sw = ex.components.find(c => c.type === 'switch')
      setVoltage(bat?.voltage ?? 9)
      setResistance(resis?.resistance ?? bulb?.resistance ?? 470)
      setClosed(sw?.state === 'closed')

      setPrediction(null)
      setExplanation(null)
      setCommand('')
      setCommandMessage('')
      setView(hasBlockingFlags(res.flags) ? 'confirm' : 'simulate')
      if (hasBlockingFlags(res.flags)) {
        setOriginalCircuit(ex)
        setCorrectionComparison(null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to solve example circuit.')
    } finally {
      setLoading(false)
    }
  }

  const processImage = async (base64: string) => {
    setLoading(true)
    setError('')
    const freshSRM = resetStudentModel()
    setStudentModel(freshSRM)
    resetProgress()
    try {
      const recognized = await recognizeCircuit(base64)
      const solved = await solveCircuit(recognized)

      setCircuit(recognized)
      setSolverResult(solved)
      setSelectedExample('custom')

      const bat = recognized.components.find(c => c.type === 'battery')
      const resis = recognized.components.find(c => c.type === 'resistor')
      const bulb = recognized.components.find(c => c.type === 'bulb')
      const sw = recognized.components.find(c => c.type === 'switch')
      setVoltage(bat?.voltage ?? 9)
      setResistance(resis?.resistance ?? bulb?.resistance ?? 470)
      setClosed(sw?.state === 'closed')

      setView('confirm')
      setOriginalCircuit(recognized)
      setCorrectionComparison(null)
    } catch (err: any) {
      setError(err.message || 'Failed to process circuit image.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      await processImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const startCapture = async () => {
    let hasCamera = false
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices()
        hasCamera = devices.some((d) => d.kind === 'videoinput')
      }
    } catch {}
    if (hasCamera) setCameraOpen(true)
    else fileInputRef.current?.click()
  }

  const handleCameraCapture = (imageBase64: string) => {
    setCameraOpen(false)
    processImage(imageBase64)
  }

  const handleCameraFallback = () => {
    setCameraOpen(false)
    fileInputRef.current?.click()
  }

  const updateComponentValue = async (componentId: string, field: string, value: any) => {
    if (!circuit) return
    const updatedComponents = circuit.components.map(c => {
      if (c.id === componentId) return { ...c, [field]: value }
      return c
    })
    const updatedCircuit = { ...circuit, components: updatedComponents }

    setLoading(true)
    setError('')
    try {
      const res = await solveCircuit(updatedCircuit)
      setCircuit(updatedCircuit)
      setSolverResult(res)

      if (field === 'voltage') setVoltage(value)
      if (field === 'resistance') setResistance(value)
      if (field === 'state') setClosed(value === 'closed')
    } catch (err: any) {
      setError(err.message || 'Failed to update component.')
    } finally {
      setLoading(false)
    }
  }

  const addBattery = async () => {
    if (!circuit) return
    const newBatteryId = `battery_${circuit.components.filter(c => c.type === 'battery').length + 1}`
    const newBattery: CircuitComponent = {
      id: newBatteryId, type: 'battery', voltage: 9, polarity: 'same', connects_to: []
    }

    let updatedComponents = [...circuit.components, newBattery]
    for (let i = 0; i < updatedComponents.length; i++) {
      const nextIndex = (i + 1) % updatedComponents.length
      updatedComponents[i] = {
        ...updatedComponents[i],
        connects_to: [updatedComponents[nextIndex].id]
      }
    }

    const updatedCircuit: CircuitData = { ...circuit, components: updatedComponents }
    setLoading(true)
    setError('')
    try {
      const res = await solveCircuit(updatedCircuit)
      setCircuit(updatedCircuit)
      setSolverResult(res)
    } catch (err: any) {
      setError(err.message || 'Failed to add battery.')
    } finally {
      setLoading(false)
    }
  }

  const autoCompleteCircuit = async () => {
    if (!circuit) return
    const updatedComponents = circuit.components.map((c, i) => {
      const nextIndex = (i + 1) % circuit.components.length
      return { ...c, connects_to: [circuit.components[nextIndex].id] }
    })

    const updatedCircuit: CircuitData = { ...circuit, components: updatedComponents }
    setLoading(true)
    setError('')
    try {
      const res = await solveCircuit(updatedCircuit)
      setCircuit(updatedCircuit)
      setSolverResult(res)
    } catch (err: any) {
      setError(err.message || 'Failed to auto-complete circuit.')
    } finally {
      setLoading(false)
    }
  }

  const handleContinueToSimulate = async () => {
    if (originalCircuit && circuit) {
      const changes: CorrectionComparison['changes'] = []
      for (const origComp of originalCircuit.components) {
        const correctedComp = circuit.components.find(c => c.id === origComp.id)
        if (!correctedComp) continue
        for (const field of ['voltage', 'resistance'] as const) {
          const origVal = origComp[field]
          const corrVal = correctedComp[field]
          if (origVal !== undefined && corrVal !== undefined && origVal !== corrVal) {
            changes.push({ componentId: origComp.id, field, originalValue: origVal, correctedValue: corrVal })
          }
        }
      }
      if (changes.length > 0) {
        try {
          const origResult = await solveCircuit(originalCircuit)
          setCorrectionComparison({
            changes,
            originalCurrent: origResult.current,
            correctedCurrent: solverResult?.current ?? 0,
            originalTotalResistance: origResult.totalResistance,
            correctedTotalResistance: solverResult?.totalResistance ?? null,
          })
        } catch {
          // If solving original fails, skip comparison
        }
      }
    }
    setOriginalCircuit(null)
    setView('simulate')
  }

  // ─── Prediction + AI Tutor Flow ────────────────────────────────────

  const current = solverResult?.current ?? 0
  const brightness = Math.round((solverResult?.componentStates?.find((state) => state.type === 'bulb')?.brightness ?? 0) * 100)
  const capped = hasFlag(solverResult?.flags, 'current_capped_for_display')

  const change = async (key: PredictionKey, next: any, direction: 'up' | 'down', answer: 'up' | 'down' | 'same') => {
    if (!circuit) return

    // Save snapshot for undo
    undoRef.current = {
      circuit: { ...circuit, components: circuit.components.map(c => ({ ...c })) },
      solverResult: solverResult ? { ...solverResult } : null,
      voltage, resistance, closed,
      studentModel,
      explanation,
    }

    const correctAnswer = key === 'resistance'
      ? (direction === 'up' ? 'down' : 'up')
      : (direction === 'up' ? 'up' : 'down')
    const correct = answer === correctAnswer

    const oldCurrent = solverResult?.current ?? 0

    setLoading(true)
    setError('')
    try {
      let component: CircuitComponent | undefined
      if (key === 'state') {
        component = circuit.components.find(c => c.type === 'switch')
      } else {
        const compType = key === 'resistance' ? 'resistor' : 'battery'
        component = circuit.components.find(c => c.type === compType)
          || (compType === 'resistor' ? circuit.components.find(c => c.type === 'bulb') : undefined)
      }
      if (!component) throw new Error(`No component found for ${key} change.`)

      const field = key === 'state' ? 'state' : key
      const res = await applyChange(circuit, component.id, field, next)

      const updatedComponents = circuit.components.map(c => {
        if (c.id === component!.id) return { ...c, [field]: next }
        return c
      })
      const updatedCircuit = { ...circuit, components: updatedComponents }

      setCircuit(updatedCircuit)
      setSolverResult(res)

      const newValue = key === 'state' ? next : next
      const oldValue = key === 'resistance' ? resistance : key === 'voltage' ? voltage : undefined

      if (key === 'resistance') setResistance(next as number)
      else if (key === 'voltage') setVoltage(next as number)
      else if (key === 'state') setClosed(next === 'closed')
      setPrediction(null)

      // Update SRM
      const circuitCtx = detectCircuitContext(updatedCircuit)
      const updatedSRM = updateStudentModel(studentModel, key, direction, answer, correct, circuitCtx)
      setStudentModel(updatedSRM)
      saveStudentModel(updatedSRM)
      recordPrediction({ concept: key, correct, timestamp: Date.now() })

      // Show immediate "thinking" state, then call AI tutor
      setAiThinking(true)
      setExplanation({
        correct,
        text: '',
        isAI: false,
        predictionKey: key,
      })

      const profile = buildStudentProfile(updatedSRM)
      const aiResponse = await explainPrediction({
        predictionKey: key,
        direction,
        studentAnswer: answer,
        correct,
        oldValue,
        newValue,
        oldCurrent,
        newCurrent: res.current,
        studentProfile: profile,
      })

      if (aiResponse) {
        setExplanation({
          correct,
          text: aiResponse.explanation,
          isAI: aiResponse.isAI,
          followUp: aiResponse.followUp,
          insight: aiResponse.insight,
          predictionKey: key,
        })
      } else {
        // Fallback to rule-based explanation
        const fallbackText = res.explanation || `The circuit updated based on your change.`
        setExplanation({
          correct,
          text: fallbackText,
          isAI: false,
          predictionKey: key,
        })
      }
      setAiThinking(false)
    } catch (err: any) {
      setError(err.message || 'Failed to apply change.')
      setAiThinking(false)
    } finally {
      setLoading(false)
    }
  }

  const requestChange = (key: PredictionKey, next: any, direction: 'up' | 'down', componentId?: string) => {
    setPrediction({
      key,
      direction,
      before: key === 'resistance' ? resistance : key === 'voltage' ? voltage : undefined,
      target: key === 'state' ? undefined : next,
      componentId,
    })
  }

  const toggleSwitch = async () => {
    if (!circuit) return
    const sw = circuit.components.find(c => c.type === 'switch')
    if (!sw) return
    if (prediction) setPrediction(null)

    const nextState: 'open' | 'closed' = closed ? 'open' : 'closed'
    const direction = nextState === 'closed' ? 'up' : 'down'
    requestChange('state', nextState, direction, sw.id)
  }

  const applyCommand = async () => {
    if (!circuit) return
    if (prediction) {
      setCommandMessage('Answer the current prediction first before using a text command.')
      return
    }
    setLoading(true)
    setCommandMessage('')
    try {
      const res = await sendTextCommand(circuit, command)
      if ('recognized' in res && res.recognized === false) {
        setCommandMessage("I'm not sure what change you're going for — try something like 'set resistance to 150' or 'open switch'.")
        setCommand('')
      } else {
        const solverRes = res as TextCommandResult
        const appliedChange = solverRes.appliedChange
        if (appliedChange) {
          const key = appliedChange.field as PredictionKey
          let direction: 'up' | 'down'
          if (key === 'state') {
            direction = appliedChange.newValue === 'closed' ? 'up' : 'down'
          } else {
            const oldValue = key === 'resistance' ? resistance : voltage
            direction = appliedChange.newValue > oldValue ? 'up' : 'down'
          }
          requestChange(key, appliedChange.newValue, direction, appliedChange.componentId)
          setCommand('')
        }
      }
    } catch (err: any) {
      setCommandMessage(err.message || 'Failed to process command.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetStudentModel = async () => {
    const m = resetStudentModel()
    setStudentModel(m)
    resetProgress()
    if (selectedExample !== 'custom' && circuit) {
      try {
        const ex = mockCircuitExamples[selectedExample]
        const res = await solveCircuit(ex)
        setCircuit(ex)
        setSolverResult(res)
        const bat = ex.components.find(c => c.type === 'battery')
        const resis = ex.components.find(c => c.type === 'resistor')
        const bulb = ex.components.find(c => c.type === 'bulb')
        const sw = ex.components.find(c => c.type === 'switch')
        setVoltage(bat?.voltage ?? 9)
        setResistance(resis?.resistance ?? bulb?.resistance ?? 470)
        setClosed(sw?.state === 'closed')
      } catch {}
    }
  }

  const question = prediction
    ? prediction.key === 'state'
      ? `What happens to current if you ${prediction.direction === 'up' ? 'close' : 'open'} the switch?`
      : `What happens to current if you ${prediction.direction === 'up' ? 'increase' : 'decrease'} ${prediction.key}?`
    : ''
  const activeValue = prediction?.key === 'resistance' ? resistance : prediction?.key === 'voltage' ? voltage : 0
  const predictedNext = prediction
    ? prediction.key === 'state'
      ? (prediction.direction === 'up' ? 'closed' : 'open')
      : (prediction.target ?? (prediction.direction === 'up' ? activeValue + 1 : Math.max(1, activeValue - 1)))
    : activeValue

  return {
    // State
    view, setView,
    voltage, resistance, closed,
    prediction, explanation, aiThinking,
    command, commandMessage,
    selectedExample, setSelectedExample,
    circuit, solverResult,
    loading, error, cameraOpen, setCameraOpen,
    originalCircuit, correctionComparison,
    studentModel,

    // Derived
    current, brightness, capped,
    question, predictedNext,

    // Refs
    fileInputRef,

    // Handlers
    selectExample,
    processImage,
    handleFileChange,
    startCapture,
    handleCameraCapture,
    handleCameraFallback,
    updateComponentValue,
    addBattery,
    autoCompleteCircuit,
    handleContinueToSimulate,
    change,
    requestChange,
    toggleSwitch,
    applyCommand,
    setCommand,
    setCommandMessage,
    setCorrectionComparison: (v: CorrectionComparison | null) => setCorrectionComparison(v),
    dismissComparison: () => setCorrectionComparison(null),
    handleResetStudentModel,
    undoPrediction: () => {
      const snap = undoRef.current
      if (!snap) return
      setCircuit(snap.circuit)
      setSolverResult(snap.solverResult)
      setVoltage(snap.voltage)
      setResistance(snap.resistance)
      setClosed(snap.closed)
      setStudentModel(snap.studentModel)
      saveStudentModel(snap.studentModel)
      setExplanation(snap.explanation)
      removeLastPrediction()
      undoRef.current = null
    },
    canUndo: undoRef.current !== null,
    buildStudentProfile: () => buildStudentProfile(studentModel),
  }
}
