"use client"

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useExperiment } from '../hooks/useExperiment'
import { ExperimentProvider, useExperimentContext } from '../context/ExperimentContext'
import { ToastProvider } from '../components/ui/Toast'
import { OnboardingScreen } from '../components/screens/OnboardingScreen'
import { DashboardScreen } from '../components/screens/DashboardScreen'
import { ProfileScreen } from '../components/screens/ProfileScreen'
import { WelcomeScreen } from '../components/screens/WelcomeScreen'
import { SetupScreen } from '../components/screens/SetupScreen'
import { LabScreen } from '../components/screens/LabScreen'
import { ProgressScreen } from '../components/screens/ProgressScreen'
import { ChemistryLab } from '../components/labs/ChemistryLab'
import { BiologyLab } from '../components/labs/BiologyLab'
import { ComputerLab } from '../components/labs/ComputerLab'
import { BottomNavBar } from '../components/ui/BottomNavBar'
import { TopBar } from '../components/ui/TopBar'
import { View } from '../lib/types'

// Code-split: camera and evaluation aren't needed on first paint
const EvaluationScreen = dynamic(() => import('../components/screens/EvaluationScreen').then(m => ({ default: m.EvaluationScreen })))
const CameraModal = dynamic(() => import('../components/camera/CameraModal').then(m => ({ default: m.CameraModal })))

const STEP_TO_VIEW: Record<number, View> = { 1: 'capture', 2: 'confirm', 3: 'simulate', 4: 'progress', 5: 'evaluation' }

