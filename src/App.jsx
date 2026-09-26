import React, { Suspense, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import MainAppLayout from './pages/MainAppLayout';
import { legalFromPath } from './lib/legal';
import { initialPage, loadSession, saveSession } from './lib/session';
import { backendOn } from './lib/backend/supabase';
import { boot, landingFor, onPasswordRecovery, saveProfile, signOut } from './lib/backend/account';
import { lazyScreen } from './lib/lazyScreen';

// Screens someone passes through once (sign-up, onboarding, a password
// reset) load only when they're reached, so everyone else's first load is lighter.
const ForgotPasswordPage = lazyScreen(() => import('./pages/ForgotPasswordPage'));
const OtpPage = lazyScreen(() => import('./pages/OtpPage'));
const ProfileSetupPage = lazyScreen(() => import('./pages/ProfileSetupPage'));
const IntroHeroPage = lazyScreen(() => import('./pages/IntroHeroPage'));
const OnboardingWizard = lazyScreen(() => import('./pages/OnboardingWizard'));
const AiPlanSummaryPage = lazyScreen(() => import('./pages/AiPlanSummaryPage'));
const ResetPasswordPage = lazyScreen(() => import('./pages/ResetPasswordPage'));
const LegalPage = lazyScreen(() => import('./pages/LegalPage'));

// Pages that only make sense before or during sign-up.
const AUTH_PAGES = ['welcome', 'login', 'signup', 'forgot-password', 'otp'];
// Where a start can land (lib/session.js landingFor). The account may know better than this device.
const LANDINGS = ['profile-setup', 'intro-hero', 'main-app'];

/** The mark on paper while the first sync brings this account's data in. */
function Splash() {
  return (
    <div className="ui min-h-[100dvh] flex flex-col items-center justify-center gap-5" role="status" aria-live="polite">
      <span className="w-16 h-16 rounded-[20px] bg-accent text-on-accent flex items-center justify-center font-display font-extrabold text-[34px]">F</span>
      <span className="w-6 h-6 rounded-full border-[3px] border-line border-t-ink animate-spin" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export default function App() {
  // A returning athlete lands where they left off instead of signing up again.
  const [currentPage, setCurrentPage] = useState(() => initialPage());
  const [userEmail, setUserEmail] = useState(() => loadSession().email || 'dddddddd@dd.com');
  // With real accounts the first screen waits for the Supabase session and
  // the first sync, so the app never flashes another device's stale data.
  const [booting, setBooting] = useState(backendOn);
  // The privacy policy and terms: opened from sign-up, or straight from
  // their public addresses, /privacy and /terms.
  const [legal, setLegal] = useState(() => legalFromPath(window.location.pathname));
  const closeLegal = () => {
    if (legalFromPath(window.location.pathname)) window.history.replaceState(null, '', '/');
    setLegal(null);
  };

  useEffect(() => {
    if (!backendOn) return undefined;
    let alive = true;
    boot().then(({ user, profile, offline }) => {
      if (!alive) return;
      // Offline with an expired sign-in the account is still here: stay put.
      if (!user) { if (!offline) setCurrentPage((p) => (AUTH_PAGES.includes(p) ? p : 'welcome')); }
      else {
        if (user.email) setUserEmail(user.email);
        // Back from Google, or a returning athlete: straight to where their
        // account says they belong, which may be ahead of this device.
        setCurrentPage((p) => (AUTH_PAGES.includes(p) || LANDINGS.includes(p) ? landingFor(profile) : p));
      }
    }).catch(() => {}).finally(() => { if (alive) setBooting(false); });
    const stop = onPasswordRecovery(() => setCurrentPage('reset-password'));
    return () => { alive = false; stop(); };
  }, []);

  /**
   * Every navigation goes through here so the stored session stays in step
   * with where the athlete actually is.
   */
  const navigate = (page) => {
    if (page === 'terms' || page === 'privacy') { setLegal(page); return; }
    if (page === 'welcome') signOut();
    else if (page === 'main-app') {
      saveSession({ signedIn: true, onboarded: true });
      if (backendOn) saveProfile({ onboarded: true });
    }
    else if (page === 'profile-setup' || page === 'intro-hero') saveSession({ signedIn: true });
    setCurrentPage(page);
  };

  if (legal) {
    return (
      <div className="w-full h-full min-h-[100dvh] bg-canvas font-ui antialiased overflow-x-clip">
        <Suspense fallback={<Splash />}>
          <LegalPage kind={legal} isRtl={(localStorage.getItem('language') || 'en') === 'fa'} onBack={closeLegal} />
        </Suspense>
      </div>
    );
  }

  if (booting && !AUTH_PAGES.includes(currentPage)) return <Splash />;

  return (
    <div className="w-full h-full min-h-[100dvh] bg-canvas font-ui antialiased overflow-x-clip">
      <Suspense fallback={<Splash />}>
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

        {currentPage === 'reset-password' && (
          <ResetPasswordPage key="reset-password" onNavigate={navigate} />
        )}

        {currentPage === 'main-app' && (
          <MainAppLayout
            key="main-app"
            onNavigate={navigate}
          />
        )}
      </AnimatePresence>
      </Suspense>
    </div>
  );
}
