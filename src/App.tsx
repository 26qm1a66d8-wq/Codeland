/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { AppSection } from './types/codeland';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { AppShell } from './components/AppShell';
import { GlossaryModal } from './components/GlossaryModal';
import { GrandCitadelCertificateModal } from './components/GrandCitadelCertificateModal';
import { InviteNotificationOverlay } from './components/InviteNotificationOverlay';
import { RewardToastOverlay } from './components/RewardToastOverlay';
import { VoxelBrandMark } from './components/BadgeIcon';
import { LandingPage } from './views/LandingPage';
import { AuthAndOnboardingView } from './views/AuthAndOnboardingView';
import { DashboardView } from './views/DashboardView';
import { AcademyView } from './views/AcademyView';
import { LessonDetailView } from './views/LessonDetailView';
import { PracticeArenaView } from './views/PracticeArenaView';
import { WorldsSelectionView } from './views/WorldsSelectionView';
import { AdventureGameView } from './views/AdventureGameView';
import { MultiplayerView } from './views/MultiplayerView';
import { PanoramicMultiplayerArena } from './views/PanoramicMultiplayerArena';
import { LeaderboardView } from './views/LeaderboardView';
import {
  AchievementsView,
  ProfileView,
  SettingsView,
} from './views/AchievementsProfileSettingsView';
import { MarketplaceView } from './views/MarketplaceView';
import { WinterEventView } from './views/WinterEventView';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class CodelandErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected application error.',
    };
  }

  override componentDidCatch(error: Error) {
    console.error('CODELAND ErrorBoundary caught:', error);
  }

  override render() {
    if (this.state.hasError) {
      let friendlyNote =
        'Something unexpected occurred while rendering this section of CODELAND.';
      if (this.state.errorMessage.includes('resource-exhausted')) {
        friendlyNote =
          'Cloud Firestore quota temporarily reached. You can reload and continue seamlessly in Local Demo Explorer mode.';
      } else if (this.state.errorMessage.includes('permission-denied')) {
        friendlyNote =
          'Cloud security rules rejected an unauthorized write. Please reload your session and try again.';
      }

      return (
        <div className="min-h-screen bg-[#0F1B15] text-[#F5F1E6] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-[#F28C45]/60 bg-[#15271F] p-6 space-y-4 text-center shadow-2xl">
            <div className="mx-auto w-12 h-12 rounded-xl bg-[#F28C45]/20 text-[#F28C45] flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white">Adventure Interrupted</h1>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">{friendlyNote}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#2F7D46] hover:bg-[#389152] text-white cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload CODELAND</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const CodelandRouter: React.FC = () => {
  const {
    profile,
    section,
    authLoading,
    glossaryOpen,
    setGlossaryOpen,
    certificateOpen,
    setCertificateOpen,
    completedCampaignLevelsCount,
  } = usePlayer();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0F1B15] text-[#F5F1E6] flex flex-col items-center justify-center gap-3">
        <VoxelBrandMark size={40} />
        <div className="font-display text-sm tracking-wider text-[#F5C451]">
          LOADING CODELAND...
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (section) {
      case AppSection.LANDING:
        return <LandingPage />;
      case AppSection.AUTH:
      case AppSection.ONBOARDING:
        return <AuthAndOnboardingView />;
      case AppSection.GAME:
        return <AdventureGameView />;
      case AppSection.MULTIPLAYER_GAME:
        return <PanoramicMultiplayerArena />;
      case AppSection.MULTIPLAYER:
        return (
          <AppShell>
            <MultiplayerView />
          </AppShell>
        );
      case AppSection.DASHBOARD:
        return (
          <AppShell>
            <DashboardView />
          </AppShell>
        );
      case AppSection.ACADEMY:
        return (
          <AppShell>
            <AcademyView />
          </AppShell>
        );
      case AppSection.LESSON:
        return (
          <AppShell>
            <LessonDetailView />
          </AppShell>
        );
      case AppSection.PRACTICE:
        return (
          <AppShell>
            <PracticeArenaView />
          </AppShell>
        );
      case AppSection.WORLDS:
        return (
          <AppShell>
            <WorldsSelectionView />
          </AppShell>
        );
      case AppSection.LEADERBOARD:
        return (
          <AppShell>
            <LeaderboardView />
          </AppShell>
        );
      case AppSection.ACHIEVEMENTS:
        return (
          <AppShell>
            <AchievementsView />
          </AppShell>
        );
      case AppSection.PROFILE:
        return (
          <AppShell>
            <ProfileView />
          </AppShell>
        );
      case AppSection.SETTINGS:
        return (
          <AppShell>
            <SettingsView />
          </AppShell>
        );
      case AppSection.EVENTS:
        return (
          <AppShell>
            <WinterEventView />
          </AppShell>
        );
      case AppSection.SHOP:
        return (
          <AppShell>
            <MarketplaceView />
          </AppShell>
        );
      default:
        return <LandingPage />;
    }
  };

  return (
    <>
      {renderContent()}
      <GlossaryModal open={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <GrandCitadelCertificateModal
        open={certificateOpen}
        onClose={() => setCertificateOpen(false)}
        displayName={profile?.displayName || 'Java Explorer'}
        username={profile?.username || 'explorer'}
        totalXp={profile?.totalXp || 0}
        completedLevelsCount={completedCampaignLevelsCount}
        unlocked={Boolean(profile?.completedMissions.includes('M100'))}
      />
      <InviteNotificationOverlay />
      <RewardToastOverlay />
    </>
  );
};

export default function App() {
  return (
    <CodelandErrorBoundary>
      <PlayerProvider>
        <CodelandRouter />
      </PlayerProvider>
    </CodelandErrorBoundary>
  );
}
