'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const { data: usersData } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: gensData } = await supabase
      .from('generations')
      .select(`
        *,
        assets (*)
      `)
      .order('created_at', { ascending: false })
      .limit(30);

    setUsers(usersData || []);
    setGenerations(gensData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateCredits = async (userId: string, newBalance: number) => {
    await supabase.from('users').update({ credits_balance: newBalance }).eq('id', userId);
    loadData();
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    await supabase.from('generations').update({ is_featured: !current }).eq('id', id);
    loadData();
  };

  if (loading) return <div className="p-8">Carregando painel admin...</div>;

  return (
    <div className="p-8 space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Admin Genora</h1>
        <Button onClick={loadData}>Atualizar Dados</Button>
      </div>

      {/* Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between border p-4 rounded-lg">
                <div>
                  <p className="font-medium">{user.full_name || user.email}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <Badge variant={user.plan === 'pro' ? 'default' : 'secondary'}>
                    {user.plan}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Input 
                    type="number"
                    defaultValue={user.credits_balance}
                    className="w-28"
                    onBlur={(e) => updateCredits(user.id, Number(e.target.value))}
                  />
                  <Button variant="outline" size="sm">Ver Histórico</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Destaques para Homepage */}
      <Card>
        <CardHeader>
          <CardTitle>Gerações para Destaque na Home/Explorer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {generations.map((gen) => (
              <div key={gen.id} className="border rounded-xl overflow-hidden">
                {gen.assets?.[0] && (
                  <img 
                    src={gen.assets[0].cdn_url} 
                    alt="" 
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-3">
                  <p className="text-xs line-clamp-2 mb-3">{gen.prompt}</p>
                  <Button 
                    size="sm" 
                    variant={gen.is_featured ? "default" : "outline"}
                    onClick={() => toggleFeatured(gen.id, gen.is_featured)}
                    className="w-full"
                  >
                    {gen.is_featured ? "Remover Destaque" : "Destacar"}
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