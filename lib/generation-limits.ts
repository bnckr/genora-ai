import { supabase } from './supabase';

const DAILY_LIMITS = {
  free: 3,
  pro: 100,
  enterprise: 500,
} as const;

export async function checkGenerationLimit(userId: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select('plan, credits_balance')
    .eq('id', userId)
    .single();

  if (error || !user) throw new Error('Usuário não encontrado');

  const today = new Date().toISOString().split('T')[0];

  const { count } = await supabase
    .from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00Z`);

  const dailyLimit = DAILY_LIMITS[user.plan as keyof typeof DAILY_LIMITS] || 3;

  if ((count || 0) >= dailyLimit) {
    throw new Error(`Limite diário atingido (${dailyLimit} imagens/dia no plano ${user.plan}).`);
  }

  if (user.credits_balance < 1) {
    throw new Error('Créditos insuficientes. Atualize seu plano.');
  }

  return { user, dailyLimit };
}

export async function recordGeneration(userId: string, creditsUsed: number = 1) {
  // 1. Registra a geração
  await supabase
    .from('generations')
    .insert([{
      user_id: userId,
      feature: 'image_generation',
      prompt: '', // você pode passar o prompt real da requisição
      model: 'nano-banana',
      provider: 'gemini',
      status: 'completed',
      credits_used: creditsUsed,
    }]);

  // 2. Desconta créditos (forma correta)
  const { error } = await supabase.rpc('decrement_credits', {
    p_user_id: userId,
    p_amount: creditsUsed
  });

  if (error) {
    console.error('Erro ao descontar créditos:', error);
  }
}