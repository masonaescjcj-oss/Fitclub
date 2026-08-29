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
import { clearSession, initialPage, loadSession, saveSession } from './lib/session';

export default function App() {
  // A returning athlete lands where they left off instead of signing up again.
  const [currentPage, setCurrentPage] = useState(() => initialPage());
  const [userEmail, setUserEmail] = useState(() => loadSession().email || 'dddddddd@dd.com');

  /**
   * Every navigation goes through here so the stored session stays in step
   * with where the athlete actually is.
   */
  const navigate = (page) => {
    if (page === 'welcome') clearSession();
    else if (page === 'main-app') saveSession({ signedIn: true, onboarded: true });
    else if (page === 'profile-setup' || page === 'intro-hero') saveSession({ signedIn: true });
    setCurrentPage(page);
  };

  return (
    <div className="w-full h-full min-h-[100dvh] bg-black text-[#844783] font-sans antialiased overflow-hidden">
      <AnimatePresence mode="wait">
        {currentPage === 'welcome' && (
          <WelcomePage key="welcome" onNavigate={navigate} />
        )}

        {currentPage === 'login' && (
          <LoginPage key="login" onNavigate={(page, emailData) => {
              if (emailData) { setUserEmail(emailData); saveSession({ email: emailData }); }
              navigate(page);
            }} />
        )}

        {currentPage === 'signup' && (
          <SignupPage
            key="signup"
            onNavigate={(page, emailData) => {
              if (emailData) { setUserEmail(emailData); saveSession({ email: emailData }); }
              navigate(page);
            }}
          />
        )}

        {currentPage === 'forgot-password' && (
          <ForgotPasswordPage key="forgot-password" onNavigate={navigate} />
        )}

        {currentPage === 'otp' && (
          <OtpPage
            key="otp"
            email={userEmail}
            onNavigate={(page) => navigate(page === 'onboarding' ? 'profile-setup' : page)}
          />
        )}

        {currentPage === 'profile-setup' && (
          <ProfileSetupPage
            key="profile-setup"
            onNavigate={(page, details) => {
              if (details?.name) saveSession({ name: details.name, username: details.username });
              navigate(page === 'questionnaire' ? 'intro-hero' : page);
            }}
          />
        )}

        {currentPage === 'intro-hero' && (
          <IntroHeroPage
            key="intro-hero"
            onNavigate={navigate}
          />
        )}

        {currentPage === 'onboarding-questions' && (
          <OnboardingWizard
            key="onboarding-questions"
            onNavigate={navigate}
          />
        )}

        {currentPage === 'ai-plan-summary' && (
          <AiPlanSummaryPage
            key="ai-plan-summary"
            onNavigate={(page) => navigate(page === 'onboarding-wizard' ? 'onboarding-questions' : page)}
          />
        )}

        {currentPage === 'main-app' && (
          <MainAppLayout
            key="main-app"
            onNavigate={navigate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
