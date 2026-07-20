'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// A proteção de acesso real acontece em app/(dashboard)/layout.tsx (servidor)
// e nas políticas RLS + funções SECURITY DEFINER do banco.
// Se esta página está renderizando, o usuário já foi validado como admin.
export default function AdminDashboard() {
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = async () => {
    setLoadError(null);

    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: gensData, error: gensError } = await supabase
      .from('generations')
      .select(`
        *,
        assets (*)
      `)
      .order('created_at', { ascending: false })
      .limit(30);

    if (usersError) console.error('[admin] erro ao buscar users:', usersError);
    if (gensError) console.error('[admin] erro ao buscar generations:', gensError);

    if (usersError || gensError) {
      setLoadError(
        [usersError?.message, gensError?.message].filter(Boolean).join(' | ')
      );
    }

    setUsers(usersData || []);
    setGenerations(gensData || []);
    setLoading(false);
  };

  const updateCredits = async (userId: string, newBalance: number) => {
    const { error } = await supabase.rpc('admin_set_credits', {
      p_user_id: userId,
      p_new_balance: newBalance,
    });
    if (error) {
      alert(`Erro ao atualizar créditos: ${error.message}`);
      return;
    }
    loadData();
  };

  const toggleFeatured = async (id: string, _current: boolean) => {
    const { error } = await supabase.rpc('admin_toggle_featured', {
      p_generation_id: id,
    });
    if (error) {
      alert(`Erro ao destacar geração: ${error.message}`);
      return;
    }
    loadData();
  };

  if (loading) return <div className="p-8">Carregando painel...</div>;

  return (
    <div className="p-8 space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Painel Administrativo Genora</h1>
        <Button onClick={loadData}>Atualizar Tudo</Button>
      </div>

      {loadError && (
        <div className="p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 text-sm">
          Erro ao carregar dados: {loadError}
        </div>
      )}

      {/* Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between border p-5 rounded-xl">
                <div className="flex-1">
                  <p className="font-semibold">{user.full_name || user.email}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant={user.plan === 'pro' ? 'default' : 'secondary'}>
                      {user.plan}
                    </Badge>
                    <Badge variant={user.role === 'admin' ? 'destructive' : 'outline'}>
                      {user.role || 'user'}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Créditos</p>
                    <Input 
                      type="number"
                      defaultValue={user.credits_balance}
                      className="w-28"
                      onBlur={(e) => updateCredits(user.id, Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Destaques */}
      <Card>
        <CardHeader>
          <CardTitle>Gerações para Destaque (Explorer / Home)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {generations.map((gen) => (
              <div key={gen.id} className="border rounded-xl overflow-hidden group">
                {gen.assets?.[0]?.cdn_url && (
                  <img 
                    src={gen.assets[0].cdn_url} 
                    alt={gen.prompt}
                    className="w-full h-56 object-cover"
                  />
                )}
                <div className="p-4">
                  <p className="text-sm line-clamp-2 mb-4">{gen.prompt}</p>
                  <Button 
                    size="sm"
                    variant={gen.is_featured ? "default" : "outline"}
                    onClick={() => toggleFeatured(gen.id, gen.is_featured || false)}
                    className="w-full"
                  >
                    {gen.is_featured ? "✓ Destacado" : "Destacar na Home"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}