function AppContent() {
  const exp = useExperimentContext()

  // First-time onboarding check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const onboarded = localStorage.getItem('taleemlab_onboarded')
      if (!onboarded && exp.view === 'dashboard') {
        exp.setView('onboarding')
      }
    }
  }, [exp])

  const toggleLanguage = () => {
    exp.setLanguage(exp.language === 'en' ? 'ur' : 'en')
  }

  const handleFinishOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('taleemlab_onboarded', 'true')
    }
    exp.setView('dashboard')
  }

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

  // 1. ONBOARDING VIEW (Screen 1 from reference design)
  if (exp.view === 'onboarding') {
    return (
      <OnboardingScreen
        onGetStarted={handleFinishOnboarding}
        language={exp.language}
        onToggleLanguage={toggleLanguage}
      />
    )
  }

  // 2. DASHBOARD VIEW (Screen 2 from reference design)
  if (exp.view === 'dashboard') {
    return (
      <>
        <DashboardScreen
          onViewChange={exp.setView}
          onSubjectChange={exp.setSubject}
          onSelectExample={exp.selectExample}
          onCaptureClick={exp.startCapture}
          language={exp.language}
          onToggleLanguage={toggleLanguage}
        />
        <BottomNavBar currentView={exp.view} onViewChange={exp.setView} />
      </>
    )
  }

  // 3. PROFILE VIEW
  if (exp.view === 'profile') {
    return (
      <>
        <ProfileScreen
          onViewChange={exp.setView}
          language={exp.language}
          onToggleLanguage={toggleLanguage}
        />
        <BottomNavBar currentView={exp.view} onViewChange={exp.setView} />
      </>
    )
  }

  // 4. PROGRESS / ANALYTICS VIEW (Screen 3 from reference design)
  if (exp.view === 'progress') {
    return (
      <>
        <ProgressScreen
          studentModel={exp.studentModel}
          buildStudentProfile={exp.buildStudentProfile}
          onViewChange={exp.setView}
          onStepClick={onStepClick}
        />
        <BottomNavBar currentView={exp.view} onViewChange={exp.setView} />
      </>
    )
  }

  // 5. EVALUATION VIEW
  if (exp.view === 'evaluation') {
    return (
      <>
        <EvaluationScreen
          studentProfile={exp.buildStudentProfile()}
          onViewChange={exp.setView}
          onStepClick={onStepClick}
        />
        <BottomNavBar currentView={exp.view} onViewChange={exp.setView} />
      </>
    )
  }

  // 6. CAPTURE VIEW (Photograph or Upload notebook)
  if (exp.view === 'capture') {
    return (
      <>
        <WelcomeScreen
          error={exp.error}
          loading={exp.loading}
          fileInputRef={exp.fileInputRef}
          onFileChange={exp.handleFileChange}
          onCapture={exp.startCapture}
          onSelectExample={exp.selectExample}
          onStepClick={onStepClick}
          subject={exp.subject}
          onSubjectChange={exp.setSubject}
          onLaunchSubjectLab={(sub) => {
            exp.setSubject(sub)
            exp.setView('simulate')
          }}
          language={exp.language}
          onToggleLanguage={toggleLanguage}
        />
        {exp.cameraOpen && (
          <CameraModal
            onCapture={exp.handleCameraCapture}
            onClose={() => exp.setCameraOpen(false)}
            onFallback={exp.handleCameraFallback}
          />
        )}
        <BottomNavBar currentView={exp.view} onViewChange={exp.setView} />
      </>
    )
  }

  // 7. CONFIRM VIEW
  if (exp.view === 'confirm') {
    return (
      <SetupScreen
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
    )
  }

  // 8. SIMULATE VIEW: Chemistry Lab
  if (exp.subject === 'chemistry') {
    return (
      <>
        <main className="page-shell lab-page-shell" style={{ paddingBottom: '85px' }}>
          <TopBar
            step={3}
            onStepClick={onStepClick}
            currentView="simulate"
            language={exp.language}
            onToggleLanguage={toggleLanguage}
          />
          <ChemistryLab
            onSwitchSubject={(sub) => exp.setSubject(sub)}
            onBackToWelcome={() => exp.setView('dashboard')}
          />
        </main>
        <BottomNavBar currentView={exp.view} onViewChange={exp.setView} />
      </>
    )
  }

  // 9. SIMULATE VIEW: Biology Lab
  if (exp.subject === 'biology') {
    return (
      <>
        <main className="page-shell lab-page-shell" style={{ paddingBottom: '85px' }}>
          <TopBar
            step={3}
            onStepClick={onStepClick}
            currentView="simulate"
            language={exp.language}
            onToggleLanguage={toggleLanguage}
          />
          <BiologyLab
            onSwitchSubject={(sub) => exp.setSubject(sub)}
            onBackToWelcome={() => exp.setView('dashboard')}
          />
        </main>
        <BottomNavBar currentView={exp.view} onViewChange={exp.setView} />
      </>
    )
  }

  // 10. SIMULATE VIEW: Computer Science Lab
  if (exp.subject === 'computer') {
    return (
      <>
        <main className="page-shell lab-page-shell" style={{ paddingBottom: '85px' }}>
          <TopBar
            step={3}
            onStepClick={onStepClick}
            currentView="simulate"
            language={exp.language}
            onToggleLanguage={toggleLanguage}
          />
          <ComputerLab
            onSwitchSubject={(sub) => exp.setSubject(sub)}
            onBackToWelcome={() => exp.setView('dashboard')}
          />
        </main>
        <BottomNavBar currentView={exp.view} onViewChange={exp.setView} />
      </>
    )
  }

  // 11. SIMULATE VIEW: Physics Lab (Default)
  return (
    <>
      <div style={{ paddingBottom: '85px' }}>
        <LabScreen
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
          addComponent={exp.addComponent}
          removeComponent={exp.removeComponent}
          cancelPrediction={exp.cancelPrediction}
          labMode={exp.labMode}
          onLabModeChange={exp.setLabMode}
          mobileTab={exp.mobileTab}
          onMobileTabChange={exp.setMobileTab}
          onSwitchSubject={(sub) => exp.setSubject(sub)}
          language={exp.language}
          onToggleLanguage={toggleLanguage}
        />
      </div>
      <BottomNavBar currentView={exp.view} onViewChange={exp.setView} />
    </>
  )
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
