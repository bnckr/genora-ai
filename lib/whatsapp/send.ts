const GRAPH_API_VERSION = "v21.0";

function getGraphUrl() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID não configurado");
  }
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
}

async function callGraphApi(payload: Record<string, unknown>) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN não configurado");
  }

  const res = await fetch(getGraphUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      ...payload,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("[whatsapp] erro ao enviar mensagem:", res.status, errorBody);
  }

  return res;
}

/** Envia uma mensagem de texto simples. `to` é o número no formato da Meta (ex: "5511999999999"). */
export async function sendWhatsAppText(to: string, body: string) {
  return callGraphApi({
    to,
    type: "text",
    text: { body },
  });
}

/** Envia uma imagem a partir de uma URL pública (o bucket do Supabase Storage já é público). */
export async function sendWhatsAppImage(
  to: string,
  imageUrl: string,
  caption?: string
) {
  return callGraphApi({
    to,
    type: "image",
    image: { link: imageUrl, caption },
  });
}