'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || user.email !== 'bnckr@outlook.com') {
      alert("Acesso negado. Apenas o administrador pode acessar esta página.");
      router.push('/dashboard');
      return;
    }

    setIsAdmin(true);
    loadData();
  };

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

  const updateCredits = async (userId: string, newBalance: number) => {
    await supabase.from('users').update({ credits_balance: newBalance }).eq('id', userId);
    loadData();
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    await supabase.from('generations').update({ is_featured: !current }).eq('id', id);
    loadData();
  };

  if (!isAdmin || loading) return <div className="p-8">Verificando acesso...</div>;

  return (
    <div className="p-8 space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Painel Administrativo Genora</h1>
        <Button onClick={loadData}>Atualizar Tudo</Button>
      </div>

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