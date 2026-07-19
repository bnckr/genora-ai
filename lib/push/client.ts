import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push não suportado neste navegador");
  }

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return reg;
}

export async function subscribeToPush() {
  const reg = await registerServiceWorker();
  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Permissão de notificação negada");
  }

  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    await saveSubscription(existing);
    return existing;
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    ),
  });

  await saveSubscription(sub);
  return sub;
}

export async function unsubscribeFromPush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();

  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe();

    const supabase = createClient();
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);
  }
}

export async function getPushSubscription() {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg?.pushManager.getSubscription() ?? null;
}

async function saveSubscription(sub: PushSubscription) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado");

  const json = sub.toJSON();

  await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh!,
      auth: json.keys!.auth!,
      user_agent: navigator.userAgent,
    },
    { onConflict: "user_id,endpoint" }
  );
}