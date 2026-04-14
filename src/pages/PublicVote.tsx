import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertCircle } from 'lucide-react';
import logo from '@/assets/logo.jpg';

const ANON_VOTER_TOKEN_KEY = 'survey_voter_token';

function getAnonymousVoterToken(): string {
  let token = localStorage.getItem(ANON_VOTER_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(ANON_VOTER_TOKEN_KEY, token);
  }
  return token;
}

function getVoterToken(userId?: string): string {
  if (userId) return `auth:${userId}`;
  return getAnonymousVoterToken();
}

export default function PublicVote() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const [survey, setSurvey] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [voted, setVoted] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    const fetch = async () => {
      if (!token) {
        setError('잘못된 링크입니다');
        setLoading(false);
        return;
      }

      const { data: surveyData } = await supabase
        .from('surveys')
        .select('*')
        .eq('share_token', token)
        .eq('is_active', true)
        .single();

      if (!surveyData) {
        setError('존재하지 않거나 마감된 설문입니다');
        setLoading(false);
        return;
      }

      if (surveyData.expires_at && new Date(surveyData.expires_at) < new Date()) {
        setError('마감된 설문입니다');
        setLoading(false);
        return;
      }

      setSurvey(surveyData);

      const { data: opts } = await supabase
        .from('survey_options')
        .select('*')
        .eq('survey_id', surveyData.id)
        .order('sort_order');
      setOptions(opts || []);

      const voterToken = getVoterToken(user?.id);
      const { data: existing } = await supabase
        .from('survey_votes')
        .select('id')
        .eq('survey_id', surveyData.id)
        .eq('voter_token', voterToken)
        .maybeSingle();

      if (existing) setAlreadyVoted(true);
      setLoading(false);
    };

    fetch();
  }, [token, authLoading, user?.id]);

  const handleVote = async () => {
    if (!selected || !survey) return;
    setSubmitting(true);

    const voterToken = getVoterToken(user?.id);
    const { error: insertError } = await supabase
      .from('survey_votes')
      .insert({
        survey_id: survey.id,
        option_id: selected,
        voter_token: voterToken,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        setAlreadyVoted(true);
      } else {
        setError('투표 중 오류가 발생했습니다');
      }
      setSubmitting(false);
      return;
    }

    setVoted(true);
    setSubmitting(false);
  };

  const hasImages = options.some((opt) => opt.image_url);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className={`w-full ${hasImages ? 'max-w-4xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-center gap-2 mb-6">
          <img src={logo} alt="RecovHub" className="h-8 w-8 rounded-lg object-contain" />
          <span className="text-lg font-bold text-foreground">RecovHub 설문</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : voted ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
              <p className="text-lg font-medium text-foreground">투표가 완료되었습니다</p>
              <p className="text-sm text-muted-foreground mt-1">참여해 주셔서 감사합니다!</p>
            </CardContent>
          </Card>
        ) : alreadyVoted ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium text-foreground">이미 투표하셨습니다</p>
              <p className="text-sm text-muted-foreground mt-1">동일한 기기에서는 1회만 투표할 수 있습니다</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{survey.title}</CardTitle>
              {survey.description && <CardDescription>{survey.description}</CardDescription>}
              {survey.description_image_urls && survey.description_image_urls.length > 0 && (
                <div className="flex flex-col gap-3 mt-3">
                  {survey.description_image_urls.map((url: string, i: number) => (
                    <img key={i} src={url} alt="" className="w-full max-h-[60rem] object-contain rounded-lg" />
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={selected} onValueChange={setSelected}>
                <div className={hasImages ? 'grid grid-cols-2 gap-3' : 'space-y-2'}>
                  {options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`flex ${opt.image_url ? 'flex-col' : 'flex-row items-center'} rounded-lg border p-3 hover:bg-accent/50 cursor-pointer transition-colors ${selected === opt.id ? 'ring-2 ring-primary border-primary' : ''}`}
                      onClick={() => setSelected(opt.id)}
                    >
                      {opt.image_url && (
                        <img
                          src={opt.image_url}
                          alt={opt.option_text}
                          className="w-full max-h-[48rem] object-contain rounded-md mb-2"
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value={opt.id} id={opt.id} />
                        <Label htmlFor={opt.id} className="flex-1 cursor-pointer">
                          {opt.option_text !== '(이미지)' ? opt.option_text : ''}
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              <Button onClick={handleVote} disabled={!selected || submitting} className="w-full">
                {submitting ? '제출 중...' : '투표하기'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">무기명 투표 · 응답은 익명으로 처리됩니다</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
