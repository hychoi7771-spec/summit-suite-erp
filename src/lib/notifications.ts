import { supabase } from '@/integrations/supabase/client';

async function sendVia(userIds: string[], title: string, message: string, type: string, relatedId?: string) {
  if (!userIds.length) return;
  await supabase.rpc('send_notifications', {
    _user_ids: userIds,
    _title: title,
    _message: message,
    _type: type,
    _related_id: relatedId ?? null,
  });
}

/**
 * Send notifications to CEO and admin (general_director) users
 */
export async function notifyAdmins(title: string, message: string, type: string = 'general', relatedId?: string) {
  const { data: adminRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['ceo', 'general_director']);

  if (!adminRoles?.length) return;
  await sendVia(adminRoles.map(r => r.user_id), title, message, type, relatedId);
}

/**
 * Send a notification to a specific user (by profile_id)
 */
export async function notifyUser(profileId: string, title: string, message: string, type: string = 'general', relatedId?: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('id', profileId)
    .single();

  if (!profile) return;
  await sendVia([profile.user_id], title, message, type, relatedId);
}

/**
 * Send notifications to multiple users by profile IDs
 */
export async function notifyUsers(profileIds: string[], title: string, message: string, type: string = 'general', relatedId?: string) {
  if (profileIds.length === 0) return;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id')
    .in('id', profileIds);

  if (!profiles?.length) return;
  await sendVia(profiles.map(p => p.user_id), title, message, type, relatedId);
}

/**
 * Send a notification to ALL team members (excluding the sender)
 */
export async function notifyAllUsers(senderProfileId: string, title: string, message: string, type: string = 'general', relatedId?: string) {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id')
    .neq('id', senderProfileId);

  if (!profiles?.length) return;
  await sendVia(profiles.map(p => p.user_id), title, message, type, relatedId);
}
