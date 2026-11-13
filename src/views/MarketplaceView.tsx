import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Coins,
  Crown,
  Flame,
  Layers,
  Palette,
  Shield,
  ShoppingBag,
  Sparkles,
  Sword,
  Zap,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { MARKETPLACE_ITEMS } from '../data/marketplaceData';
import { AppSection, ShopCategory, ShopItem } from '../types/codeland';
import { HudByteCoinIcon } from '../components/hub/VoxelHubArtwork';
import { AvatarImage } from '../components/BadgeIcon';

const CATEGORIES: { id: ShopCategory | 'all'; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'all', label: 'All Items', icon: ShoppingBag },
  { id: 'skins', label: 'Character Skins', icon: Crown },
  { id: 'pets', label: 'Pets & Companions', icon: Sparkles },
  { id: 'accessories', label: 'Gear & Accessories', icon: Sword },
  { id: 'themes', label: 'World Themes', icon: Palette },
  { id: 'boosters', label: 'XP Boosters & Shields', icon: Zap },
];

export const MarketplaceView: React.FC = () => {
  const {
    profile,
    setSection,
    ownedItemIds,
    equippedSkinId,
    equippedPetId,
    equippedAccessoryId,
    equippedThemeId,
    buyMarketplaceItem,
    equipMarketplaceItem,
    unequipMarketplaceItem,
  } = usePlayer();

  const [activeCategory, setActiveCategory] = useState<ShopCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState<{ id: string; msg: string; type: 'success' | 'error' } | null>(null);

  const filteredItems = MARKETPLACE_ITEMS.filter((item) => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.rarity.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const isEquipped = (item: ShopItem) => {
    if (item.category === 'skins') return equippedSkinId === item.id;
    if (item.category === 'pets') return equippedPetId === item.id;
    if (item.category === 'accessories') return equippedAccessoryId === item.id;
    if (item.category === 'themes') return equippedThemeId === item.id;
    return false;
  };

  const handleBuy = async (item: ShopItem) => {
    setPurchaseStatus(null);
    const res = await buyMarketplaceItem(item.id);
    if (res.success) {
      setPurchaseStatus({ id: item.id, msg: `Unlocked "${item.name}"!`, type: 'success' });
    } else {
      setPurchaseStatus({ id: item.id, msg: res.error || 'Failed to purchase item', type: 'error' });
    }
    setTimeout(() => setPurchaseStatus(null), 3500);
  };

  const handleEquip = async (item: ShopItem) => {
    await equipMarketplaceItem(item.id);
  };

  const handleUnequip = async (category: ShopCategory) => {
    if (category === 'skins' || category === 'pets' || category === 'accessories' || category === 'themes') {
      await unequipMarketplaceItem(category);
    }
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'epic':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'rare':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  return (
    <div className="min-h-full bg-[#080D21] text-[#F8FAFC] pb-16">
      <div className="max-w-[1440px] mx-auto p-4 sm:p-6 space-y-6">
        {/* Top Header & Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-indigo-500/20 pb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSection(AppSection.DASHBOARD)}
              className="p-2 rounded-xl bg-[#131C3F] hover:bg-[#1E2B61] border border-indigo-400/25 text-slate-200 transition-colors cursor-pointer"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                  CODELAND Market
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-indigo-300">Customizations & Upgrades</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Byte Bazaar &amp; Wardrobe
              </h1>
            </div>
          </div>

          {/* Byte Coin Balance Card */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#18234D] to-[#121B3D] border border-amber-400/40 flex items-center gap-3 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
              <HudByteCoinIcon size={26} />
              <div>
                <div className="text-[10px] font-bold text-slate-300 uppercase">Byte Coins</div>
                <div className="text-base sm:text-lg font-black text-[#FBBF24] font-mono leading-none">
                  {profile?.coins.toLocaleString() ?? 0}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSection(AppSection.ACADEMY)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shadow-md"
            >
              Earn in Lessons +
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {purchaseStatus && (
          <div
            className={`p-3.5 rounded-xl border font-semibold text-xs sm:text-sm flex items-center gap-2 animate-in fade-in duration-200 ${
              purchaseStatus.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-400/50 text-emerald-200'
                : 'bg-rose-950/80 border-rose-400/50 text-rose-200'
            }`}
          >
            {purchaseStatus.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Flame className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{purchaseStatus.msg}</span>
          </div>
        )}

        {/* Filter Tabs & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-[#FDE047] via-[#FBBF24] to-[#F59E0B] text-[#0B1026] shadow-[0_0_15px_rgba(251,191,36,0.25)] font-extrabold'
                      : 'bg-[#101738] text-slate-300 hover:bg-[#18234D] hover:text-white border border-indigo-400/15'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search items, skins, pets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64 px-3.5 py-2 rounded-xl bg-[#101738] border border-indigo-400/25 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const owned = ownedItemIds.includes(item.id) || item.price === 0;
            const equipped = isEquipped(item);
            const canAfford = (profile?.coins ?? 0) >= item.price;

            return (
              <div
                key={item.id}
                className={`relative rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 ${
                  equipped
                    ? 'border-emerald-400/50 bg-[#10223A] shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : owned
                    ? 'border-indigo-400/30 bg-[#101838]'
                    : 'border-indigo-500/20 bg-[#0E1533] hover:border-indigo-400/40'
                }`}
              >
                <div>
                  {/* Top Tags */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getRarityBadge(
                        item.rarity
                      )}`}
                    >
                      {item.rarity}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase">
                      {item.category}
                    </span>
                  </div>

                  {/* Artwork Preview Box */}
                  <div className="h-32 rounded-xl bg-gradient-to-b from-[#16214B] to-[#0A0F26] border border-indigo-400/15 flex items-center justify-center p-3 mb-3.5 relative overflow-hidden group">
                    {item.avatarId ? (
                      <div className="transition-transform duration-200 group-hover:scale-110">
                        <AvatarImage avatarId={item.avatarId} sizeClass="w-20 h-20" />
                      </div>
                    ) : item.category === 'pets' ? (
                      <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                        <Sparkles className="w-8 h-8" />
                      </div>
                    ) : item.category === 'accessories' ? (
                      <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                        <Sword className="w-8 h-8" />
                      </div>
                    ) : item.category === 'themes' ? (
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                        <Palette className="w-8 h-8" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                        <Zap className="w-8 h-8" />
                      </div>
                    )}

                    {equipped && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-[#051C12] text-[10px] font-black uppercase flex items-center gap-1 shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Active</span>
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-sm sm:text-base text-white mb-1">{item.name}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4 line-clamp-2">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Action Area */}
                <div className="pt-3 border-t border-indigo-400/15 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-mono">
                    {owned ? (
                      <span className="text-xs font-bold text-slate-400">In Inventory</span>
                    ) : (
                      <>
                        <HudByteCoinIcon size={18} />
                        <span className="text-sm font-extrabold text-[#FBBF24]">
                          {item.price === 0 ? 'FREE' : item.price}
                        </span>
                      </>
                    )}
                  </div>

                  <div>
                    {equipped ? (
                      <button
                        type="button"
                        onClick={() => handleUnequip(item.category)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Unequip
                      </button>
                    ) : owned ? (
                      <button
                        type="button"
                        onClick={() => handleEquip(item)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold transition-colors cursor-pointer shadow-sm"
                      >
                        Equip
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => handleBuy(item)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          canAfford
                            ? 'bg-gradient-to-r from-[#FDE047] via-[#FBBF24] to-[#F59E0B] text-[#0B1026] hover:brightness-110 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        }`}
                      >
                        {canAfford ? 'Unlock' : 'Need Coins'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
