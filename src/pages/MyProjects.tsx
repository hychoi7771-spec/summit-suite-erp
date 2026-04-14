import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderKanban, Calendar, Users, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const stageColors: Record<string, string> = {
  Planning: 'bg-muted text-muted-foreground',
  'R&D/Sampling': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Design: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Certification: 'bg-warning/10 text-warning',
  Production: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Launch: 'bg-success/10 text-success',
};

export default function MyProjects() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetch = async () => {
      const [projRes, profRes] = await Promise.all([
        supabase.from('products').select('*').order('updated_at', { ascending: false }),
        supabase.from('profiles').select('id, name, name_kr, avatar'),
      ]);
      const all = projRes.data || [];
      // Filter: assignee or participant
      const mine = all.filter(p =>
        p.assignee_id === profile.id ||
        (p.participant_ids || []).includes(profile.id)
      );
      setProjects(mine);
      setProfiles(profRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [profile]);

  const getProfile = (id: string) => profiles.find(p => p.id === id);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">내 프로젝트</h1>
        <p className="text-sm text-muted-foreground mt-1">내가 담당하거나 참여 중인 프로젝트 목록입니다</p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">참여 중인 프로젝트가 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {projects.map((proj, i) => {
              const assignee = proj.assignee_id ? getProfile(proj.assignee_id) : null;
              return (
                <motion.div
                  key={proj.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/projects')}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm text-foreground">{proj.name}</h3>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${stageColors[proj.stage] || ''}`}>
                          {proj.stage}
                        </Badge>
                      </div>
                      {proj.description && <p className="text-xs text-muted-foreground line-clamp-2">{proj.description}</p>}
                      <Progress value={proj.progress} className="h-1.5" />
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          {assignee && (
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">{assignee.avatar}</AvatarFallback>
                            </Avatar>
                          )}
                          <span>{assignee?.name_kr || assignee?.name}</span>
                        </div>
                        {proj.deadline && (
                          <span className="flex items-center gap-0.5">
                            <Calendar className="h-3 w-3" />
                            {new Date(proj.deadline).toLocaleDateString('ko-KR')}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
