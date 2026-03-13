import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const series = request.nextUrl.searchParams.get("series");
  if (!series) {
    return NextResponse.json({ error: "Missing series" }, { status: 400 });
  }

  try {
    const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(series)}`;
    const res = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Upstream error" },
        { status: res.status }
      );
    }

    const text = await res.text();
    return new NextResponse(text, {
      headers: { "Content-Type": "text/csv" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch FRED data" },
      { status: 500 }
    );
  }
}
