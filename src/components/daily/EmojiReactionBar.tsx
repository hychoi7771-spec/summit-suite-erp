import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const EMOJI_CATEGORIES = [
  { label: '기본 확인', emojis: ['👀', '✅', '🫡', '📌'] },
  { label: '칭찬/동기부여', emojis: ['🔥', '🚀', '💯', '💡', '🙌'] },
  { label: '문제해결 서포트', emojis: ['🛠️', '🏃‍♂️', '🤝'] },
  { label: '퇴근/워라밸', emojis: ['🔋', '☕', '🌙', '🎮'] },
];

const QUICK_EMOJIS = ['👀', '🔥', '✅', '🙌'];

interface Reaction {
  emoji_code: string;
  user_id: string;
}

interface EmojiReactionBarProps {
  reportId: string;
  profiles: any[];
}

export function EmojiReactionBar({ reportId, profiles }: EmojiReactionBarProps) {
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

  const toggleReaction = async (emoji: string) => {
    if (!profile) return;
    const existing = reactions.find(r => r.emoji_code === emoji && r.user_id === profile.id);
    if (existing) {
      await supabase
        .from('daily_report_reactions')
        .delete()
        .eq('report_id', reportId)
        .eq('user_id', profile.id)
        .eq('emoji_code', emoji);
    } else {
      await supabase
        .from('daily_report_reactions')
        .insert({ report_id: reportId, user_id: profile.id, emoji_code: emoji });
    }
    fetchReactions();
  };

  // Group reactions by emoji
  const grouped = reactions.reduce((acc, r) => {
    if (!acc[r.emoji_code]) acc[r.emoji_code] = [];
    acc[r.emoji_code].push(r.user_id);
    return acc;
  }, {} as Record<string, string[]>);

  const getNames = (userIds: string[]) =>
    userIds.map(id => profiles.find(p => p.id === id)?.name_kr || '알 수 없음').join(', ');

  const isMine = (emoji: string) =>
    grouped[emoji]?.includes(profile?.id || '') || false;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="flex flex-wrap items-center gap-1.5 pt-2"
        onMouseEnter={() => setShowQuick(true)}
        onMouseLeave={() => { if (!popoverOpen) setShowQuick(false); }}
      >
        {/* Existing reactions */}
        {Object.entries(grouped).map(([emoji, userIds]) => (
          <Tooltip key={emoji}>
            <TooltipTrigger asChild>
              <button
                onClick={() => toggleReaction(emoji)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-colors cursor-pointer
                  ${isMine(emoji)
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-muted/50 border-border hover:bg-muted'
                  }`}
              >
                <span className="text-sm">{emoji}</span>
                <span className="font-medium">{userIds.length}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[200px]">
              {getNames(userIds)}
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Quick reaction emojis (on hover) */}
        {showQuick && QUICK_EMOJIS.filter(e => !grouped[e]).map(emoji => (
          <button
            key={emoji}
            onClick={() => toggleReaction(emoji)}
            className="inline-flex items-center px-1.5 py-0.5 rounded-full border border-dashed border-border text-sm hover:bg-muted/80 transition-colors cursor-pointer opacity-60 hover:opacity-100"
          >
            {emoji}
          </button>
        ))}

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
              {EMOJI_CATEGORIES.map(cat => (
                <div key={cat.label}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{cat.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {cat.emojis.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => { toggleReaction(emoji); setPopoverOpen(false); }}
                        className={`text-lg p-1 rounded hover:bg-muted transition-colors cursor-pointer ${isMine(emoji) ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}
                      >
                        {emoji}
                      </button>
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
