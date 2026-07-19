import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { title, body, url, userId } = await req.json();
    const targetUserId = userId || user.id;

    // Só permite enviar para si mesmo por enquanto (seguro)
    if (targetUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", targetUserId);

    if (!subs?.length) {
      return NextResponse.json({ sent: 0, message: "Sem subscriptions" });
    }

    const payload = JSON.stringify({
      title: title || "Genora",
      body: body || "Nova notificação",
      url: url || "/home",
    });

    const results = await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload
        )
      )
    );

    // Remove subscriptions inválidas
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (
        r.status === "rejected" &&
        (r.reason?.statusCode === 404 || r.reason?.statusCode === 410)
      ) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subs[i].endpoint);
      }
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json({ sent });
  } catch (err) {
    console.error("[push/send]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}