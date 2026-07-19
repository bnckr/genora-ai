'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Carrega usuários
    const { data: usersData } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    // Carrega gerações recentes
    const { data: gensData } = await supabase
      .from('generations')
      .select('*, assets(*)')
      .order('created_at', { ascending: false })
      .limit(50);

    setUsers(usersData || []);
    setGenerations(gensData || []);
    setLoading(false);
  };

  const updateUserCredits = async (userId: string, newBalance: number) => {
    await supabase
      .from('users')
      .update({ credits_balance: newBalance })
      .eq('id', userId);
    loadData();
  };

  const toggleFeatureGeneration = async (generationId: string, isFeatured: boolean) => {
    await supabase
      .from('generations')
      .update({ is_featured: isFeatured }) // adicione essa coluna se não tiver
      .eq('id', generationId);
    loadData();
  };

  if (loading) return <div>Carregando Admin...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Painel Admin - Genora</h1>

      {/* Seção Usuários */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Usuários ({users.length})</h2>
        <div className="grid gap-4">
          {users.map(user => (
            <div key={user.id} className="border rounded-xl p-6 flex justify-between items-center">
              <div>
                <p className="font-medium">{user.full_name || user.email}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
                <Badge variant={user.plan === 'pro' ? 'default' : 'secondary'}>
                  {user.plan}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-gray-500">Créditos</p>
                  <Input 
                    type="number" 
                    defaultValue={user.credits_balance}
                    onBlur={(e) => updateUserCredits(user.id, parseInt(e.target.value))}
                    className="w-24"
                  />
                </div>
                <Button variant="outline" size="sm">
                  Ver Gerações
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seção Gerações para Destaque */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Gerações Recentes - Destaque na Home</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {generations.map(gen => (
            <div key={gen.id} className="border rounded-xl overflow-hidden">
              {gen.assets?.[0]?.cdn_url && (
                <img 
                  src={gen.assets[0].cdn_url} 
                  alt={gen.prompt}
                  className="w-full h-64 object-cover"
                />
              )}
              <div className="p-4">
                <p className="line-clamp-2 text-sm mb-3">{gen.prompt}</p>
                <Button 
                  size="sm"
                  variant={gen.is_featured ? "default" : "outline"}
                  onClick={() => toggleFeatureGeneration(gen.id, !gen.is_featured)}
                >
                  {gen.is_featured ? "Remover Destaque" : "Destacar na Home"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}