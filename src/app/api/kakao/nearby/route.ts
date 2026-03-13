import { NextRequest, NextResponse } from "next/server";

const REST_API_KEY = process.env.KAKAO_REST_API_KEY;

export async function GET(request: NextRequest) {
  if (!REST_API_KEY) {
    return NextResponse.json(
      { error: "KAKAO_REST_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const query = searchParams.get("query") || "맛집";
  const radius = searchParams.get("radius") || "1000";
  const size = searchParams.get("size") || "15";

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    query,
    category_group_code: "FD6", // 음식점
    x: lng,
    y: lat,
    radius,
    sort: "distance",
    size,
  });

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
      {
        headers: {
          Authorization: `KakaoAK ${REST_API_KEY}`,
        },
        next: { revalidate: 60 }, // 1분 캐시
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Kakao API error:", res.status, text);
      return NextResponse.json(
        { error: "Kakao API request failed", status: res.status },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Kakao API fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch from Kakao API" },
      { status: 500 }
    );
  }
}
