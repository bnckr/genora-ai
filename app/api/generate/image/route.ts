import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateImage } from "@/lib/ai/image";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Body
    const body = await req.json();
    const {
      prompt,
      model = "nano-banana",
      aspectRatio = "1:1",
      projectId = null,
    } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // 3. Custo em créditos
    const creditCost = model === "nano-banana-pro" ? 3 : 1;

    // 4. Busca saldo + preferências
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("credits_balance, notification_preferences")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
    }

    if (profile.credits_balance < creditCost) {
      return NextResponse.json({ error: "insufficient_credits" }, { status: 402 });
    }

    // 5. Valida projeto (se informado)
    if (projectId) {
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();

      if (!project) {
        return NextResponse.json({ error: "Projeto inválido" }, { status: 400 });
      }
    }

    // 6. Cria registro da geração
    const { data: generation, error: genError } = await supabase
      .from("generations")
      .insert({
        user_id: user.id,
        project_id: projectId || null,
        feature: "image",
        prompt: prompt.trim(),
        model,
        provider: "gemini",
        status: "processing",
        credits_used: creditCost,
        metadata: { aspectRatio },
      })
      .select()
      .single();

    if (genError || !generation) {
      console.error("Erro ao criar generation:", genError);
      return NextResponse.json({ error: "Falha ao criar geração" }, { status: 500 });
    }

    // 7. Debita créditos
    const newBalance = profile.credits_balance - creditCost;

    const { error: debitError } = await supabase
      .from("users")
      .update({ credits_balance: newBalance })
      .eq("id", user.id);

    if (debitError) {
      await supabase.from("generations").delete().eq("id", generation.id);
      return NextResponse.json({ error: "Falha ao debitar créditos" }, { status: 500 });
    }

    // 8. Registra transação
    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      amount: -creditCost,
      type: "usage",
      reason: "image_generation",
      generation_id: generation.id,
      balance_after: newBalance,
    });

    // 9. Gera imagem com Gemini (Nano Banana)
    const result = await generateImage({
      prompt: prompt.trim(),
      model: model as "nano-banana" | "nano-banana-pro",
      aspectRatio: aspectRatio as any,
    });

    if (result.status === "failed" || !result.images?.length) {
      await supabase
        .from("generations")
        .update({
          status: "failed",
          error_msg: result.error || "Nenhuma imagem retornada",
        })
        .eq("id", generation.id);

      return NextResponse.json(
        { error: "Generation failed", detail: result.error },
        { status: 500 }
      );
    }

    // 10. Salva assets
    const assetsToInsert = result.outputUrls.map((url) => ({
      generation_id: generation.id,
      user_id: user.id,
      storage_path: url,
      cdn_url: url,
      type: "image",
      is_public: false,
    }));

    const { data: assets, error: assetsError } = await supabase
      .from("assets")
      .insert(assetsToInsert)
      .select();

    if (assetsError) {
      console.error("Erro ao salvar assets:", assetsError);
    }

    // 11. Marca generation como completed
    await supabase
      .from("generations")
      .update({
        status: "completed",
        job_id: result.jobId,
      })
      .eq("id", generation.id);

    // 12. Atualiza thumbnail do projeto
    if (projectId && uploadedUrls[0]) {
      await supabase
        .from("projects")
        .update({
          thumbnail_url: uploadedUrls[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .eq("user_id", user.id);
    }

    // 13. Push notification (não bloqueia a resposta)
    try {
      const wantsNotify =
        profile.notification_preferences?.generation_complete !== false;

      if (wantsNotify) {
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", user.id);

        if (subs?.length) {
          const webpush = (await import("web-push")).default;

          webpush.setVapidDetails(
            process.env.VAPID_SUBJECT!,
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
            process.env.VAPID_PRIVATE_KEY!
          );

          const payload = JSON.stringify({
            title: "Imagem pronta ✨",
            body: "Sua geração no Genora foi concluída",
            url: "/studio",
          });

          await Promise.allSettled(
            subs.map((s) =>
              webpush.sendNotification(
                {
                  endpoint: s.endpoint,
                  keys: {
                    p256dh: s.p256dh,
                    auth: s.auth,
                  },
                },
                payload
              )
            )
          );
        }
      }
    } catch (pushErr) {
      console.error("[push] falha ao notificar:", pushErr);
    }

    return NextResponse.json({
      generation: { ...generation, status: "completed" },
      assets: assets || [],
      credits_balance: newBalance,
    });
  } catch (err) {
    console.error("[API] generate/image error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: String(err) },
      { status: 500 }
    );
  }
}