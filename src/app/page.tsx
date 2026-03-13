"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFilterStore } from "@/lib/store";
import type { LocationData } from "@/lib/store";

// Daum Postcode 전역 타입
declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
        width?: string;
        height?: string;
      }) => { open: () => void };
    };
  }
}

interface DaumPostcodeData {
  address: string;
  roadAddress: string;
  sido: string;
  sigungu: string;
  bname: string;
  bname1: string;
  bname2: string;
}

function getRadius(data: DaumPostcodeData): number {
  if (data.bname2 && data.bname2.length > 0) return 1000;
  if (data.bname && /[동읍면리]$/.test(data.bname)) return 1000;
  if (data.sigungu && /[구군]$/.test(data.sigungu)) return 3000;
  return 8000;
}

const RECENT_KEY = "babsaeng_recent_locs";

function loadRecentLocations(): LocationData[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

const BUDGET_OPTIONS = [
  { label: "10,000원 이하", value: 10000, emoji: "🍜" },
  { label: "15,000원 이하", value: 15000, emoji: "🍱" },
  { label: "20,000원 이하", value: 20000, emoji: "🍣" },
  { label: "30,000원 이하", value: 30000, emoji: "🥩" },
  { label: "50,000원 이하", value: 50000, emoji: "🍾" },
  { label: "상관없음", value: 0, emoji: "💰" },
];

function LocationBar() {
  const location = useFilterStore((s) => s.location);
  const setLocation = useFilterStore((s) => s.setLocation);
  const clearLocation = useFilterStore((s) => s.clearLocation);
  const [recentLocations, setRecentLocations] = useState<LocationData[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    setRecentLocations(loadRecentLocations());

    // Daum 우편번호 스크립트 사전 로드
    if (!document.getElementById("daum-postcode-script")) {
      const script = document.createElement("script");
      script.id = "daum-postcode-script";
      script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      document.head.appendChild(script);
    }
  }, []);

  async function handleAddressSelect(data: DaumPostcodeData) {
    const address = data.roadAddress || data.address;
    const short = [data.sigungu, data.bname2 || data.bname].filter(Boolean).join(" ");
    const radius = getRadius(data);

    setIsGeocoding(true);
    try {
      const res = await fetch(`/api/kakao/geocode?query=${encodeURIComponent(address)}`);
      const json = await res.json();
      const doc = json.documents?.[0];
      if (!doc) throw new Error("No result");

      const loc: LocationData = {
        address,
        shortAddress: short || address,
        lat: Number(doc.y),
        lng: Number(doc.x),
        radius,
      };

      setLocation(loc);
      const updated = [loc, ...loadRecentLocations().filter((r) => r.address !== loc.address)].slice(0, 3);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      setRecentLocations(updated);
    } catch {
      alert("주소 좌표를 찾을 수 없어요. 다시 시도해주세요.");
    } finally {
      setIsGeocoding(false);
    }
  }

  function openPostcode() {
    if (!window.daum?.Postcode) {
      alert("주소 검색 서비스를 불러오는 중이에요. 잠시 후 다시 눌러주세요.");
      return;
    }
    new window.daum.Postcode({ oncomplete: handleAddressSelect }).open();
  }

  function selectRecent(loc: LocationData) {
    setLocation(loc);
    const updated = [loc, ...loadRecentLocations().filter((r) => r.address !== loc.address)].slice(0, 3);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    setRecentLocations(updated);
  }

  const radiusLabel = location
    ? location.radius >= 1000
      ? `${location.radius / 1000}km 이내`
      : `${location.radius}m 이내`
    : null;

  return (
    <div className="px-5 pb-5">
      {/* 현재 위치 바 */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-2xl border"
        style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0">📍</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {location ? location.shortAddress || location.address : "현재 위치"}
            </p>
            {radiusLabel && (
              <p className="text-xs text-gray-400">{radiusLabel}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={openPostcode}
          disabled={isGeocoding}
          className="ml-3 flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all disabled:opacity-50"
          style={{ backgroundColor: "#E8F1FF", color: "#0064FF" }}
        >
          {isGeocoding ? "검색중..." : "변경"}
        </button>
      </div>

      {/* 현재 위치로 돌아가기 */}
      {location && (
        <button
          type="button"
          onClick={clearLocation}
          className="flex items-center gap-1.5 mt-2 text-xs text-gray-400 transition-all"
        >
          <span>↩</span>
          <span>현재 위치로 돌아가기</span>
        </button>
      )}

      {/* 최근 검색 위치 */}
      {recentLocations.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {recentLocations.map((loc) => {
            const isActive = location?.address === loc.address;
            return (
              <button
                key={loc.address}
                type="button"
                onClick={() => selectRecent(loc)}
                className="text-xs px-3 py-1.5 rounded-full border transition-all max-w-[140px] truncate"
                style={{
                  borderColor: isActive ? "#0064FF" : "#E5E7EB",
                  backgroundColor: isActive ? "#E8F1FF" : "#FFFFFF",
                  color: isActive ? "#0064FF" : "#6B7280",
                }}
              >
                {loc.shortAddress || loc.address}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 헤더 */}
      <div className="px-5 pt-14 pb-8">
        <p className="text-sm font-semibold mb-2" style={{ color: "#0064FF" }}>
          밥선생 🍚
        </p>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
          오늘 예산이
          <br />
          얼마예요?
        </h1>
        <p className="text-sm text-gray-400 mt-2">예산에 맞는 메뉴를 추천해드려요</p>
      </div>

      {/* 위치 설정 바 */}
      <LocationBar />

      {/* 예산 선택 */}
      <div className="px-5 flex-1 pb-40">
        {BUDGET_OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <div
              key={option.value}
              onClick={() => setSelected(option.value)}
              className="flex items-center gap-4 w-full p-4 rounded-2xl mb-3 transition-all duration-150"
              style={{
                border: isSelected ? "2px solid #0064FF" : "2px solid #E5E7EB",
                backgroundColor: isSelected ? "#E8F1FF" : "#FFFFFF",
                cursor: "pointer",
              }}
            >
              <span className="text-2xl">{option.emoji}</span>
              <span
                className="text-base font-semibold"
                style={{ color: isSelected ? "#0064FF" : "#111827" }}
              >
                {option.label}
              </span>
              {isSelected && (
                <span className="ml-auto font-bold" style={{ color: "#0064FF" }}>
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[375px] px-5 pb-8 pt-4 bg-white border-t border-gray-100">
        <button
          type="button"
          onClick={() => {
            if (selected === null) return;
            router.push(`/filter?budget=${selected}`);
          }}
          disabled={selected === null}
          className="w-full py-4 rounded-2xl text-base font-semibold text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#0064FF" }}
        >
          다음
        </button>
      </div>
    </div>
  );
}
