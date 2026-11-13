import React from 'react';
import { ArrowRight, Code2, Compass, Flame, Trophy, Sparkles, Check } from 'lucide-react';
import { AppSection } from '../types/codeland';
import { usePlayer } from '../context/PlayerContext';
import { LandingHeroScene } from '../game/LandingHeroScene';
import { ADVENTURE_WORLDS } from '../data/worldsData';
import { JAVA_CURRICULUM } from '../data/curriculum';
import { AvatarImage, VoxelBrandMark } from '../components/BadgeIcon';

export const LandingPage: React.FC = () => {
  const { profile, setSection, pendingInviteRoomCode, openJoinRoomPreviewFlow } = usePlayer();

  const handleStartAdventure = () => {
    if (profile && profile.onboardingCompleted) {
      if (pendingInviteRoomCode) {
        openJoinRoomPreviewFlow(pendingInviteRoomCode);
      } else {
        setSection(AppSection.DASHBOARD);
      }
    } else if (profile) {
      setSection(AppSection.ONBOARDING);
    } else {
      setSection(AppSection.AUTH);
    }
  };

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1B15] text-[#F5F1E6] selection:bg-[#2F7D46] selection:text-white">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-40 h-16 border-b border-emerald-900/50 bg-[#0F1B15]/95">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-8 flex items-center justify-between gap-6">
          {/* Zone 1: Brand Wordmark (1 line) */}
          <a href="#top" className="flex items-center gap-2.5 shrink-0">
            <VoxelBrandMark size={28} />
            <span className="font-display text-base tracking-wider text-white">CODELAND</span>
          </a>

          {/* Zone 2: 4 Concise Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-300">
            <button
              type="button"
              onClick={() => scrollToId('how-it-works')}
              className="hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToId('why-codeland')}
              className="hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              Why CODELAND
            </button>
            <button
              type="button"
              onClick={() => scrollToId('worlds-showcase')}
              className="hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              Explore Worlds
            </button>
            <button
              type="button"
              onClick={() => scrollToId('java-roadmap')}
              className="hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              Java Path
            </button>
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <button
            type="button"
            onClick={handleStartAdventure}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#2F7D46] hover:bg-[#389152] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
          >
            {pendingInviteRoomCode
              ? `Join Room ${pendingInviteRoomCode}`
              : profile?.onboardingCompleted
                ? 'Open Dashboard'
                : 'Start Your Adventure'}
          </button>
        </div>
      </header>

      {/* Section 1: Hero */}
      <section id="top" className="relative overflow-hidden py-12 lg:py-20 border-b border-emerald-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Hero Copy */}
          <div className="lg:col-span-6 space-y-6">
            <p className="text-xs sm:text-sm font-mono uppercase tracking-widest text-[#F5C451]">
              Learn Java. Master the Code. Explore the World.
            </p>

            <h1 className="text-4xl sm:text-5xl xl:text-[56px] font-extrabold tracking-tight leading-[1.08] text-white">
              Your Java Adventure Starts Here.
            </h1>

            <p className="text-base sm:text-lg text-stone-300 leading-relaxed max-w-xl">
              Learn Java step by step, solve interactive coding challenges, unlock block-built 3D
              worlds, maintain daily streaks, and climb the CODELAND leaderboard.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                type="button"
                onClick={handleStartAdventure}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-base font-bold bg-[#2F7D46] hover:bg-[#3A9454] text-white shadow-lg transition-all cursor-pointer whitespace-nowrap"
              >
                <span>
                  {pendingInviteRoomCode
                    ? `Join Private Room ${pendingInviteRoomCode}`
                    : 'Start Your Adventure'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => scrollToId('worlds-showcase')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold border border-emerald-700/70 bg-[#173B2B]/60 hover:bg-[#173B2B] text-[#F5F1E6] transition-colors cursor-pointer"
              >
                <span>Explore Worlds</span>
              </button>
            </div>

            {/* Unboxed Clean Highlights */}
            <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-stone-400">
              <span>6 Playable 3D Voxel Biomes</span>
              <span>·</span>
              <span>18 Guided Java Lessons</span>
              <span>·</span>
              <span>Live Browser Java Simulator</span>
            </div>
          </div>

          {/* Right Live 3D Voxel Scene */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl border border-emerald-800/60 bg-[#13261E] overflow-hidden shadow-2xl h-[380px] sm:h-[440px]">
              <LandingHeroScene />
              {/* Opaque non-blur corner caption so software WebGL stays fast */}
              <div className="absolute bottom-3 left-3 right-3 sm:right-auto px-3.5 py-2 rounded-xl bg-[#101F18]/95 border border-emerald-800/60 pointer-events-none">
                <div className="font-display text-[11px] text-[#F5C451] tracking-wide">
                  WORLD 01 · THE BEGINNER&apos;S FOREST
                </div>
                <div className="text-xs text-stone-300 font-mono">
                  System.out.println(&quot;Portal Activated!&quot;);
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: How CODELAND Works (5 Steps) */}
      <section id="how-it-works" className="py-20 bg-[#13221B] border-b border-emerald-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
          <div className="max-w-2xl space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-[#69B9E7]">
              Step-by-Step Progression
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              How CODELAND Works
            </h2>
            <p className="text-stone-300 text-base leading-relaxed">
              Every Java concept you master in the Academy directly powers bridges, gates, and
              ancient machines inside your 3D adventure worlds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                step: '01',
                title: 'Learn a Java Concept',
                desc: 'Read clear, plain-English lessons with interactive visual labs and line-by-line breakdowns.',
              },
              {
                step: '02',
                title: 'Practice in the Code Editor',
                desc: 'Write real Java syntax in the browser simulator with instant output and friendly error guidance.',
              },
              {
                step: '03',
                title: 'Unlock the 3D Adventure World',
                desc: 'Complete a module’s lessons and readiness check to open that region’s block-built 3D biome.',
              },
              {
                step: '04',
                title: 'Solve In-Game Java Challenges',
                desc: 'Explore with WASD, speak to voxel guides, and program broken bridges, lifts, and castle gates.',
              },
              {
                step: '05',
                title: 'Earn XP, Streaks & Rank Up',
                desc: 'Collect Byte Coins, keep your daily learning flame lit, unlock badges, and climb the leaderboard.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-5 rounded-2xl border border-emerald-900/60 bg-[#172B22] flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="font-display text-lg text-[#F5C451]">{item.step}</div>
                  <h3 className="text-base font-bold text-white leading-snug">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Why CODELAND? */}
      <section id="why-codeland" className="py-20 bg-[#0F1B15] border-b border-emerald-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
          <div className="max-w-2xl space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-[#F5C451]">
              Built exclusively for Java Mastery
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Why CODELAND?
            </h2>
            <p className="text-stone-300 text-base leading-relaxed">
              Designed from the ground up so complete beginners build rock-solid Java fundamentals
              without intimidation or dry walls of theory.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: Code2,
                color: '#69B9E7',
                title: 'Interactive Java Learning',
                desc: 'Focused 100% on Java—from your first main() method and primitive variables to methods, classes, constructors, and inheritance—with beginner-friendly error translation.',
              },
              {
                icon: Compass,
                color: '#2F7D46',
                title: 'Playable 3D Block Worlds',
                desc: 'Step inside six distinct voxel worlds in third-person 3D. When your Java code succeeds, drawbridges physically lower and portals ignite in front of you.',
              },
              {
                icon: Flame,
                color: '#F28C45',
                title: 'Daily Streaks & Meaningful Habits',
                desc: 'Complete at least one lesson, exercise, or mission each day to build your streak from 3 days to 100 days, tracked with a visual calendar.',
              },
              {
                icon: Trophy,
                color: '#F5C451',
                title: 'Leaderboards, XP & Achievements',
                desc: 'Earn anti-farming XP, Byte Coins, and 15 milestone badges as you progress from Novice Explorer to CODELAND Master.',
              },
            ].map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="p-6 rounded-2xl border border-emerald-900/60 bg-[#15271F] flex gap-4 items-start"
                >
                  <div
                    className="p-3 rounded-xl shrink-0"
                    style={{ backgroundColor: `${feat.color}20`, color: feat.color }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">{feat.title}</h3>
                    <p className="text-sm text-stone-300 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 4: Explore the Worlds & Java Curriculum */}
      <section id="worlds-showcase" className="py-20 bg-[#13221B] border-b border-emerald-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
          <div id="java-roadmap" className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-3 max-w-2xl">
              <div className="text-xs font-mono uppercase tracking-widest text-[#69B9E7]">
                6 Regions · 6 Progressive Java Modules
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Explore the Worlds of CODELAND
              </h2>
              <p className="text-stone-300 text-base">
                Each voxel region pairs a story-driven Java curriculum module with a playable 3D
                mission guided by a resident blocky mentor.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ADVENTURE_WORLDS.map((world) => {
              const curr = JAVA_CURRICULUM.find((c) => c.levelNumber === world.levelNumber);
              return (
                <div
                  key={world.worldId}
                  className="rounded-2xl border border-emerald-900/60 bg-[#172C22] overflow-hidden flex flex-col justify-between"
                >
                  {/* Biome Color Banner */}
                  <div>
                    <div
                      className="h-3 w-full"
                      style={{
                        background: `linear-gradient(90deg, ${world.groundPrimaryHex}, ${world.accentHex})`,
                      }}
                    />
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between text-xs font-mono text-stone-400">
                        <span>LEVEL 0{world.levelNumber}</span>
                        <span>{world.biomeTitle}</span>
                      </div>

                      <h3 className="font-display text-lg text-white leading-snug">{world.name}</h3>

                      <p className="text-sm text-stone-300 leading-relaxed">{world.tagline}</p>

                      {curr && (
                        <ul className="space-y-1.5 pt-1">
                          {curr.topics.slice(0, 3).map((t) => (
                            <li key={t} className="flex items-center gap-2 text-xs text-emerald-200/90">
                              <Check className="w-3.5 h-3.5 text-[#F5C451] shrink-0" />
                              <span>{t}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="px-6 py-3.5 bg-[#12231B] border-t border-emerald-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <AvatarImage avatarId={world.npcAvatarId} sizeClass="w-8 h-8" />
                      <div className="text-xs">
                        <div className="font-semibold text-stone-200">Guide: {world.npcName}</div>
                        <div className="text-stone-400">{world.npcRole}</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#F5C451]">+100 XP</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 5: Final Call-to-Action */}
      <section className="py-20 bg-[#173B2B] border-b border-emerald-900/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#2F7D46]/30 text-[#F5C451]">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to turn your code into an adventure?
          </h2>
          <p className="text-base sm:text-lg text-emerald-100/90 max-w-2xl mx-auto leading-relaxed">
            Create your voxel explorer, write your very first Java program in minutes, and awaken
            The Beginner&apos;s Forest today.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleStartAdventure}
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold bg-[#F5C451] hover:bg-[#f7cf6d] text-[#202923] shadow-xl transition-colors cursor-pointer"
            >
              <span>Enter CODELAND</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#0C1510] text-stone-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <VoxelBrandMark size={20} />
            <span className="font-display text-stone-200">CODELAND</span>
            <span>·</span>
            <span>Interactive 3D Java Learning &amp; Voxel Adventure</span>
          </div>
          <div>Java Education Platform · Built for Beginners &amp; Explorers</div>
        </div>
      </footer>
    </div>
  );
};
