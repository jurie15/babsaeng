import { NextRequest, NextResponse } from "next/server";

const REST_API_KEY = process.env.KAKAO_REST_API_KEY;

export async function GET(request: NextRequest) {
  if (!REST_API_KEY) {
    return NextResponse.json({ error: "KAKAO_REST_API_KEY not configured" }, { status: 500 });
  }
  const query = request.nextUrl.searchParams.get("query");
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`,
      { headers: { Authorization: `KakaoAK ${REST_API_KEY}` } }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Geocode error:", err);
    return NextResponse.json({ error: "Geocode failed" }, { status: 500 });
  }
}
