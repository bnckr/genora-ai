import type { SupabaseClient } from "@supabase/supabase-js";
import { generateImage } from "@/lib/ai/image";

const STORAGE_BUCKET = "generations";

export interface GenerateForUserInput {
  userId: string;
  prompt: string;
  model?: "nano-banana" | "nano-banana-pro";
  aspectRatio?: "1:1" | "4:3" | "2:3" | "16:9" | "9:16";
  projectId?: string | null;
  referenceImage?: { base64: string; mimeType: string } | null;
  /** De onde veio a geração: "web" (Studio) ou "whatsapp". Só vira metadata. */
  source?: "web" | "whatsapp";
  /** Se true, não dispara push notification (ex: já é o WhatsApp respondendo) */
  skipPushNotification?: boolean;
}

export interface GenerateForUserResult {
  ok: boolean;
  status: number;
  error?: string;
  detail?: string;
  assets?: { id: string; cdn_url: string; is_public?: boolean }[];
  credits_balance?: number;
}

async function refundCredits(
  supabase: SupabaseClient,
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

/**
 * Executa o fluxo completo de geração de imagem para um usuário já identificado:
 * valida créditos, cria o registro da geração, debita, chama o Gemini, sobe pro
 * Storage, salva os assets e estorna automaticamente se algo falhar no meio do
 * caminho. Usado tanto pela rota HTTP do Studio quanto pelo webhook do WhatsApp.
 */
export async function generateForUser(
  supabase: SupabaseClient,
  input: GenerateForUserInput
): Promise<GenerateForUserResult> {
  const {
    userId,
    prompt,
    model = "nano-banana",
    aspectRatio = "1:1",
    projectId = null,
    referenceImage = null,
    source = "web",
    skipPushNotification = false,
  } = input;

  let creditsDebited = false;
  let debitedAmount = 0;
  let balanceAfterDebit = 0;
  let debitedGenerationId: string | null = null;

  try {
    if (!prompt?.trim()) {
      return { ok: false, status: 400, error: "prompt is required" };
    }

    if (referenceImage) {
      if (!referenceImage.base64 || !referenceImage.mimeType) {
        return { ok: false, status: 400, error: "referenceImage inválida" };
      }
      const approxBytes = (referenceImage.base64.length * 3) / 4;
      if (approxBytes > 10 * 1024 * 1024) {
        return {
          ok: false,
          status: 400,
          error: "Imagem de referência muito grande (máx. ~10MB)",
        };
      }
    }

    // Custo em créditos (edição com imagem de referência custa 1 crédito a mais)
    const creditCost =
      model === "nano-banana-pro"
        ? referenceImage
          ? 4
          : 3
        : referenceImage
        ? 2
        : 1;

    // Busca saldo + preferências
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("credits_balance, notification_preferences")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return { ok: false, status: 404, error: "Perfil não encontrado" };
    }

    if (profile.credits_balance < creditCost) {
      return { ok: false, status: 402, error: "insufficient_credits" };
    }

    // Valida projeto (se informado)
    if (projectId) {
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", userId)
        .single();

      if (!project) {
        return { ok: false, status: 400, error: "Projeto inválido" };
      }
    }

    // Cria registro da geração
    const { data: generation, error: genError } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        project_id: projectId || null,
        feature: "image",
        prompt: prompt.trim(),
        model,
        provider: "gemini",
        status: "processing",
        credits_used: creditCost,
        metadata: {
          aspectRatio,
          hasReferenceImage: !!referenceImage,
          source,
        },
      })
      .select()
      .single();

    if (genError || !generation) {
      console.error("Erro ao criar generation:", genError);
      return { ok: false, status: 500, error: "Falha ao criar geração" };
    }

    // Debita créditos
    const newBalance = profile.credits_balance - creditCost;

    const { error: debitError } = await supabase
      .from("users")
      .update({ credits_balance: newBalance })
      .eq("id", userId);

    if (debitError) {
      console.error("Erro ao debitar créditos:", debitError);
      await supabase.from("generations").delete().eq("id", generation.id);
      return {
        ok: false,
        status: 500,
        error: "Falha ao debitar créditos",
        detail: debitError.message,
      };
    }

    creditsDebited = true;
    debitedAmount = creditCost;
    balanceAfterDebit = newBalance;
    debitedGenerationId = generation.id;

    // Registra transação
    await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount: -creditCost,
      type: "usage",
      reason: "image_generation",
      generation_id: generation.id,
      balance_after: newBalance,
    });

    // Gera imagem com Gemini (Nano Banana)
    const result = await generateImage({
      prompt: prompt.trim(),
      model,
      aspectRatio,
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
        userId,
        creditCost,
        newBalance,
        generation.id,
        "generation_failed"
      );

      return {
        ok: false,
        status: 500,
        error: "Generation failed",
        detail: result.error,
        credits_balance: refundedBalance,
      };
    }

    // Sobe as imagens (base64) pro Supabase Storage e monta as URLs públicas
    const uploadedUrls: string[] = [];

    for (let i = 0; i < result.images.length; i++) {
      const img = result.images[i];
      const ext = img.mimeType.split("/")[1] || "png";
      const path = `${userId}/${generation.id}/${i}.${ext}`;
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
        userId,
        creditCost,
        newBalance,
        generation.id,
        "storage_upload_failed"
      );

      return {
        ok: false,
        status: 500,
        error: "Falha ao salvar imagens geradas",
        credits_balance: refundedBalance,
      };
    }

    // Salva assets
    const assetsToInsert = uploadedUrls.map((url) => ({
      generation_id: generation.id,
      user_id: userId,
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

    // Marca generation como completed
    await supabase
      .from("generations")
      .update({
        status: "completed",
        job_id: result.jobId,
      })
      .eq("id", generation.id);

    // Atualiza thumbnail do projeto
    if (projectId && uploadedUrls[0]) {
      await supabase
        .from("projects")
        .update({
          thumbnail_url: uploadedUrls[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .eq("user_id", userId);
    }

    // Push notification (não bloqueia a resposta)
    if (!skipPushNotification) {
      try {
        const wantsNotify =
          profile.notification_preferences?.generation_complete !== false;

        if (wantsNotify) {
          const { data: subs } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", userId);

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
              subs.map((s: any) =>
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
    }

    return {
      ok: true,
      status: 200,
      assets: assets || [],
      credits_balance: newBalance,
    };
  } catch (err) {
    console.error("[generation-service] erro inesperado:", err);

    if (creditsDebited && debitedGenerationId) {
      try {
        await refundCredits(
          supabase,
          userId,
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
        console.error(
          "Erro ao estornar créditos após falha inesperada:",
          refundErr
        );
      }
    }

    return {
      ok: false,
      status: 500,
      error: "Internal server error",
      detail: String(err),
    };
  }
}