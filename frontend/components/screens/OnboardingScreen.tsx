"use client"

import { useState } from 'react'
import { Language } from '../../lib/types'

interface OnboardingScreenProps {
  onGetStarted: () => void
  language?: Language
  onToggleLanguage?: () => void
}

export function OnboardingScreen({ onGetStarted, language = 'en', onToggleLanguage }: OnboardingScreenProps) {
  const [activeSlide, setActiveSlide] = useState(0)

  const slides = [
    {
      badge: language === 'ur' ? 'اپنی صلاحیت کو اجاگر کریں' : 'UNLOCK YOUR POTENTIAL',
      subBadge: language === 'ur' ? 'امتحانات کی تیاری کریں، خواب سچ کریں' : 'Prepare for practicals, achieve for dreams',
      title: language === 'ur' ? 'سائنس پریکٹیکلز اب آپ کے ہاتھ میں' : 'Unlock Your Potential',
      desc: language === 'ur' 
        ? 'میٹرک فزکس، کیمسٹری، بائیولوجی اور کمپیوٹر سائنس کے پریکٹیکلز اپنے موبائل پر براہ راست سمولیٹ کریں۔'
        : 'Prepare for matric practical exams with AI-guided simulations. Draw on paper or experiment directly.',
    },
    {
      badge: language === 'ur' ? 'تصویر لیں اور زندہ کریں' : 'DRAW & PHOTOGRAPH',
      subBadge: language === 'ur' ? 'کاپی پر سرکٹ بنائیں، تصویر اپ لوڈ کریں' : 'Sketch circuits on paper, AI solves live',
      title: language === 'ur' ? 'کاپی سے لائیو سمولیشن تک' : 'From Notebook to Simulation',
      desc: language === 'ur'
        ? 'کسی مہنگی لیب کی ضرورت نہیں۔ کاپی پر پنسل سے خاکہ بنائیں اور اے آئی اسے لمحوں میں سمولیٹ کرے گا۔'
        : 'No expensive physical lab needed. Simply photograph your notebook sketch to verify voltage, current, and Ohm\'s law.',
    },
    {
      badge: language === 'ur' ? 'سقراطی اے آئی استاد' : 'AI SOCRATIC TUTOR',
      subBadge: language === 'ur' ? 'غلط فہمیوں کی تشخیص اور مکمل رہنمائی' : 'Diagnose misconceptions with predict-first',
      title: language === 'ur' ? 'پیشین گوئی کریں اور سیکھیں' : 'Predict First, Master Forever',
      desc: language === 'ur'
        ? 'تبدیلی سے پہلے پیشین گوئی کریں تاکہ آپ کا تصور واضح ہو اور امتحانات میں پورے نمبر حاصل ہوں۔'
        : 'Deepen your conceptual reasoning. Commit to a prediction before observing the result, guided by Socratic coaching.',
    }
  ]

  const current = slides[activeSlide]

  return (
    <main className="onboarding-screen">
      {/* Top Header */}
      <header className="onboarding-header">
        <div className="onboarding-brand">
          <div className="onboarding-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <span className="onboarding-brand-title">
            {language === 'ur' ? 'تعلِیم لیب' : 'TaleemLab'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onToggleLanguage && (
            <button
              className="btn btn-outline btn-sm"
              onClick={onToggleLanguage}
              style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '700' }}
            >
              {language === 'en' ? '🇵🇰 اردو' : '🇬🇧 En'}
            </button>
          )}
          <button className="onboarding-skip-btn" onClick={onGetStarted} type="button">
            {language === 'ur' ? 'چھوڑیں' : 'Skip'}
          </button>
        </div>
      </header>

      {/* Main Visual Illustration Card */}
      <div className="onboarding-card-wrapper">
        <div className="onboarding-illustration-card">
          <div className="illustration-inner">
            {/* SVG Visual Illustration of Student with Laptop, Idea Lightbulb, and Graduation Cap */}
            <svg viewBox="0 0 320 280" className="onboarding-svg-art" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2A115B" />
                  <stop offset="100%" stopColor="#4A1D96" />
                </linearGradient>
                <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
                <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Ambient Circles */}
              <circle cx="160" cy="140" r="100" fill="#F3EEFB" opacity="0.7" />
              <circle cx="240" cy="80" r="45" fill="#FEF3C7" opacity="0.6" />

              {/* Floating Graduation Cap */}
              <g transform="translate(130, 30)">
                <polygon points="30,0 60,12 30,24 0,12" fill="#2A115B" />
                <path d="M12,17 v12 c6,7 30,7 36,0 v-12" fill="#3B1778" />
                <path d="M60,12 v18" stroke="#F59E0B" strokeWidth="2.5" />
                <circle cx="60" cy="30" r="3" fill="#F59E0B" />
              </g>

              {/* Floating Idea Lightbulb */}
              <g transform="translate(230, 48)">
                <circle cx="16" cy="16" r="14" fill="#FDE68A" filter="url(#softGlow)" />
                <path d="M11 23 h10 m-8 3 h6" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
                <path d="M11 16 c0-4 2-7 5-7 s5 3 5 7 c0 2-1 3-2 4 h-6 c-1-1-2-2-2-4 z" fill="#F59E0B" />
                {/* Rays */}
                <line x1="16" y1="2" x2="16" y2="5" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
                <line x1="27" y1="7" x2="25" y2="9" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
                <line x1="5" y1="7" x2="7" y2="9" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
              </g>

              {/* Notebook / Paper with Chart */}
              <g transform="translate(40, 75) rotate(-6)">
                <rect x="0" y="0" width="55" height="70" rx="4" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
                <line x1="10" y1="15" x2="45" y2="15" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
                <line x1="10" y1="25" x2="45" y2="25" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
                <line x1="10" y1="35" x2="35" y2="35" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
                <path d="M10 55 L22 45 L32 50 L45 38" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
              </g>

              {/* Study Desk */}
              <rect x="30" y="210" width="260" height="12" rx="6" fill="#E2E8F0" />
              <rect x="50" y="222" width="10" height="35" fill="#CBD5E1" rx="2" />
              <rect x="260" y="222" width="10" height="35" fill="#CBD5E1" rx="2" />

              {/* Student Character */}
              {/* Body / Sweater */}
              <path d="M125 170 c-15 0 -25 15 -25 40 h120 c0 -25 -10 -40 -25 -40 z" fill="#2A115B" />
              {/* Collar */}
              <polygon points="150,170 160,185 170,170" fill="#FFFFFF" />

              {/* Head & Face */}
              <circle cx="160" cy="130" r="26" fill="#F6C8A4" />
              {/* Hair */}
              <path d="M132 125 c0 -20 18 -32 35 -30 c12 1 23 10 23 24 c0 8 -4 14 -8 18 c-3 -10 -15 -14 -22 -14 c-10 0 -18 4 -28 2 z" fill="#1E293B" />
              
              {/* Happy Eyes and Smile */}
              <path d="M150 128 q3 3 6 0" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M165 128 q3 3 6 0" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M156 138 q4 4 8 0" stroke="#E11D48" strokeWidth="2" fill="none" strokeLinecap="round" />

              {/* Laptop on Desk */}
              <rect x="130" y="190" width="60" height="22" rx="2" fill="#94A3B8" />
              <rect x="134" y="172" width="52" height="20" rx="3" fill="#1E293B" />
              <rect x="138" y="176" width="44" height="13" rx="1" fill="#38BDF8" />
              {/* Code lines on laptop screen */}
              <line x1="142" y1="180" x2="160" y2="180" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="142" y1="184" x2="155" y2="184" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />

              {/* Floating STEM Atom & Circuit Icons */}
              <g transform="translate(85, 45)">
                <circle cx="10" cy="10" r="3" fill="#2563EB" />
                <ellipse cx="10" cy="10" rx="12" ry="4" fill="none" stroke="#2563EB" strokeWidth="1.2" transform="rotate(30 10 10)" />
                <ellipse cx="10" cy="10" rx="12" ry="4" fill="none" stroke="#2563EB" strokeWidth="1.2" transform="rotate(-30 10 10)" />
              </g>

              {/* Beaker / Test Tube Icon */}
              <g transform="translate(70, 185)">
                <path d="M0 0 v16 a6 6 0 0 0 12 0 v-16" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" />
                <path d="M2 8 h8" stroke="#0D9488" strokeWidth="1.5" />
                <circle cx="6" cy="14" r="2" fill="#0D9488" />
              </g>
            </svg>

            {/* In-Card Text Badge */}
            <div className="illustration-text-badge">
              <div className="badge-pill-title">{current.badge}</div>
              <div className="badge-pill-sub">{current.subBadge}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Headline & Subhead */}
      <div className="onboarding-content">
        <h1 className="onboarding-title">{current.title}</h1>
        <p className="onboarding-description">{current.desc}</p>

        {/* Carousel Pagination Indicator Dots */}
        <div className="onboarding-dots" role="tablist" aria-label="Slides">
          {slides.map((_, idx) => (
            <button
              key={idx}
              className={`dot-indicator ${idx === activeSlide ? 'active' : ''}`}
              onClick={() => setActiveSlide(idx)}
              type="button"
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Full-width Rounded Royal Purple CTA Button */}
        <button className="onboarding-cta-btn" onClick={onGetStarted} type="button">
          <span>{language === 'ur' ? 'شروع کریں' : 'GET STARTED'}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </main>
  )
}
