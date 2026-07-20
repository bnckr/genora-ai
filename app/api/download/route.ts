import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url || !supabaseUrl || !url.startsWith(`${supabaseUrl}/storage/`)) {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Genora-App/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const blob = await response.blob();
    const headers = new Headers();

    // Copia headers importantes
    headers.set(
      "Content-Type",
      response.headers.get("Content-Type") || "image/png",
    );
    headers.set(
      "Content-Disposition",
      `attachment; filename="genora-image-${Date.now()}.png"`,
    );

    return new NextResponse(blob, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Download proxy error:", error);
    return NextResponse.json(
      { error: "Falha ao baixar imagem" },
      { status: 500 },
    );
  }
}