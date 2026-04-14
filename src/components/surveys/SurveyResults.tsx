import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Props {
  surveyId: string;
  onBack: () => void;
}

export function SurveyResults({ surveyId, onBack }: Props) {
  const [survey, setSurvey] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const [surveyRes, optionsRes, votesRes] = await Promise.all([
        supabase.from('surveys').select('*').eq('id', surveyId).single(),
        supabase.from('survey_options').select('*').eq('survey_id', surveyId).order('sort_order'),
        supabase.from('survey_votes').select('option_id').eq('survey_id', surveyId),
      ]);

      setSurvey(surveyRes.data);
      setOptions(optionsRes.data || []);

      const counts: Record<string, number> = {};
      (votesRes.data || []).forEach((v: any) => {
        counts[v.option_id] = (counts[v.option_id] || 0) + 1;
      });
      setVoteCounts(counts);
      setTotalVotes(votesRes.data?.length || 0);
    };
    fetch();
  }, [surveyId]);

  if (!survey) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const hasImages = options.some(opt => opt.image_url);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{survey.title}</h1>
          <p className="text-sm text-muted-foreground">총 {totalVotes}명 투표</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">투표 결과</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {options.map(opt => {
            const count = voteCounts[opt.id] || 0;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            return (
              <div key={opt.id} className="space-y-2">
                {opt.image_url && (
                  <img
                    src={opt.image_url}
                    alt={opt.option_text}
                    className="max-h-[48rem] rounded-md object-contain"
                  />
                )}
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    {opt.option_text !== '(이미지)' ? opt.option_text : '이미지 옵션'}
                  </span>
                  <span className="text-muted-foreground">{count}표 ({pct}%)</span>
                </div>
                <Progress value={pct} className="h-3" />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
