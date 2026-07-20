import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateForUser } from "@/lib/generation-service";
import { sendWhatsAppText, sendWhatsAppImage } from "@/lib/whatsapp/send";

export const maxDuration = 60;

// --- Verificação inicial do webhook (a Meta chama isso 1x ao configurar) ---
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// --- Recebimento de mensagens ---
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Valida a assinatura (garante que a requisição veio mesmo da Meta)
  if (process.env.WHATSAPP_APP_SECRET) {
    const signature = req.headers.get("x-hub-signature-256");
    const expected =
      "sha256=" +
      crypto
        .createHmac("sha256", process.env.WHATSAPP_APP_SECRET)
        .update(rawBody)
        .digest("hex");

    if (!signature || signature !== expected) {
      console.error("[whatsapp] assinatura inválida no webhook");
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  try {
    const messages =
      body?.entry?.[0]?.changes?.[0]?.value?.messages ?? [];

    for (const message of messages) {
      await handleIncomingMessage(message);
    }
  } catch (err) {
    console.error("[whatsapp] erro ao processar webhook:", err);
  }

  // A Meta espera 200 rápido; sempre respondemos OK pra não gerar retries
  // desnecessários mesmo quando algo deu errado no processamento interno.
  return NextResponse.json({ received: true });
}

async function handleIncomingMessage(message: any) {
  const from: string = message.from; // ex: "5511999999999"

  if (message.type !== "text") {
    await sendWhatsAppText(
      from,
      "Por enquanto só entendo texto por aqui 🙂 Me manda uma descrição da imagem que você quer criar."
    );
    return;
  }

  const prompt: string = message.text?.body?.trim();
  if (!prompt) return;

  const supabase = createAdminClient();

  // Busca o usuário vinculado a esse número
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, credits_balance")
    .eq("whatsapp_number", from)
    .single();

  if (userError || !user) {
    await sendWhatsAppText(
      from,
      "Não encontrei uma conta Genora vinculada a esse número.\n\n" +
        "Acesse genora-ai-six.vercel.app/settings, faça login e cadastre esse número (com DDI, ex: +55 11 99999-9999) na seção de WhatsApp pra começar a gerar imagens por aqui."
    );
    return;
  }

  await sendWhatsAppText(from, "Gerando sua imagem... 🎨 (leva alguns segundos)");

  const result = await generateForUser(supabase, {
    userId: user.id,
    prompt,
    model: "nano-banana",
    aspectRatio: "1:1",
    source: "whatsapp",
    skipPushNotification: true,
  });

  if (!result.ok) {
    if (result.error === "insufficient_credits") {
      await sendWhatsAppText(
        from,
        "Você não tem créditos suficientes 😕 Acesse genora-ai-six.vercel.app/pricing pra recarregar."
      );
    } else {
      await sendWhatsAppText(
        from,
        "Não consegui gerar a imagem agora. Tenta de novo em instantes 🙏"
      );
    }
    return;
  }

  const asset = result.assets?.[0];
  if (!asset?.cdn_url) {
    await sendWhatsAppText(from, "A imagem foi gerada, mas não consegui te enviar. Confira no app.");
    return;
  }

  await sendWhatsAppImage(
    from,
    asset.cdn_url,
    `✨ ${prompt}\n\nSaldo: ${result.credits_balance} créditos`
  );
}