import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { FEATURE_UPDATES, LATEST_UPDATE_VERSION, getUnseenUpdates, markUpdatesSeen, type FeatureUpdate } from '@/lib/featureUpdates';

export function FeatureUpdatePopup() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [updates, setUpdates] = useState<FeatureUpdate[]>([]);

  useEffect(() => {
    if (!profile?.id || FEATURE_UPDATES.length === 0) return;
    const unseen = getUnseenUpdates(profile.id);
    if (unseen.length > 0) {
      setUpdates(unseen);
      setOpen(true);
    }
  }, [profile?.id]);

  const close = () => {
    if (profile?.id) markUpdatesSeen(profile.id, LATEST_UPDATE_VERSION);
    setOpen(false);
  };

  const goTo = (path?: string) => {
    close();
    if (path) navigate(path);
  };

  if (updates.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) close(); }}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle>새로운 기능이 추가되었습니다</DialogTitle>
              <DialogDescription>업데이트 내용을 확인해 주세요.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 pb-2">
            {updates.map(u => (
              <div key={u.version} className="rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">NEW</Badge>
                  <span className="text-xs text-muted-foreground">{u.date}</span>
                </div>
                <h3 className="font-semibold text-base">{u.title}</h3>
                <ul className="mt-3 space-y-2">
                  {u.items.map((it, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
                {u.path && (
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => goTo(u.path)}>
                    바로가기 <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="pt-3 border-t">
          <Button className="w-full" onClick={close}>확인했습니다</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
