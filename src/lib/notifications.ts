import { supabase } from '@/integrations/supabase/client';

/**
 * Send notifications to CEO and admin (general_director) users
 */
export async function notifyAdmins(title: string, message: string, type: string = 'general', relatedId?: string) {
  const { data: adminRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['ceo', 'general_director']);

  if (!adminRoles || adminRoles.length === 0) return;

  const notifications = adminRoles.map(r => ({
    user_id: r.user_id,
    type,
    title,
    message,
    related_id: relatedId || null,
  }));

  await supabase.from('notifications').insert(notifications);
}

/**
 * Send a notification to a specific user (by profile_id)
 */
export async function notifyUser(profileId: string, title: string, message: string, type: string = 'general', relatedId?: string) {
  // Look up user_id from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('id', profileId)
    .single();

  if (!profile) return;

  await supabase.from('notifications').insert({
    user_id: profile.user_id,
    type,
    title,
    message,
    related_id: relatedId || null,
  });
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

  if (!profiles || profiles.length === 0) return;

  const notifications = profiles.map(p => ({
    user_id: p.user_id,
    type,
    title,
    message,
    related_id: relatedId || null,
  }));

  await supabase.from('notifications').insert(notifications);
}

/**
 * Send a notification to ALL team members (excluding the sender)
 */
export async function notifyAllUsers(senderProfileId: string, title: string, message: string, type: string = 'general', relatedId?: string) {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id')
    .neq('id', senderProfileId);

  if (!profiles || profiles.length === 0) return;

  const notifications = profiles.map(p => ({
    user_id: p.user_id,
    type,
    title,
    message,
    related_id: relatedId || null,
  }));

  await supabase.from('notifications').insert(notifications);
}
