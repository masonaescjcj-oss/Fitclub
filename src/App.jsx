import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import OtpPage from './pages/OtpPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import IntroHeroPage from './pages/IntroHeroPage';
import OnboardingWizard from './pages/OnboardingWizard';
import AiPlanSummaryPage from './pages/AiPlanSummaryPage';
import MainAppLayout from './pages/MainAppLayout';

export default function App() {
  const [currentPage, setCurrentPage] = useState('welcome');
  const [userEmail, setUserEmail] = useState('dddddddd@dd.com');

  return (
    <div className="w-full h-full min-h-[100dvh] bg-black text-[#844783] font-sans antialiased overflow-hidden">
      <AnimatePresence mode="wait">
        {currentPage === 'welcome' && (
          <WelcomePage key="welcome" onNavigate={(page) => setCurrentPage(page)} />
        )}

        {currentPage === 'login' && (
          <LoginPage key="login" onNavigate={(page) => setCurrentPage(page)} />
        )}

        {currentPage === 'signup' && (
          <SignupPage
            key="signup"
            onNavigate={(page, emailData) => {
              if (emailData) setUserEmail(emailData);
              setCurrentPage(page);
            }}
          />
        )}

        {currentPage === 'forgot-password' && (
          <ForgotPasswordPage key="forgot-password" onNavigate={(page) => setCurrentPage(page)} />
        )}

        {currentPage === 'otp' && (
          <OtpPage
            key="otp"
            email={userEmail}
            onNavigate={(page) => setCurrentPage(page === 'onboarding' ? 'profile-setup' : page)}
          />
        )}

        {currentPage === 'profile-setup' && (
          <ProfileSetupPage
            key="profile-setup"
            onNavigate={(page) => setCurrentPage(page === 'questionnaire' ? 'intro-hero' : page)}
          />
        )}

        {currentPage === 'intro-hero' && (
          <IntroHeroPage
            key="intro-hero"
            onNavigate={(page) => setCurrentPage(page)}
          />
        )}

        {currentPage === 'onboarding-questions' && (
          <OnboardingWizard
            key="onboarding-questions"
            onNavigate={(page) => setCurrentPage(page)}
          />
        )}

        {currentPage === 'ai-plan-summary' && (
          <AiPlanSummaryPage
            key="ai-plan-summary"
            onNavigate={(page) => setCurrentPage(page === 'onboarding-wizard' ? 'onboarding-questions' : page)}
          />
        )}

        {currentPage === 'main-app' && (
          <MainAppLayout
            key="main-app"
            onNavigate={(page) => setCurrentPage(page)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
