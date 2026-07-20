import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateImage } from "@/lib/ai/image";

export const maxDuration = 60;

const STORAGE_BUCKET = "generations";

async function refundCredits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  amount: number,
  balanceBeforeRefund: number,
  generationId: string,
  reason: string
) {
  const balanceAfterRefund = balanceBeforeRefund + amount;

  const { error: refundError } = await supabase
    .from("users")
    .update({ credits_balance: balanceAfterRefund })
    .eq("id", userId);

  if (refundError) {
    console.error("Erro ao estornar créditos:", refundError);
    return balanceBeforeRefund;
  }

  await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount: amount,
    type: "refund",
    reason,
    generation_id: generationId,
    balance_after: balanceAfterRefund,
  });

  return balanceAfterRefund;
}

export async function POST(req: NextRequest) {
  let creditsDebited = false;
  let debitedAmount = 0;
  let balanceAfterDebit = 0;
  let debitedUserId: string | null = null;
  let debitedGenerationId: string | null = null;

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
      referenceImage = null, // { base64: string, mimeType: string } | null
    } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    if (referenceImage) {
      if (!referenceImage.base64 || !referenceImage.mimeType) {
        return NextResponse.json(
          { error: "referenceImage inválida" },
          { status: 400 }
        );
      }
      // ~10MB de base64 (o base64 infla o tamanho original em ~33%)
      const approxBytes = (referenceImage.base64.length * 3) / 4;
      if (approxBytes > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Imagem de referência muito grande (máx. ~10MB)" },
          { status: 400 }
        );
      }
    }

    // 3. Custo em créditos (edição com imagem de referência custa 1 crédito a mais)
    const creditCost =
      model === "nano-banana-pro"
        ? (referenceImage ? 4 : 3)
        : (referenceImage ? 2 : 1);

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
        metadata: { aspectRatio, hasReferenceImage: !!referenceImage },
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
      console.error("Erro ao debitar créditos:", debitError);
      await supabase.from("generations").delete().eq("id", generation.id);
      return NextResponse.json(
        { error: "Falha ao debitar créditos", detail: debitError.message },
        { status: 500 }
      );
    }

    creditsDebited = true;
    debitedAmount = creditCost;
    balanceAfterDebit = newBalance;
    debitedUserId = user.id;
    debitedGenerationId = generation.id;

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
      referenceImages: referenceImage
        ? [{ base64: referenceImage.base64, mimeType: referenceImage.mimeType }]
        : undefined,
    });

    if (result.status === "failed" || !result.images?.length) {
      await supabase
        .from("generations")
        .update({
          status: "failed",
          error_msg: result.error || "Nenhuma imagem retornada",
        })
        .eq("id", generation.id);

      const refundedBalance = await refundCredits(
        supabase,
        user.id,
        creditCost,
        newBalance,
        generation.id,
        "generation_failed"
      );

      return NextResponse.json(
        {
          error: "Generation failed",
          detail: result.error,
          credits_balance: refundedBalance,
        },
        { status: 500 }
      );
    }

    // 10. Sobe as imagens (base64) pro Supabase Storage e monta as URLs públicas
    const uploadedUrls: string[] = [];

    for (let i = 0; i < result.images.length; i++) {
      const img = result.images[i];
      const ext = img.mimeType.split("/")[1] || "png";
      const path = `${user.id}/${generation.id}/${i}.${ext}`;
      const buffer = Buffer.from(img.base64, "base64");

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, buffer, {
          contentType: img.mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error("Erro ao subir imagem no storage:", uploadError);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);

      uploadedUrls.push(publicUrlData.publicUrl);
    }

    if (uploadedUrls.length === 0) {
      await supabase
        .from("generations")
        .update({
          status: "failed",
          error_msg: "Falha ao salvar imagens no storage",
        })
        .eq("id", generation.id);

      const refundedBalance = await refundCredits(
        supabase,
        user.id,
        creditCost,
        newBalance,
        generation.id,
        "storage_upload_failed"
      );

      return NextResponse.json(
        {
          error: "Falha ao salvar imagens geradas",
          credits_balance: refundedBalance,
        },
        { status: 500 }
      );
    }

    // 11. Salva assets
    const assetsToInsert = uploadedUrls.map((url) => ({
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

    // 12. Marca generation como completed
    await supabase
      .from("generations")
      .update({
        status: "completed",
        job_id: result.jobId,
      })
      .eq("id", generation.id);

    // 13. Atualiza thumbnail do projeto
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

    // 14. Push notification (não bloqueia a resposta)
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

    if (creditsDebited && debitedUserId && debitedGenerationId) {
      try {
        const supabase = await createClient();
        await refundCredits(
          supabase,
          debitedUserId,
          debitedAmount,
          balanceAfterDebit,
          debitedGenerationId,
          "unexpected_error"
        );
        await supabase
          .from("generations")
          .update({ status: "failed", error_msg: String(err) })
          .eq("id", debitedGenerationId);
      } catch (refundErr) {
        console.error("Erro ao estornar créditos após falha inesperada:", refundErr);
      }
    }

    return NextResponse.json(
      { error: "Internal server error", detail: String(err) },
      { status: 500 }
    );
  }
}