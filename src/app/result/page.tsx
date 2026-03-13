"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFilterStore } from "@/lib/store";
import restaurantsData from "@/data/restaurants.json";
import {
  getCurrentPosition,
  searchNearbyRestaurants,
  normalizeKakaoPlace,
  NoResultsError,
  type NormalizedRestaurant,
} from "@/lib/kakao";

// ─── 카카오 SDK 전역 타입 ──────────────────────────────────────────────────────

declare global {
  interface Window {
    Kakao: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (params: object) => void;
      };
    };
  }
}

// ─── 타입 ────────────────────────────────────────────────────────────────────

type RecommendedMenu = {
  name: string;
  price: number;
  emoji: string;
  isSignature?: boolean;
};

type MockRestaurant = {
  id: number;
  name: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  reviewSummary: string;
  hasParking: boolean;
  category: string;
  recommendedMenus: RecommendedMenu[];
};

type Restaurant = (MockRestaurant | NormalizedRestaurant) & {
  distance?: string;
  placeUrl?: string;
};

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function formatReviewCount(count: number): string {
  if (count < 50) return "50+";
  if (count < 100) return "100+";
  if (count < 500) return "500+";
  if (count < 1000) return "1,000+";
  if (count < 5000) return "5,000+";
  return "5,000+";
}

function StarRating({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  return (
    <p className="text-sm font-semibold text-gray-700">
      ⭐ {rating.toFixed(1)}
      <span className="text-gray-400 font-normal">
        {" "}· 리뷰 {formatReviewCount(reviewCount)}
      </span>
    </p>
  );
}

// ─── 메뉴 사진 슬라이더 ──────────────────────────────────────────────────────

const EMOJI_KEYWORDS: Record<string, string> = {
  "🍲": "korean+stew+soup+bowl",
  "🥩": "grilled+meat+steak+korean+bbq",
  "🥘": "hot+pot+stew+casserole",
  "🥓": "pork+belly+korean+bbq",
  "🍖": "meat+ribs+roasted",
  "🍜": "noodles+ramen+soup+bowl",
  "🌶️": "spicy+noodles+red+broth",
  "🥟": "dumplings+gyoza+jiaozi",
  "🍣": "sushi+japanese+salmon+roll",
  "🐟": "sashimi+salmon+raw+fish",
  "🥢": "japanese+food+bowl+chopsticks",
  "🍵": "soup+clear+broth+bowl",
  "🍝": "pasta+spaghetti+carbonara+italian",
  "🥗": "fresh+salad+vegetables+greens",
  "🍢": "korean+skewer+street+food+rice+cake",
  "🌭": "sausage+street+food",
  "🍤": "tempura+fried+shrimp+crispy",
  "🍱": "bento+asian+lunch+box",
  "🍔": "burger+hamburger+grilled+patty",
  "🍗": "fried+chicken+crispy+golden",
  "🍟": "french+fries+potato+crispy",
  "🍛": "curry+rice+bowl+spice",
  "🥭": "mango+tropical+thai+dessert",
  "🍚": "rice+bowl+korean+steamed",
  "🥡": "chinese+noodles+takeout",
  "🫓": "korean+pancake+savory",
};

const CATEGORY_GRADIENT: Record<string, { from: string; to: string }> = {
  한식:       { from: "#FFF1E6", to: "#FFD6B0" },
  중식:       { from: "#FFF0F0", to: "#FFCECE" },
  일식:       { from: "#EFF6FF", to: "#BFDBFE" },
  양식:       { from: "#FFFBEB", to: "#FDE68A" },
  분식:       { from: "#FFF7ED", to: "#FED7AA" },
  패스트푸드: { from: "#FEFCE8", to: "#FEF08A" },
  아시안:     { from: "#F0FDF4", to: "#A7F3D0" },
  고기구이:   { from: "#FFF0E6", to: "#FFBF80" },
  안주:       { from: "#F5F3FF", to: "#DDD6FE" },
};

const CATEGORY_FALLBACK_KEYWORDS: Record<string, string> = {
  한식: "korean+food+rice+bowl",
  중식: "chinese+food+noodles+dim+sum",
  일식: "japanese+food+sushi+ramen",
  양식: "pasta+steak+western+food",
  분식: "tteokbokki+korean+street+food",
  패스트푸드: "burger+fried+chicken+fast+food",
  아시안: "thai+food+pho+asian+cuisine",
  고기구이: "korean+bbq+grilled+meat",
  안주: "korean+pub+food+fried+chicken",
};

function MenuPhotoSlider({ menus, category }: { menus: RecommendedMenu[]; category: string }) {
  const [current, setCurrent] = useState(0);
  const [failedSet, setFailedSet] = useState<Set<number>>(new Set());
  const touchStartX = useRef<number>(0);

  const grad = CATEGORY_GRADIENT[category] ?? { from: "#F3F4F6", to: "#E5E7EB" };

  function getImageUrl(menu: RecommendedMenu): string {
    const emojiKey = EMOJI_KEYWORDS[menu.emoji];
    if (emojiKey) return `https://source.unsplash.com/featured/400x300/?${emojiKey}`;
    const catKey = CATEGORY_FALLBACK_KEYWORDS[category] ?? "food+restaurant";
    return `https://source.unsplash.com/featured/400x300/?${catKey}`;
  }

  return (
    <div className="relative w-full overflow-hidden bg-gray-100" style={{ height: "220px" }}>
      <div
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const diff = touchStartX.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) < 40) return;
          if (diff > 0) setCurrent((c) => Math.min(c + 1, menus.length - 1));
          else setCurrent((c) => Math.max(c - 1, 0));
        }}
        className="w-full h-full"
      >
        {menus.map((menu, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-transform duration-300 ease-out"
            style={{ transform: `translateX(${(i - current) * 100}%)` }}
          >
            {failedSet.has(i) ? (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}
              >
                <span style={{ fontSize: "64px" }}>{menu.emoji}</span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getImageUrl(menu)}
                alt={menu.name}
                className="w-full h-full object-cover"
                onError={() => setFailedSet((prev) => new Set([...prev, i]))}
              />
            )}
            <div
              className="absolute bottom-0 left-0 right-0 px-4 py-3"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)" }}
            >
              <div className="flex items-center gap-1.5">
                {menu.isSignature && (
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: "#0064FF", color: "#fff" }}
                  >
                    대표
                  </span>
                )}
                <p className="text-white font-semibold text-sm drop-shadow">{menu.name}</p>
                <p className="text-white/70 text-xs ml-auto drop-shadow">
                  {menu.price.toLocaleString()}원
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
        {menus.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              height: "6px",
              width: i === current ? "18px" : "6px",
              backgroundColor: i === current ? "#fff" : "rgba(255,255,255,0.5)",
            }}
          />
        ))}
      </div>
    </div>
  );
}


