import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type TargetType = 'task' | 'approval' | 'notice';
type EmojiKey = 'thumbs_up' | 'heart' | 'party' | 'smile' | 'pray';

const EMOJIS: { key: EmojiKey; char: string; label: string }[] = [
  { key: 'thumbs_up', char: '👍', label: '좋아요' },
  { key: 'heart', char: '❤️', label: '응원' },
  { key: 'party', char: '🎉', label: '축하' },
  { key: 'smile', char: '😄', label: '미소' },
  { key: 'pray', char: '🙏', label: '감사' },
];

interface ReactionBarProps {
  targetType: TargetType;
  targetId: string;
  className?: string;
}

interface ReactionRow {
  id: string;
  emoji: EmojiKey;
  user_id: string;
}

export function ReactionBar({ targetType, targetId, className }: ReactionBarProps) {
  const { profile } = useAuth();
  const [rows, setRows] = useState<ReactionRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from('reactions')
        .select('id, emoji, user_id')
        .eq('target_type', targetType)
        .eq('target_id', targetId);
      if (active) setRows((data || []) as ReactionRow[]);
    };
    load();

    const channel = supabase
      .channel(`reactions-${targetType}-${targetId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions', filter: `target_id=eq.${targetId}` },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [targetType, targetId]);

  const toggle = async (emoji: EmojiKey) => {
    if (!profile || loading) return;
    setLoading(true);
    const mine = rows.find(r => r.emoji === emoji && r.user_id === profile.id);
    if (mine) {
      await supabase.from('reactions').delete().eq('id', mine.id);
    } else {
      await supabase.from('reactions').insert({
        target_type: targetType,
        target_id: targetId,
        user_id: profile.id,
        emoji,
      });
    }
    setLoading(false);
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {EMOJIS.map(e => {
        const list = rows.filter(r => r.emoji === e.key);
        const count = list.length;
        const active = !!profile && list.some(r => r.user_id === profile.id);
        return (
          <button
            key={e.key}
            type="button"
            onClick={() => toggle(e.key)}
            title={e.label}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
              active
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-background hover:bg-muted',
            )}
          >
            <span className="text-sm leading-none">{e.char}</span>
            {count > 0 && <span className="text-[11px] font-medium tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
