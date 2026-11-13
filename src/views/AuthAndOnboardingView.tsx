import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Compass,
  ShieldCheck,
  Laptop,
  Sparkles,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { AppSection, ExperienceLevel } from '../types/codeland';
import { usePlayer } from '../context/PlayerContext';
import { CHARACTER_AVATARS } from '../data/charactersAndBadges';
import { AvatarImage, VoxelBrandMark } from '../components/BadgeIcon';

export const AuthAndOnboardingView: React.FC = () => {
  const {
    section,
    setSection,
    profile,
    authError,
    tokenServiceActivationUrl,
    clearAuthError,
    loginWithGoogle,
    enterDemoMode,
    completeOnboarding,
    pendingInviteRoomCode,
  } = usePlayer();
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [username, setUsername] = useState(profile?.username || 'java_explorer');
  const [displayName, setDisplayName] = useState(profile?.displayName || 'Alex Explorer');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    profile?.experienceLevel || 'beginner'
  );
  const [avatarId, setAvatarId] = useState(profile?.avatarId || 'character-a');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || 'java_explorer');
      setDisplayName(profile.displayName || 'Alex Explorer');
      setExperienceLevel(profile.experienceLevel || 'beginner');
      setAvatarId(profile.avatarId || 'character-a');
    }
  }, [profile]);

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedDisplay = displayName.trim();
    const cleanedHandle = username.trim().replace(/[^a-zA-Z0-9_-]/g, '');

    if (trimmedDisplay.length < 2) {
      setFormError('Please enter a Display Name of at least 2 characters.');
      return;
    }
    if (cleanedHandle.length < 3) {
      setFormError('Username must contain at least 3 letters or numbers.');
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      await completeOnboarding({
        username: cleanedHandle,
        displayName: trimmedDisplay,
        experienceLevel,
        avatarId,
      });
    } catch (err) {
      console.error(err);
      setFormError('Could not save onboarding profile. Please try again.');
      setSubmitting(false);
    }
  };

  if (section === AppSection.AUTH) {
    return (
      <div className="min-h-screen bg-[#0F1B15] text-[#F5F1E6] flex flex-col">
        <header className="h-16 px-4 sm:px-8 flex items-center justify-between border-b border-emerald-950">
          <button
            type="button"
            onClick={() => {
              clearAuthError();
              setSection(AppSection.LANDING);
            }}
            className="inline-flex items-center gap-2 text-sm text-stone-300 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <div className="flex items-center gap-2">
            <VoxelBrandMark size={24} />
            <span className="font-display text-sm text-white">CODELAND</span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md rounded-2xl border border-emerald-900/70 bg-[#15271F] p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="space-y-2 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-[#2F7D46]/25 flex items-center justify-center">
                <VoxelBrandMark size={30} />
              </div>
              <h1 className="text-2xl font-extrabold text-white">Enter CODELAND</h1>
              <p className="text-sm text-stone-300 leading-relaxed">
                Sign in to sync your Java XP, 3D worlds, daily streak, and global leaderboard rank
                to the cloud—or jump right in with a local Explorer session.
              </p>
            </div>

            {pendingInviteRoomCode && (
              <div className="p-3.5 rounded-xl bg-[#1D392C] border border-[#F5C451] text-xs text-emerald-50 space-y-1">
                <div className="font-mono uppercase tracking-wider text-[#F5C451] font-bold">
                  Room Invitation Saved · Code {pendingInviteRoomCode}
                </div>
                <p className="leading-relaxed text-stone-200">
                  Sign in or launch Local Demo Explorer below. We will take you directly to Room{' '}
                  <strong className="font-mono text-white">{pendingInviteRoomCode}</strong> right
                  after authentication!
                </p>
              </div>
            )}

            {authError && (
              <div className="p-3.5 rounded-xl bg-[#2C2118] border border-[#F28C45]/50 text-xs text-amber-100 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#F28C45] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{authError}</span>
                </div>
                {tokenServiceActivationUrl && (
                  <div className="p-2.5 rounded-lg bg-[#1A130E] border border-[#F28C45]/30 space-y-2">
                    <div className="font-mono text-[11px] break-all text-amber-200 select-all">
                      {tokenServiceActivationUrl}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(tokenServiceActivationUrl);
                        setCopiedUrl(true);
                        window.setTimeout(() => setCopiedUrl(false), 2500);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#2F7D46] hover:bg-[#389152] text-white cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>
                        {copiedUrl ? 'Copied Activation Link!' : 'Copy Google Cloud Activation URL'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              {/* Primary Cloud Auth via Firebase Google Sign-In */}
              <button
                type="button"
                onClick={() => void loginWithGoogle()}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-[#2F7D46] hover:bg-[#389152] text-white flex items-center justify-center gap-2.5 shadow-md transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#F5C451]" />
                <span>Continue with Google (Cloud Sync)</span>
              </button>

              <div className="relative py-2 flex items-center justify-center">
                <div className="border-t border-emerald-900/70 w-full" />
                <span className="px-3 bg-[#15271F] text-[11px] uppercase tracking-wider text-stone-400">
                  or
                </span>
                <div className="border-t border-emerald-900/70 w-full" />
              </div>

              {/* Honest Local Demo Explorer Mode */}
              <button
                type="button"
                onClick={enterDemoMode}
                className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm border border-emerald-700/70 bg-[#1B3328] hover:bg-[#234133] text-stone-100 flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
              >
                <Laptop className="w-4 h-4 text-[#69B9E7]" />
                <span>Launch Local Demo Explorer</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#101E17] border border-emerald-950 text-xs text-stone-400 space-y-1.5 leading-relaxed">
              <div className="font-semibold text-stone-200">Account Storage Transparency</div>
              <p>
                <strong className="text-emerald-300">Google Sign-In:</strong> Secured with Firebase
                Authentication &amp; Cloud Firestore across devices and live leaderboards.
              </p>
              <p>
                <strong className="text-[#69B9E7]">Local Demo Explorer:</strong> Full access to all
                18 Java lessons and 6 3D worlds saved locally in this browser.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ONBOARDING VIEW
  const selectedCharacter =
    CHARACTER_AVATARS.find((c) => c.id === avatarId) || CHARACTER_AVATARS[0];

  return (
    <div className="min-h-screen bg-[#0F1B15] text-[#F5F1E6] py-8 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <VoxelBrandMark size={28} />
            <span className="font-display text-base text-white">CODELAND</span>
          </div>
          {profile?.isDemo && (
            <span className="text-xs font-mono text-[#69B9E7]">Local Demo Explorer Setup</span>
          )}
        </div>

        <form
          onSubmit={(e) => void handleOnboardingSubmit(e)}
          className="rounded-2xl border border-emerald-900/70 bg-[#15271F] p-6 sm:p-8 shadow-2xl space-y-8"
        >
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-widest text-[#F5C451]">
              Explorer Profile Setup
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Create Your Voxel Java Explorer
            </h1>
            <p className="text-sm text-stone-300">
              Customize your identity and select the blocky 3D character you will pilot across
              CODELAND&apos;s six Java worlds.
            </p>
          </div>

          {pendingInviteRoomCode && (
            <div className="p-3.5 rounded-xl bg-[#1D392C] border border-[#F5C451] text-xs text-emerald-50">
              Complete your Explorer profile below to enter invited Private Room{' '}
              <strong className="font-mono text-[#F5C451]">{pendingInviteRoomCode}</strong>!
            </div>
          )}

          {formError && (
            <div className="p-3.5 rounded-xl bg-[#2C2118] border border-[#F28C45]/50 text-xs text-amber-100">
              {formError}
            </div>
          )}

          {/* Step 1: Identity Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label htmlFor="onboard-display" className="block text-xs font-semibold text-stone-200">
                Explorer Display Name
              </label>
              <input
                id="onboard-display"
                type="text"
                maxLength={36}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Timber"
                className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-800 bg-[#0F1B15] text-sm text-white focus:outline-none focus:border-[#F5C451]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="onboard-username" className="block text-xs font-semibold text-stone-200">
                Leaderboard Handle (@username)
              </label>
              <input
                id="onboard-username"
                type="text"
                maxLength={24}
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                placeholder="e.g. alex_voxel"
                className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-800 bg-[#0F1B15] text-sm font-mono text-white focus:outline-none focus:border-[#F5C451]"
                required
              />
            </div>
          </div>

          {/* Step 2: Java Experience Level */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-stone-200">
              Your Current Java Experience
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'beginner' as ExperienceLevel,
                  title: 'Complete Beginner',
                  desc: 'Brand new to coding & Java. Guide me from step one!',
                },
                {
                  id: 'some_java' as ExperienceLevel,
                  title: 'Know a Little Java',
                  desc: 'Seen println or variables before and want structured practice.',
                },
                {
                  id: 'some_programming' as ExperienceLevel,
                  title: 'Already Know Some Programming',
                  desc: 'Used another language and ready to learn Java syntax & OOP.',
                },
              ].map((opt) => {
                const active = experienceLevel === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setExperienceLevel(opt.id)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                      active
                        ? 'border-[#F5C451] bg-[#1E392C]'
                        : 'border-emerald-900/70 bg-[#101E17] hover:bg-[#172B21]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{opt.title}</span>
                      {active && <Check className="w-4 h-4 text-[#F5C451]" />}
                    </div>
                    <p className="text-xs text-stone-400 leading-relaxed">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: 18 Kenney Blocky Characters Picker */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-stone-200">
                Choose Your 3D Blocky Character ({CHARACTER_AVATARS.length} Available)
              </label>
              <span className="text-xs font-mono text-[#F5C451]">
                Selected: {selectedCharacter.name} · {selectedCharacter.roleTitle}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 max-h-72 overflow-y-auto p-1">
              {CHARACTER_AVATARS.map((char) => {
                const isSelected = char.id === avatarId;
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => setAvatarId(char.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#F5C451] bg-[#1F3B2D] shadow-md'
                        : 'border-emerald-900/60 bg-[#101E17] hover:bg-[#182C22]'
                    }`}
                  >
                    <AvatarImage avatarId={char.id} sizeClass="w-14 h-14" />
                    <div className="text-center">
                      <div className="text-xs font-bold text-white truncate max-w-[90px]">
                        {char.name}
                      </div>
                      <div className="text-[10px] text-stone-400 truncate max-w-[90px]">
                        {char.roleTitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Welcome Preview & Launch Button */}
          <div className="p-4 rounded-xl bg-[#101E17] border border-emerald-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <AvatarImage avatarId={avatarId} sizeClass="w-14 h-14" />
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#F5C451]" />
                  <span>Starting Destination: Level 1 — The Beginner&apos;s Forest</span>
                </div>
                <p className="text-xs text-stone-400">
                  Byte is waiting to guide you through your first Java program and 3D forest relay.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm bg-[#2F7D46] hover:bg-[#389152] disabled:opacity-60 text-white flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer shrink-0"
            >
              <Compass className="w-4 h-4" />
              <span>{submitting ? 'Launching World...' : 'Begin My Java Adventure'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
