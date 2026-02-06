'use server'

import { createClient } from '@/lib/supabase/server'
import { canEditTasks } from '@/lib/permissions'

const APP_SCHEMA = 'app'

/** Add a reaction to a comment. */
export async function addReactionAction(
  companyId: string,
  commentId: string,
  emoji: string
) {
  if (!(await canEditTasks(companyId))) return { error: 'No permission.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('task_comment_reactions')
    .insert({
      comment_id: commentId,
      user_id: profile?.id ?? user.id,
      emoji: emoji.trim(),
    })
  
  if (error) {
    if (error.code === '23505') return { error: null } // Already reacted
    return { error: error.message }
  }
  return { error: null }
}

/** Remove a reaction from a comment. */
export async function removeReactionAction(
  companyId: string,
  commentId: string,
  emoji: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('task_comment_reactions')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', profile?.id ?? user.id)
    .eq('emoji', emoji.trim())
  
  return error ? { error: error.message } : { error: null }
}

/** Get reactions for comments. */
export async function getCommentReactionsAction(commentIds: string[]) {
  const supabase = await createClient()
  if (commentIds.length === 0) return { error: null, reactions: [] }
  
  const { data: reactions, error } = await supabase
    .schema(APP_SCHEMA)
    .from('task_comment_reactions')
    .select('comment_id, emoji, user_id')
    .in('comment_id', commentIds)
  
  if (error) return { error: error.message, reactions: [] }
  
  // Get user info for reactions
  const userIds = [...new Set((reactions ?? []).map((r) => r.user_id))]
  const { data: profiles } = userIds.length
    ? await supabase.schema(APP_SCHEMA).from('profiles').select('id, display_name, email').in('id', userIds)
    : { data: [] }
  
  const profileMap: Record<string, { display_name: string | null; email: string }> = {}
  for (const p of profiles ?? []) {
    profileMap[p.id] = { display_name: p.display_name, email: p.email }
  }
  
  const reactionsWithUsers = (reactions ?? []).map((r) => ({
    ...r,
    user_name: profileMap[r.user_id]?.display_name || profileMap[r.user_id]?.email || 'Unknown',
  }))
  
  return { error: null, reactions: reactionsWithUsers }
}
