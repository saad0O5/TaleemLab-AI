'use client'

import { useState, useRef } from 'react'
import { CircuitComponent, CircuitData, SolverResult, SolverFlag, View, PredictionKey, Prediction, Explanation } from '../lib/types'
import { recognizeCircuit, solveCircuit, applyChange, sendTextCommand, TextCommandResult } from '../lib/api'
import { ExampleKey, mockCircuitExamples } from '../lib/exampleCircuits'
import { CaptureScreen } from '../components/screens/CaptureScreen'
import { ConfirmScreen } from '../components/screens/ConfirmScreen'
import { SimulateScreen } from '../components/screens/SimulateScreen'
import { CameraModal } from '../components/camera/CameraModal'

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

export default function Page() {
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

  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectExample = async (key: ExampleKey) => {
    setSelectedExample(key)
    setLoading(true)
    setError('')
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
    } catch (err: any) {
      setError(err.message || 'Failed to solve example circuit.')
    } finally {
      setLoading(false)
    }
  }

  const processImage = async (base64: string) => {
    setLoading(true)
    setError('')
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
      if (c.id === componentId) {
        return { ...c, [field]: value }
      }
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
      id: newBatteryId,
      type: 'battery',
      voltage: 9,
      polarity: 'same',
      connects_to: []
    }
    
    let updatedComponents = [...circuit.components, newBattery]
    
    // Auto-connect in a simple series loop
    for (let i = 0; i < updatedComponents.length; i++) {
      const nextIndex = (i + 1) % updatedComponents.length
      updatedComponents[i] = {
        ...updatedComponents[i],
        connects_to: [updatedComponents[nextIndex].id]
      }
    }
    
    const updatedCircuit: CircuitData = {
      ...circuit,
      components: updatedComponents
    }
    
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
    
    // Connect components in a series loop to complete the circuit
    const updatedComponents = circuit.components.map((c, i) => {
      const nextIndex = (i + 1) % circuit.components.length
      return {
        ...c,
        connects_to: [circuit.components[nextIndex].id]
      }
    })
    
    const updatedCircuit: CircuitData = {
      ...circuit,
      components: updatedComponents
    }
    
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

  const current = solverResult?.current ?? 0
  const brightness = Math.round((solverResult?.componentStates?.find((state) => state.type === 'bulb')?.brightness ?? 0) * 100)
  const capped = hasFlag(solverResult?.flags, 'current_capped_for_display')

  const change = async (key: PredictionKey, next: any, direction: 'up' | 'down', answer?: string) => {
    if (!circuit) return
    const correctAnswer = key === 'resistance'
      ? (direction === 'up' ? 'down' : 'up')
      : (direction === 'up' ? 'up' : 'down')
    const correct = answer === correctAnswer
      
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
        if (c.id === component!.id) {
          return { ...c, [field]: next }
        }
        return c
      })
      const updatedCircuit = { ...circuit, components: updatedComponents }
        
      setCircuit(updatedCircuit)
      setSolverResult(res)
        
      if (key === 'resistance') setResistance(next as number)
      else if (key === 'voltage') setVoltage(next as number)
      else if (key === 'state') setClosed(next === 'closed')
      setPrediction(null)
      const directionWord = direction === 'up' ? 'Increasing' : 'Decreasing'
      const fallbackText = key === 'resistance'
        ? `${directionWord} resistance ${direction === 'up' ? 'reduces' : 'increases'} current — that's Ohm's Law.`
        : key === 'voltage'
        ? `${directionWord} voltage ${direction === 'up' ? 'pushes more current through' : 'reduces current in'} the circuit.`
        : `The switch is now ${next}. Current ${next === 'closed' ? 'flows' : 'stops'}.`
      setExplanation({ correct, text: res.explanation || fallbackText })
    } catch (err: any) {
      setError(err.message || 'Failed to apply change.')
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
    
    const nextState: 'open' | 'closed' = closed ? 'open' : 'closed'
    const direction = nextState === 'closed' ? 'up' : 'down'
    
    requestChange('state', nextState, direction, sw.id)
  }

  const applyCommand = async () => {
    if (!circuit) return
    setLoading(true)
    setCommandMessage('')
    try {
      const res = await sendTextCommand(circuit, command)
      if ('recognized' in res && res.recognized === false) {
        setCommandMessage("I'm not sure what change you're going for — try something like 'set resistance to 150' or 'open switch'.")
        setCommand('')
      } else {
        // postJSON throws on 4xx/5xx, so value_out_of_bounds errors land in
        // the catch block below (via err.message) — no separate error branch needed here.
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

  // CAPTURE VIEW
  if (view === 'capture') {
    return <>
      <CaptureScreen
        error={error}
        loading={loading}
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
        onCapture={startCapture}
        onSelectExample={selectExample}
      />
      {cameraOpen && (
        <CameraModal
          onCapture={handleCameraCapture}
          onClose={() => setCameraOpen(false)}
          onFallback={handleCameraFallback}
        />
      )}
    </>
  }

  // CONFIRM VIEW
  if (view === 'confirm') {
    return <ConfirmScreen
      circuit={circuit}
      solverResult={solverResult}
      error={error}
      onUpdateComponentValue={updateComponentValue}
      onAddBattery={addBattery}
      onAutoCompleteCircuit={autoCompleteCircuit}
      onViewChange={setView}
    />
  }

  // SIMULATE VIEW
  return <SimulateScreen
    selectedExample={selectedExample}
    circuit={circuit}
    componentStates={solverResult?.componentStates ?? []}
    solverFlags={solverResult?.flags ?? []}
    error={error}
    voltage={voltage}
    resistance={resistance}
    closed={closed}
    current={current}
    brightness={brightness}
    capped={capped}
    prediction={prediction}
    question={question}
    predictedNext={predictedNext}
    command={command}
    commandMessage={commandMessage}
    explanation={explanation}
    onSelectExample={selectExample}
    onViewChange={setView}
    onChangeValue={change}
    onRequestChange={requestChange}
    onToggleSwitch={toggleSwitch}
    onCommandInputChange={setCommand}
    onApplyCommand={applyCommand}
  />
}