// ─── mock 데이터 헬퍼 ────────────────────────────────────────────────────────

const allMockRestaurants: MockRestaurant[] = Object.values(
  restaurantsData as Record<string, MockRestaurant[]>
).flat();

function pickMockRestaurant(budget: number, foodTypes: string[], hasParking: boolean): MockRestaurant {
  let pool = allMockRestaurants;
  const activeFoodTypes = foodTypes.filter((f) => f !== "상관없음");
  if (activeFoodTypes.length > 0) {
    const filtered = pool.filter((r) => activeFoodTypes.includes(r.category));
    if (filtered.length > 0) pool = filtered;
  }
  if (budget > 0) {
    const filtered = pool.filter((r) => r.recommendedMenus.some((m) => m.price <= budget));
    if (filtered.length > 0) pool = filtered;
  }
  if (hasParking) {
    const filtered = pool.filter((r) => r.hasParking);
    if (filtered.length > 0) pool = filtered;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── SwipeCard (이미지 + 식당명 + 거리만 표시) ───────────────────────────────

interface SwipeCardHandle {
  triggerPass: () => void;
  triggerLike: () => void;
}

const SwipeCard = forwardRef<SwipeCardHandle, {
  restaurant: Restaurant;
  onPass: () => void;
  onLike: () => void;
  stackOffset: number;
}>(({ restaurant, onPass, onLike, stackOffset }, ref) => {
  const isTop = stackOffset === 0;
  const [delta, setDelta] = useState(0);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isDraggingRef = useRef(false);

  function handleExit(dir: "left" | "right") {
    setExiting(dir);
    setTimeout(() => (dir === "left" ? onPass() : onLike()), 320);
  }

  useImperativeHandle(ref, () => ({
    triggerPass: () => handleExit("left"),
    triggerLike: () => handleExit("right"),
  }));

  useEffect(() => {
    if (!isTop) return;
    const el = cardRef.current;
    if (!el) return;
    function onTouchMove(e: TouchEvent) {
      if (!isDraggingRef.current) return;
      const dx = e.touches[0].clientX - touchStartXRef.current;
      const dy = e.touches[0].clientY - touchStartYRef.current;
      if (Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault();
        setDelta(dx);
      }
    }
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [isTop]);

  const showLikeStamp = isTop && delta > 50;
  const showPassStamp = isTop && delta < -50;
  const translateX = exiting === "left" ? -600 : exiting === "right" ? 600 : isTop ? delta : 0;
  const translateY = stackOffset * 8;
  const rotate = isTop ? delta * 0.04 : 0;
  const scale = 1 - stackOffset * 0.035;
  const animated = !!exiting || (!isDraggingRef.current && delta === 0);

  return (
    <div
      ref={cardRef}
      onTouchStart={(e) => {
        if (!isTop || exiting) return;
        touchStartXRef.current = e.touches[0].clientX;
        touchStartYRef.current = e.touches[0].clientY;
        isDraggingRef.current = true;
      }}
      onTouchEnd={() => {
        if (!isTop) return;
        isDraggingRef.current = false;
        if (delta > 100) handleExit("right");
        else if (delta < -100) handleExit("left");
        else setDelta(0);
      }}
      className="absolute inset-x-0"
      style={{
        transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`,
        transition: animated ? "transform 0.32s ease" : "none",
        zIndex: 10 - stackOffset,
      }}
    >
      <div className="bg-white rounded-3xl shadow-md overflow-hidden relative select-none">
        {/* 스탬프 */}
        {showLikeStamp && (
          <div
            className="absolute top-5 left-4 z-20 px-3 py-1 rounded-xl border-4"
            style={{ borderColor: "#22c55e", transform: "rotate(-18deg)" }}
          >
            <span className="text-2xl font-black" style={{ color: "#16a34a" }}>먹고싶다!</span>
          </div>
        )}
        {showPassStamp && (
          <div
            className="absolute top-5 right-4 z-20 px-3 py-1 rounded-xl border-4"
            style={{ borderColor: "#ef4444", transform: "rotate(18deg)" }}
          >
            <span className="text-2xl font-black" style={{ color: "#dc2626" }}>PASS</span>
          </div>
        )}

        <MenuPhotoSlider menus={restaurant.recommendedMenus} category={restaurant.category} />

        {/* 카테고리 + 거리 */}
        <div className="px-5 py-2.5 flex items-center gap-2" style={{ backgroundColor: "#E8F1FF" }}>
          <span className="text-xs font-semibold" style={{ color: "#0064FF" }}>
            {restaurant.category}
          </span>
          {"distance" in restaurant && restaurant.distance && (
            <span className="ml-auto text-xs text-blue-500 font-semibold">
              📏 {restaurant.distance}
            </span>
          )}
        </div>

        {/* 식당명 */}
        <div className="px-5 py-3">
          <h2 className="text-xl font-bold text-gray-900 leading-snug">{restaurant.name}</h2>
        </div>
      </div>
    </div>
  );
});
SwipeCard.displayName = "SwipeCard";

// ─── ResultPage ──────────────────────────────────────────────────────────────

type ViewMode = "loading" | "cards" | "all-passed" | "empty";

export default function ResultPage() {
  const router = useRouter();
  const { budget, foodTypes, hasParking, travelMode, location } = useFilterStore();

  const [viewMode, setViewMode] = useState<ViewMode>("loading");
  const [loadingStep, setLoadingStep] = useState<"location" | "search">("location");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [cards, setCards] = useState<Restaurant[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [showNavSheet, setShowNavSheet] = useState(false);
  const [adWatching, setAdWatching] = useState(false);

  const fullPoolRef = useRef<Restaurant[]>([]);
  const poolOffsetRef = useRef(0);
  const topCardRef = useRef<SwipeCardHandle>(null);

  const current = cards[cardIndex] ?? null;

  // 카드 바뀔 때 상단으로 스크롤
  useEffect(() => {
    if (viewMode === "cards") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [cardIndex, viewMode]);

  function startBatch(offset: number) {
    const pool = fullPoolRef.current;
    if (pool.length === 0) { setViewMode("all-passed"); return; }
    const batch: Restaurant[] = [];
    for (let i = 0; i < 3; i++) batch.push(pool[(offset + i) % pool.length]);
    poolOffsetRef.current = offset;
    setCards(batch);
    setCardIndex(0);
    setViewMode("cards");
  }

  async function loadPool() {
    setViewMode("loading");
    setLocationError(null);
    setLoadingStep("location");
    try {
      let lat: number, lng: number, radius: number;
      if (location) {
        lat = location.lat; lng = location.lng; radius = location.radius;
      } else {
        const coords = await getCurrentPosition();
        lat = coords.latitude; lng = coords.longitude; radius = 1000;
      }
      setLoadingStep("search");
      const places = await searchNearbyRestaurants(lat, lng, foodTypes, radius);
      fullPoolRef.current = places.map(normalizeKakaoPlace);
    } catch (err) {
      // 검색 결과 0개 — mock fallback 없이 빈 결과 화면 표시
      if (err instanceof NoResultsError) {
        setViewMode("empty");
        return;
      }
      if (err instanceof GeolocationPositionError && err.code === 1) {
        setLocationError("위치 권한이 거부됐어요. 인기 맛집으로 추천할게요.");
      }
      const pool: MockRestaurant[] = [];
      for (let i = 0; i < 12; i++) pool.push(pickMockRestaurant(budget, foodTypes, hasParking));
      fullPoolRef.current = pool;
    } finally {
      if (fullPoolRef.current.length > 0) startBatch(0);
    }
  }

  useEffect(() => {
    loadPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 카카오 SDK 로드 & 초기화
  // ※ 카카오 개발자 콘솔(https://developers.kakao.com/console/app/1402815)
  //   > 앱 설정 > 플랫폼 > Web 사이트 도메인에
  //   https://babsaeng.vercel.app 이 등록되어 있어야 공유가 작동합니다.
  useEffect(() => {
    if (document.getElementById("kakao-sdk")) return;
    const script = document.createElement("script");
    script.id = "kakao-sdk";
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      const key = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
      if (key && !window.Kakao.isInitialized()) {
        window.Kakao.init(key);
      }
    };
    document.head.appendChild(script);
  }, []);

  function advanceCard() {
    const next = cardIndex + 1;
    if (next >= cards.length) setViewMode("all-passed");
    else setCardIndex(next);
  }

  function handleWatchAd() {
    setAdWatching(true);
    setTimeout(() => {
      setAdWatching(false);
      const next = (poolOffsetRef.current + 3) % Math.max(fullPoolRef.current.length, 1);
      startBatch(next);
    }, 1500);
  }

  function getKakaoFallback(r: Restaurant): string {
    return "placeUrl" in r && r.placeUrl
      ? r.placeUrl
      : `https://map.kakao.com/link/search/${encodeURIComponent(r.name + " " + r.address)}`;
  }

  function handleKakaoMap() {
    if (!current) return;
    window.open(getKakaoFallback(current), "_blank");
    setShowNavSheet(false);
  }

  function handleTmapNav() {
    if (!current) return;
    setShowNavSheet(false);
    const name = encodeURIComponent(current.name);
    const hasCoords = "lat" in current && current.lat && current.lng;
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

    if (isMobile && hasCoords) {
      window.location.href =
        `tmap://route?goalname=${name}&goalx=${current.lng}&goaly=${current.lat}`;
    } else if (hasCoords) {
      // 데스크톱: 구글맵 길찾기
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(current.address)}`,
        "_blank"
      );
    } else {
      window.open(getKakaoFallback(current), "_blank");
    }
  }

  async function handleKakaoShare() {
    if (!current) return;

    const fallbackText = `🍽️ ${current.name}\n⭐ ${current.rating.toFixed(1)} · ${current.address}\n\n밥선생에서 내 근처 맛집 추천받기 👉 https://babsaeng.vercel.app`;

    if (window.Kakao?.Share) {
      try {
        window.Kakao.Share.sendDefault({
          objectType: "feed",
          content: {
            title: `밥선생 추천 - ${current.name}`,
            description: `${current.address} · ⭐${current.rating.toFixed(1)}`,
            imageUrl: "https://babsaeng.vercel.app/og-image.png",
            link: {
              mobileWebUrl: "https://babsaeng.vercel.app",
              webUrl: "https://babsaeng.vercel.app",
            },
          },
          buttons: [
            {
              title: "밥선생에서 보기",
              link: {
                mobileWebUrl: "https://babsaeng.vercel.app",
                webUrl: "https://babsaeng.vercel.app",
              },
            },
          ],
        });
        return;
      } catch {
        // SDK 실패 시 아래 fallback으로
      }
    }

    // Kakao SDK 미준비 → Web Share API → 클립보드 복사
    if (navigator.share) {
      navigator.share({ title: current.name, text: fallbackText }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(fallbackText).catch(() => {});
      alert("공유 내용이 클립보드에 복사됐어요!");
    }
  }

  function handleCall() {
    if (!current || !current.phone || current.phone === "전화번호 없음") return;
    window.location.href = `tel:${current.phone}`;
  }

  // ─── 렌더링 ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4 bg-white">
        <button onClick={() => router.back()} className="text-gray-500 text-xl">←</button>
        <h1 className="text-base font-bold text-gray-900">오늘의 추천</h1>
        <button onClick={() => router.push("/mypage")} className="text-gray-400 text-sm">MY</button>
      </div>

      <div className="flex-1 px-5 py-6">

        {/* ── 로딩 ─────────────────────────────────────────────────────── */}
        {viewMode === "loading" && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-5xl animate-bounce">🍽️</div>
            <p className="text-base font-medium text-gray-500">
              {loadingStep === "location" ? "현재 위치 확인 중..." : "근처 맛집 찾는 중..."}
            </p>
          </div>
        )}

        {/* ── 검색 결과 없음 ───────────────────────────────────────────── */}
        {viewMode === "empty" && (
          <div className="flex flex-col items-center justify-center gap-4 pt-20">
            <div className="text-6xl">😢</div>
            <p className="text-xl font-bold text-gray-900">이 근방엔 없네요</p>
            <p className="text-sm text-gray-400 text-center leading-relaxed">
              이 근방에는 조건에 맞는 식당이 없어요 😢<br />
              필터를 바꿔볼까요?
            </p>
            <button
              onClick={() => router.push("/filter")}
              className="mt-2 px-6 py-3.5 rounded-2xl font-semibold text-sm text-white"
              style={{ backgroundColor: "#0064FF" }}
            >
              필터 다시 설정하기
            </button>
            <button
              onClick={() => router.push("/")}
              className="text-sm text-gray-400 underline underline-offset-2"
            >
              처음부터 다시하기
            </button>
          </div>
        )}

        {/* ── 모두 PASS ────────────────────────────────────────────────── */}
        {viewMode === "all-passed" && (
          <div className="flex flex-col items-center justify-center gap-5 pt-16">
            <div className="text-6xl">😅</div>
            <p className="text-xl font-bold text-gray-900">다 패스했네요!</p>
            <p className="text-sm text-gray-400 text-center leading-relaxed">
              광고를 보시면<br />3개를 더 추천해드려요
            </p>
            {adWatching ? (
              <div className="flex items-center gap-3 mt-2">
                <div className="text-2xl animate-spin">🎬</div>
                <p className="text-sm text-gray-500">광고 시청 중...</p>
              </div>
            ) : (
              <button
                onClick={handleWatchAd}
                className="px-6 py-3.5 rounded-2xl font-semibold text-sm text-white mt-2"
                style={{ backgroundColor: "#0064FF" }}
              >
                🎬 광고 보고 3개 더 보기
              </button>
            )}
            <button
              onClick={() => router.push("/")}
              className="text-sm text-gray-400 underline underline-offset-2"
            >
              처음부터 다시하기
            </button>
          </div>
        )}

        {/* ── 카드 + 상세정보 ───────────────────────────────────────────── */}
        {viewMode === "cards" && current && (
          <div className="flex flex-col gap-3">
            {locationError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-yellow-50 border border-yellow-200">
                <span>⚠️</span>
                <p className="text-xs text-yellow-700">{locationError}</p>
              </div>
            )}

            {/* 인디케이터 */}
            <div className="flex justify-center items-center gap-2">
              {cards.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    height: "8px",
                    width: i === cardIndex ? "24px" : "8px",
                    backgroundColor:
                      i === cardIndex ? "#0064FF" : i < cardIndex ? "#CBD5E1" : "#E2E8F0",
                  }}
                />
              ))}
              <span className="ml-1 text-xs text-gray-400 font-semibold">
                {cardIndex + 1}/{cards.length}
              </span>
            </div>

            {/* 카드 스택 (스와이프 영역) */}
            <div className="relative" style={{ height: "314px" }}>
              {[0, 1, 2].map((offset) => {
                const card = cards[cardIndex + offset];
                if (!card) return null;
                return (
                  <SwipeCard
                    key={String(card.id) + "-" + (cardIndex + offset)}
                    ref={offset === 0 ? topCardRef : null}
                    restaurant={card}
                    onPass={advanceCard}
                    onLike={advanceCard}
                    stackOffset={offset}
                  />
                );
              })}
            </div>

            {/* 상세정보 카드 */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-5">
                {/* 별점 + 주소 + 전화 */}
                <div className="mb-4">
                  <StarRating rating={current.rating} reviewCount={current.reviewCount} />
                  <p className="text-xs text-gray-400 mt-2">{current.address}</p>
                  {current.phone && current.phone !== "전화번호 없음" && (
                    <p className="text-xs text-gray-400 mt-1">📞 {current.phone}</p>
                  )}
                  {travelMode === "배달" && (
                    <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                      🛵 배달 가능
                    </span>
                  )}
                </div>

                {/* 리뷰 3개 */}
                <div className="flex flex-col gap-2 mb-4">
                  <p className="text-xs text-gray-400">💬 리뷰</p>
                  {("reviewSummaries" in current
                    ? current.reviewSummaries
                    : [current.reviewSummary]
                  ).map((review, i) => (
                    <div key={i} className="bg-gray-50 rounded-2xl px-4 py-3">
                      <p className="text-sm text-gray-700 leading-relaxed">&ldquo;{review}&rdquo;</p>
                    </div>
                  ))}
                </div>

                {/* 네이버 플레이스 버튼 */}
                <button
                  onClick={() => {
                    const name = encodeURIComponent(current.name);
                    window.open(
                      `https://map.naver.com/p/search/${name}`,
                      "_blank"
                    );
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-3.5 rounded-2xl"
                  style={{ backgroundColor: "#03C75A" }}
                >
                  <div
                    className="flex items-center justify-center rounded-full flex-shrink-0"
                    style={{ width: "26px", height: "26px", backgroundColor: "#FFFFFF" }}
                  >
                    <span className="font-black text-sm leading-none" style={{ color: "#03C75A" }}>N</span>
                  </div>
                  <span className="text-sm font-bold text-white">네이버 플레이스에서 메뉴 보기</span>
                </button>

                {/* PASS / 먹고싶다 버튼 */}
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => topCardRef.current?.triggerPass()}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-semibold"
                    style={{ backgroundColor: "#F2F4F6", color: "#666666" }}
                  >
                    ✕ PASS
                  </button>
                  <button
                    onClick={() => topCardRef.current?.triggerLike()}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-white"
                    style={{ backgroundColor: "#0064FF" }}
                  >
                    ♥ 먹고싶다
                  </button>
                </div>
              </div>
            </div>

            {/* 액션 버튼 4개 */}
            <div className="grid grid-cols-4 gap-2">
              {/* 길찾기 */}
              <button
                onClick={() => setShowNavSheet(true)}
                className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl bg-white shadow-sm border border-gray-100"
                style={{ minHeight: "72px" }}
              >
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ width: "28px", height: "28px", backgroundColor: "#0064FF" }}
                >
                  <span style={{ fontSize: "14px" }}>🧭</span>
                </div>
                <span className="text-xs font-semibold text-gray-600">길찾기</span>
              </button>

              {/* 전화하기 */}
              <button
                onClick={handleCall}
                disabled={!current.phone || current.phone === "전화번호 없음"}
                className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl bg-white shadow-sm border border-gray-100 disabled:opacity-40"
                style={{ minHeight: "72px" }}
              >
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: "28px", height: "28px" }}>
                  <span style={{ fontSize: "22px", lineHeight: 1 }}>📞</span>
                </div>
                <span className="text-xs font-semibold text-gray-600">전화하기</span>
              </button>

              {/* 카톡공유 */}
              <button
                onClick={handleKakaoShare}
                className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl bg-white shadow-sm border border-gray-100"
                style={{ minHeight: "72px" }}
              >
                <div className="flex items-center justify-center flex-shrink-0 overflow-hidden rounded-md" style={{ width: "28px", height: "28px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png"
                    alt="카카오톡"
                    style={{ width: "28px", height: "28px", objectFit: "contain" }}
                    onError={(e) => {
                      const span = document.createElement("span");
                      span.textContent = "💬";
                      span.style.fontSize = "22px";
                      e.currentTarget.parentElement?.replaceChildren(span);
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-600">카톡공유</span>
              </button>

              {/* 다른 곳 (→ 다음 카드) */}
              <button
                onClick={() => topCardRef.current?.triggerPass()}
                className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl shadow-sm border"
                style={{ backgroundColor: "#E8F1FF", borderColor: "#D0E4FF", minHeight: "72px" }}
              >
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: "28px", height: "28px" }}>
                  <span style={{ fontSize: "22px", lineHeight: 1 }}>🔀</span>
                </div>
                <span className="text-xs font-semibold" style={{ color: "#0064FF" }}>다른 곳</span>
              </button>
            </div>

            <button
              onClick={() => router.push("/filter")}
              className="text-sm text-gray-400 underline underline-offset-2 text-center"
            >
              필터 다시 설정하기
            </button>
          </div>
        )}

      </div>

      {/* 처음부터 (cards 뷰에서만) */}
      {viewMode === "cards" && (
        <div className="px-5 pb-10 mt-2">
          <button
            onClick={() => router.push("/")}
            className="w-full py-4 rounded-2xl font-semibold text-sm text-white"
            style={{ backgroundColor: "#0064FF" }}
          >
            처음부터 다시하기
          </button>
        </div>
      )}

      {/* 밥선생 길찾기 바텀시트 */}
      {showNavSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowNavSheet(false)}
        >
          <div
            className="w-full max-w-[375px] bg-white rounded-t-3xl pt-5 pb-10 px-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-base font-bold text-gray-900 mb-4">밥선생 길찾기</h3>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleKakaoMap}
                className="flex items-center gap-3 px-4 py-4 rounded-2xl border-2 w-full text-left"
                style={{ borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" }}
              >
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ width: "28px", height: "28px", backgroundColor: "#FFCD00" }}
                >
                  <span className="font-black text-sm leading-none" style={{ color: "#3C1E1E" }}>K</span>
                </div>
                <span className="text-sm font-semibold text-gray-700">카카오맵으로 가기</span>
              </button>
              <button
                onClick={handleTmapNav}
                className="flex items-center gap-3 px-4 py-4 rounded-2xl border-2 w-full text-left"
                style={{ borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" }}
              >
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ width: "28px", height: "28px", backgroundColor: "#0064FF" }}
                >
                  <span className="text-white font-black text-sm leading-none">T</span>
                </div>
                <span className="text-sm font-semibold text-gray-700">티맵으로 가기</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
