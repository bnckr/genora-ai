import { createClient } from './server'
import type { User, Plan, Project, Generation, Asset } from '@/types'

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

export async function getUserWithPlan(userId: string) {
  const supabase = await createClient()
  return supabase
    .from('users')
    .select('*, plans(*)')
    .eq('id', userId)
    .single()
}

export async function getProjects(userId: string): Promise<Project[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })

  return data ?? []
}

export async function getGenerations(userId: string, limit = 20): Promise<Generation[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data ?? []
}

export async function getPlans(): Promise<Plan[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  return data ?? []
}
