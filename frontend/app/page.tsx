"use client"

import dynamic from 'next/dynamic'
import { useExperiment } from '../hooks/useExperiment'
import { ExperimentProvider, useExperimentContext } from '../context/ExperimentContext'
import { ToastProvider } from '../components/ui/Toast'
import { WelcomeScreen } from '../components/screens/WelcomeScreen'
import { SetupScreen } from '../components/screens/SetupScreen'
import { LabScreen } from '../components/screens/LabScreen'
import { ProgressScreen } from '../components/screens/ProgressScreen'
import { View } from '../lib/types'

// Code-split: camera and evaluation aren't needed on first paint
const EvaluationScreen = dynamic(() => import('../components/screens/EvaluationScreen').then(m => ({ default: m.EvaluationScreen })))
const CameraModal = dynamic(() => import('../components/camera/CameraModal').then(m => ({ default: m.CameraModal })))

const STEP_TO_VIEW: Record<number, View> = { 1: 'capture', 2: 'confirm', 3: 'simulate', 4: 'progress', 5: 'evaluation' }

function AppContent() {
  const exp = useExperimentContext()

  const onStepClick = (step: number) => {
    const targetView = STEP_TO_VIEW[step]
    if (!targetView) return
    const viewOrder: View[] = ['capture', 'confirm', 'simulate', 'progress']
    const currentIdx = viewOrder.indexOf(exp.view)
    const targetIdx = viewOrder.indexOf(targetView)
    if (targetIdx <= currentIdx || exp.circuit) {
      exp.setView(targetView)
    }
  }

  // EVALUATION VIEW
  if (exp.view === 'evaluation') {
    return <EvaluationScreen
      studentProfile={exp.buildStudentProfile()}
      onViewChange={exp.setView}
    />
  }

  // CAPTURE VIEW
  if (exp.view === 'capture') {
    return <>
      <WelcomeScreen
        error={exp.error}
        loading={exp.loading}
        fileInputRef={exp.fileInputRef}
        onFileChange={exp.handleFileChange}
        onCapture={exp.startCapture}
        onSelectExample={exp.selectExample}
        onStepClick={onStepClick}
      />
      {exp.cameraOpen && (
        <CameraModal
          onCapture={exp.handleCameraCapture}
          onClose={() => exp.setCameraOpen(false)}
          onFallback={exp.handleCameraFallback}
        />
      )}
    </>
  }

  // CONFIRM VIEW
  if (exp.view === 'confirm') {
    return <SetupScreen
      circuit={exp.circuit}
      solverResult={exp.solverResult}
      error={exp.error}
      onUpdateComponentValue={exp.updateComponentValue}
      onAddBattery={exp.addBattery}
      onAutoCompleteCircuit={exp.autoCompleteCircuit}
      onViewChange={exp.setView}
      onContinueToSimulate={exp.handleContinueToSimulate}
      onStepClick={onStepClick}
    />
  }

  // PROGRESS VIEW
  if (exp.view === 'progress') {
    return <ProgressScreen
      studentModel={exp.studentModel}
      buildStudentProfile={exp.buildStudentProfile}
      onViewChange={exp.setView}
      onStepClick={onStepClick}
    />
  }

  // SIMULATE VIEW (default)
  return <LabScreen
    selectedExample={exp.selectedExample}
    circuit={exp.circuit}
    componentStates={exp.solverResult?.componentStates ?? []}
    solverFlags={exp.solverResult?.flags ?? []}
    error={exp.error}
    voltage={exp.voltage}
    resistance={exp.resistance}
    closed={exp.closed}
    current={exp.current}
    brightness={exp.brightness}
    capped={exp.capped}
    prediction={exp.prediction}
    question={exp.question}
    predictedNext={exp.predictedNext}
    command={exp.command}
    commandMessage={exp.commandMessage}
    explanation={exp.explanation}
    aiThinking={exp.aiThinking}
    onSelectExample={exp.selectExample}
    onViewChange={exp.setView}
    onChangeValue={exp.change}
    onRequestChange={exp.requestChange}
    onToggleSwitch={exp.toggleSwitch}
    onCommandInputChange={exp.setCommand}
    onApplyCommand={exp.applyCommand}
    correctionComparison={exp.correctionComparison}
    onDismissComparison={exp.dismissComparison}
    studentModel={exp.studentModel}
    onResetStudentModel={exp.handleResetStudentModel}
    onUndo={exp.undoPrediction}
    canUndo={exp.canUndo}
    onStepClick={onStepClick}
  />
}

export default function Page() {
  const exp = useExperiment()

  return (
    <ExperimentProvider value={exp}>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ExperimentProvider>
  )
}
