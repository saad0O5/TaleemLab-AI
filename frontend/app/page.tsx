"use client"

import { useExperiment } from '../hooks/useExperiment'
import { WelcomeScreen } from '../components/screens/WelcomeScreen'
import { SetupScreen } from '../components/screens/SetupScreen'
import { LabScreen } from '../components/screens/LabScreen'
import { ProgressScreen } from '../components/screens/ProgressScreen'
import { CameraModal } from '../components/camera/CameraModal'

const STEP_TO_VIEW = { 1: 'capture', 2: 'confirm', 3: 'simulate', 4: 'progress' } as const

export default function Page() {
  const exp = useExperiment()

  const handleStepClick = (step: number) => {
    const targetView = STEP_TO_VIEW[step as keyof typeof STEP_TO_VIEW]
    if (!targetView) return
    // Allow navigation to completed or current steps
    const viewOrder = ['capture', 'confirm', 'simulate', 'progress']
    const currentIdx = viewOrder.indexOf(exp.view)
    const targetIdx = viewOrder.indexOf(targetView)
    if (targetIdx <= currentIdx || exp.circuit) {
      exp.setView(targetView as any)
    }
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
        onStepClick={handleStepClick}
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
      onStepClick={handleStepClick}
    />
  }

  // PROGRESS VIEW
  if (exp.view === 'progress') {
    return <ProgressScreen
      studentModel={exp.studentModel}
      buildStudentProfile={exp.buildStudentProfile}
      onViewChange={exp.setView}
      onStepClick={handleStepClick}
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
    onStepClick={handleStepClick}
  />
}
