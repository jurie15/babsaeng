import menusData from "@/data/menus.json";

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string; // e.g. "음식점 > 한식 > 삼겹살"
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string; // 경도
  y: string; // 위도
  place_url: string;
  distance: string; // 미터
}

export interface NormalizedRestaurant {
  id: number;
  name: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  reviewSummaries: string[];
  category: string;
  distance: string;
  placeUrl: string;
  lat: number;  // 위도 (T-Map 길안내용)
  lng: number;  // 경도 (T-Map 길안내용)
  photoUrl?: string; // 카카오 API 미제공 — 향후 Place Detail API 연동 시 사용
  recommendedMenus: { name: string; price: number; emoji: string; isSignature?: boolean }[];
  isRealData: true;
}

export class NoResultsError extends Error {
  constructor() {
    super("No results");
    this.name = "NoResultsError";
  }
}

// ─── 위치 ────────────────────────────────────────────────────────────────────

export function getCurrentPosition(timeout = 10000): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(err),
      { timeout, maximumAge: 60000, enableHighAccuracy: false }
    );
  });
}

// ─── 카카오 로컬 검색 ─────────────────────────────────────────────────────────

export async function searchNearbyRestaurants(
  lat: number,
  lng: number,
  foodTypes: string[],
  radius = 1000
): Promise<KakaoPlace[]> {
  const activeFoodTypes = foodTypes.filter((f) => f !== "상관없음");
  // 여러 카테고리 선택 시 첫 번째 카테고리로 검색 (다회 호출 대신 단순화)
  const query = activeFoodTypes.length > 0 ? activeFoodTypes[0] + " 맛집" : "맛집";

  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    query,
    radius: radius.toString(),
    size: "15",
  });

  const res = await fetch(`/api/kakao/nearby?${params}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const data = await res.json();
  if (!data.documents || data.documents.length === 0) {
    throw new NoResultsError();
  }

  return data.documents as KakaoPlace[];
}

// ─── KakaoPlace → NormalizedRestaurant 변환 ──────────────────────────────────

const CATEGORY_REVIEW_STUBS: Record<string, string[]> = {
  한식: [
    "국물이 진하고 반찬이 넉넉해서 매번 생각나는 곳이에요",
    "정갈한 한 상 차림이 인상적이고 재료가 신선해요",
    "집밥 느낌이 나서 편하게 먹을 수 있어요",
  ],
  중식: [
    "면이 쫄깃하고 소스가 깊어서 자꾸 생각나요",
    "볶음 요리가 불 향이 살아 있어서 맛있어요",
    "양이 많고 가격 대비 만족스러워요",
  ],
  일식: [
    "재료가 신선하고 플레이팅이 예뻐서 기분 좋게 먹었어요",
    "국물이 진하고 면 탄력이 딱 좋아요",
    "모든 메뉴가 꼼꼼하게 준비되어 있어요",
  ],
  양식: [
    "파스타가 알덴테로 나오고 소스가 풍부해요",
    "분위기가 좋고 직원들이 친절해서 데이트 코스로 딱이에요",
    "스테이크 굽기가 정확하고 사이드도 충실해요",
  ],
  분식: [
    "떡볶이 국물이 달콤하고 순대가 두툼해서 가성비 최고예요",
    "재료를 아끼지 않아서 든든하게 먹을 수 있어요",
    "친구들이랑 가볍게 먹기 좋고 양도 많아요",
  ],
  패스트푸드: [
    "패티가 두껍고 재료가 신선해서 프리미엄 버거 맛이 나요",
    "바삭하게 잘 튀겨져서 맥주랑 찰떡이에요",
    "빠르게 먹기 좋고 항상 맛이 일정해요",
  ],
  아시안: [
    "현지 느낌이 나는 향신료 조합이 인상적이에요",
    "육수가 깊고 고수가 적당해서 처음 먹는 분도 좋아해요",
    "이국적인 맛이 매력적이고 가격도 착해요",
  ],
  고기구이: [
    "불향이 살아있고 고기 두께가 두툼해서 씹는 맛이 있어요",
    "숯불 향이 진하고 고기 질이 좋아서 자주 오게 돼요",
    "상차림이 푸짐하고 밑반찬이 계속 나와서 든든해요",
  ],
  안주: [
    "안주 퀄리티가 좋고 맥주랑 궁합이 잘 맞아요",
    "양이 많고 가성비 최고예요. 친구들이랑 자주 와요",
    "분위기가 편안하고 안주 메뉴가 다양해서 좋아요",
  ],
  기타: [
    "독특한 메뉴 구성이 재미있고 맛도 좋아요",
    "분위기가 아늑하고 음식이 정성스럽게 나와요",
    "친절한 서비스와 맛있는 음식이 기억에 남아요",
  ],
};

/** 카카오 카테고리명 + 식당명에서 우리 카테고리 추출 */
function parseCategory(categoryName: string, placeName = ""): string {
  // 카테고리명과 식당명 합쳐서 매칭
  const c = categoryName + " " + placeName;

  if (/화로구이|삼겹살|갈비|목살|항정살|꽃등심|구이|족발|보쌈|고깃집|고기집/.test(c)) return "고기구이";
  if (/술집|호프|맥주|포차|선술집|이자카야|안주/.test(c)) return "안주";
  if (/치킨|버거|햄버거|패스트푸드/.test(c)) return "패스트푸드";
  if (/중식|중국|짜장|짬뽕|딤섬|마라/.test(c)) return "중식";
  if (/일식|라멘|스시|초밥|돈카츠|우동|소바|일본/.test(c)) return "일식";
  if (/양식|이탈리안|파스타|스테이크|피자/.test(c)) return "양식";
  if (/분식|떡볶이|순대|김밥/.test(c)) return "분식";
  if (/태국|베트남|동남아|아시안|인도/.test(c)) return "아시안";
  if (/한식|한국/.test(c)) return "한식";

  // 부분 일치 fallback
  const parts = categoryName.split(">").map((s) => s.trim());
  const known = ["한식", "중식", "일식", "양식", "분식", "패스트푸드", "아시안", "고기구이", "안주"];
  for (const part of parts) {
    if (known.includes(part)) return part;
  }
  return "기타";
}

/** id 문자열 기반으로 결정론적 숫자 생성 */
function seededNumber(id: string, min: number, max: number): number {
  const hash = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return min + (hash % (max - min + 1));
}

/** 카테고리에 맞는 메뉴 2~3개 추출 */
function getMenusForCategory(
  category: string
): { name: string; price: number; emoji: string; isSignature?: boolean }[] {
  const key = category as keyof typeof menusData;
  const pool = (menusData[key] ?? Object.values(menusData).flat()) as {
    name: string;
    avgPrice: number;
    emoji: string;
  }[];

  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  return shuffled.map((m, i) => ({
    name: m.name,
    price: m.avgPrice,
    emoji: m.emoji,
    isSignature: i === 0,
  }));
}

export function normalizeKakaoPlace(place: KakaoPlace): NormalizedRestaurant {
  const category = parseCategory(place.category_name, place.place_name);
  const rating = seededNumber(place.id, 35, 49) / 10; // 3.5 ~ 4.9
  const reviewCount = seededNumber(place.id + "r", 50, 8000);
  const stubs = CATEGORY_REVIEW_STUBS[category] ?? CATEGORY_REVIEW_STUBS["기타"];
  // 시드 기반으로 시작 인덱스를 결정해 3개 모두 반환 (순서는 식당마다 다름)
  const offset = seededNumber(place.id, 0, stubs.length - 1);
  const reviewSummaries = [...stubs.slice(offset), ...stubs.slice(0, offset)];
  const address = place.road_address_name || place.address_name;
  const distance =
    Number(place.distance) < 1000
      ? `${place.distance}m`
      : `${(Number(place.distance) / 1000).toFixed(1)}km`;

  return {
    id: Number(place.id),
    name: place.place_name,
    address,
    phone: place.phone || "전화번호 없음",
    rating,
    reviewCount,
    reviewSummaries,
    category,
    distance,
    placeUrl: place.place_url,
    lat: Number(place.y),
    lng: Number(place.x),
    recommendedMenus: getMenusForCategory(category),
    isRealData: true,
  };
}

