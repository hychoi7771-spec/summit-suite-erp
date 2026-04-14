import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// --- Extensible Emoji Type ---
export interface EmojiItem {
  code: string;        // Unique identifier: unicode char or "custom:<id>"
  label?: string;      // Accessible label / tooltip
  type: 'unicode' | 'image';
  imageUrl?: string;   // Required when type === 'image'
}

export interface EmojiCategory {
  label: string;
  emojis: EmojiItem[];
}

// Helper to create unicode emoji items concisely
const u = (emoji: string, label?: string): EmojiItem => ({
  code: emoji, label, type: 'unicode',
});

// Default categories — can be overridden via props
const DEFAULT_CATEGORIES: EmojiCategory[] = [
  { label: '기본 확인', emojis: [u('👀','확인'), u('✅','완료'), u('🫡','경례'), u('📌','고정')] },
  { label: '칭찬/동기부여', emojis: [u('🔥','불꽃'), u('🚀','로켓'), u('💯','백점'), u('💡','아이디어'), u('🙌','환호')] },
  { label: '문제해결 서포트', emojis: [u('🛠️','도구'), u('🏃‍♂️','달리기'), u('🤝','협력')] },
  { label: '퇴근/워라밸', emojis: [u('🔋','충전'), u('☕','커피'), u('🌙','달'), u('🎮','게임')] },
];

const DEFAULT_QUICK_CODES = ['👀', '🔥', '✅', '🙌'];

// --- Render helper ---
function EmojiDisplay({ item, size = 'sm' }: { item: EmojiItem; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'text-lg w-7 h-7' : size === 'md' ? 'text-base w-5 h-5' : 'text-sm w-4 h-4';
  if (item.type === 'image' && item.imageUrl) {
    return <img src={item.imageUrl} alt={item.label || item.code} className={`inline-block object-contain ${sizeClass}`} />;
  }
  return <span className={size === 'lg' ? 'text-lg' : 'text-sm'}>{item.code}</span>;
}

// --- Lookup helper ---
function findEmojiItem(code: string, categories: EmojiCategory[]): EmojiItem {
  for (const cat of categories) {
    const found = cat.emojis.find(e => e.code === code);
    if (found) return found;
  }
  // Fallback: treat unknown codes as unicode
  return { code, type: 'unicode' };
}

// --- Types ---
interface Reaction {
  emoji_code: string;
  user_id: string;
}

interface EmojiReactionBarProps {
  reportId: string;
  profiles: any[];
  categories?: EmojiCategory[];
  quickCodes?: string[];
}

export function EmojiReactionBar({
  reportId,
  profiles,
  categories = DEFAULT_CATEGORIES,
  quickCodes = DEFAULT_QUICK_CODES,
}: EmojiReactionBarProps) {
  const { profile } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [showQuick, setShowQuick] = useState(false);

  useEffect(() => {
    fetchReactions();
  }, [reportId]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from('daily_report_reactions')
      .select('emoji_code, user_id')
      .eq('report_id', reportId);
    setReactions(data || []);
  };

  const toggleReaction = async (code: string) => {
    if (!profile) return;
    const existing = reactions.find(r => r.emoji_code === code && r.user_id === profile.id);
    if (existing) {
      await supabase
        .from('daily_report_reactions')
        .delete()
        .eq('report_id', reportId)
        .eq('user_id', profile.id)
        .eq('emoji_code', code);
    } else {
      await supabase
        .from('daily_report_reactions')
        .insert({ report_id: reportId, user_id: profile.id, emoji_code: code });
    }
    fetchReactions();
  };

  // Group reactions by emoji code
  const grouped = reactions.reduce((acc, r) => {
    if (!acc[r.emoji_code]) acc[r.emoji_code] = [];
    acc[r.emoji_code].push(r.user_id);
    return acc;
  }, {} as Record<string, string[]>);

  const getNames = (userIds: string[]) =>
    userIds.map(id => profiles.find(p => p.id === id)?.name_kr || '알 수 없음').join(', ');

  const isMine = (code: string) =>
    grouped[code]?.includes(profile?.id || '') || false;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="flex flex-wrap items-center gap-1.5 pt-2"
        onMouseEnter={() => setShowQuick(true)}
        onMouseLeave={() => { if (!popoverOpen) setShowQuick(false); }}
      >
        {/* Existing reactions */}
        {Object.entries(grouped).map(([code, userIds]) => {
          const item = findEmojiItem(code, categories);
          return (
            <Tooltip key={code}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => toggleReaction(code)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-colors cursor-pointer
                    ${isMine(code)
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-muted/50 border-border hover:bg-muted'
                    }`}
                >
                  <EmojiDisplay item={item} size="sm" />
                  <span className="font-medium">{userIds.length}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[200px]">
                {getNames(userIds)}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Quick reaction emojis (on hover) */}
        {showQuick && quickCodes.filter(c => !grouped[c]).map(code => {
          const item = findEmojiItem(code, categories);
          return (
            <button
              key={code}
              onClick={() => toggleReaction(code)}
              className="inline-flex items-center px-1.5 py-0.5 rounded-full border border-dashed border-border text-sm hover:bg-muted/80 transition-colors cursor-pointer opacity-60 hover:opacity-100"
            >
              <EmojiDisplay item={item} size="sm" />
            </button>
          );
        })}

        {/* + button for full picker */}
        <Popover open={popoverOpen} onOpenChange={(open) => { setPopoverOpen(open); if (!open) setShowQuick(false); }}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-6 w-6 rounded-full transition-opacity ${showQuick || popoverOpen || Object.keys(grouped).length > 0 ? 'opacity-100' : 'opacity-0'}`}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" side="top" align="start">
            <div className="space-y-3">
              {categories.map(cat => (
                <div key={cat.label}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{cat.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {cat.emojis.map(item => (
                      <Tooltip key={item.code}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => { toggleReaction(item.code); setPopoverOpen(false); }}
                            className={`p-1 rounded hover:bg-muted transition-colors cursor-pointer ${isMine(item.code) ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}
                          >
                            <EmojiDisplay item={item} size="lg" />
                          </button>
                        </TooltipTrigger>
                        {item.label && (
                          <TooltipContent side="top" className="text-xs">{item.label}</TooltipContent>
                        )}
                      </Tooltip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
}
