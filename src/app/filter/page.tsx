"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFilterStore } from "@/lib/store";

const FOOD_TYPES = [
  { label: "한식", emoji: "🍚" },
  { label: "중식", emoji: "🥡" },
  { label: "일식", emoji: "🍣" },
  { label: "양식", emoji: "🍝" },
  { label: "분식", emoji: "🍢" },
  { label: "패스트푸드", emoji: "🍔" },
  { label: "아시안", emoji: "🍜" },
  { label: "상관없음", emoji: "🌏" },
];

const PEOPLE_OPTIONS = [
  { label: "혼밥", value: 1, emoji: "🙋" },
  { label: "2명", value: 2, emoji: "👫" },
  { label: "3~4명", value: 4, emoji: "👨‍👩‍👧" },
  { label: "5명 이상", value: 5, emoji: "👥" },
];

const TRAVEL_OPTIONS = [
  { label: "도보", emoji: "🚶", desc: "걸어서 이동해요" },
  { label: "차량", emoji: "🚗", desc: "차로 이동해요" },
  { label: "배달", emoji: "🛵", desc: "배달로 주문해요" },
];

function FilterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    foodTypes,
    people,
    withKids,
    travelMode,
    hasParking,
    toggleFoodType,
    setPeople,
    setWithKids,
    setTravelMode,
    setHasParking,
    setBudget,
  } = useFilterStore();

  // 홈에서 URL 파라미터로 전달된 budget을 store에 저장
  useEffect(() => {
    const budget = searchParams.get("budget");
    if (budget !== null) {
      setBudget(Number(budget));
    }
  }, [searchParams, setBudget]);

  const handleSubmit = () => {
    router.push("/result");
  };

  return (
    <main className="page-container bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-6">
        <button onClick={() => router.back()} className="text-gray-500 text-xl">
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">필터 설정</h1>
          <p className="text-xs text-gray-400">원하는 조건을 골라주세요</p>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-8 pb-32">
        {/* 음식 종류 */}
        <section>
          <h2 className="section-title">음식 종류</h2>
          <div className="flex flex-wrap gap-2">
            {FOOD_TYPES.map((type) => {
              const isSelected = foodTypes.includes(type.label);
              return (
                <button
                  key={type.label}
                  onClick={() => toggleFoodType(type.label)}
                  className={`chip ${isSelected ? "chip-active" : "chip-inactive"}`}
                >
                  {type.emoji} {type.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 인원 */}
        <section>
          <h2 className="section-title">인원</h2>
          <div className="grid grid-cols-4 gap-2">
            {PEOPLE_OPTIONS.map((option) => {
              const isSelected = people === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setPeople(option.value)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all duration-150"
                  style={{
                    borderColor: isSelected ? "#0064FF" : "#E5E7EB",
                    backgroundColor: isSelected ? "#E8F1FF" : "#FFFFFF",
                  }}
                >
                  <span className="text-xl">{option.emoji}</span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: isSelected ? "#0064FF" : "#374151" }}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 이동방법 */}
        <section>
          <h2 className="section-title">이동방법</h2>
          <div className="flex flex-col gap-2">
            {TRAVEL_OPTIONS.map((option) => {
              const isSelected = travelMode === option.label;
              return (
                <button
                  key={option.label}
                  onClick={() => setTravelMode(option.label)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all duration-150 text-left"
                  style={{
                    borderColor: isSelected ? "#0064FF" : "#E5E7EB",
                    backgroundColor: isSelected ? "#E8F1FF" : "#FFFFFF",
                  }}
                >
                  <span className="text-xl">{option.emoji}</span>
                  <div className="flex-1">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: isSelected ? "#0064FF" : "#374151" }}
                    >
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-400">{option.desc}</p>
                  </div>
                  {isSelected && (
                    <span className="font-bold" style={{ color: "#0064FF" }}>
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 주차장 필터 (차량 선택 시 자동 활성화) */}
          {travelMode === "차량" && (
            <div className="mt-3">
              <button
                onClick={() => setHasParking(!hasParking)}
                className="flex items-center justify-between w-full px-4 py-4 rounded-2xl border-2 transition-all duration-150"
                style={{
                  borderColor: hasParking ? "#0064FF" : "#E5E7EB",
                  backgroundColor: hasParking ? "#E8F1FF" : "#F9FAFB",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🅿️</span>
                  <div className="text-left">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: hasParking ? "#0064FF" : "#374151" }}
                    >
                      주차 가능한 곳만
                    </p>
                    <p className="text-xs text-gray-400">주차장 있는 식당만 보여요</p>
                  </div>
                </div>
                <div
                  className="relative w-12 h-6 rounded-full transition-all duration-200"
                  style={{ backgroundColor: hasParking ? "#0064FF" : "#D1D5DB" }}
                >
                  <div
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                    style={{ left: hasParking ? "calc(100% - 20px)" : "4px" }}
                  />
                </div>
              </button>
            </div>
          )}
        </section>

        {/* 유아 동반 */}
        <section>
          <h2 className="section-title">유아 동반</h2>
          <button
            onClick={() => setWithKids(!withKids)}
            className="flex items-center justify-between w-full px-4 py-4 rounded-2xl border-2 transition-all duration-150"
            style={{
              borderColor: withKids ? "#0064FF" : "#E5E7EB",
              backgroundColor: withKids ? "#E8F1FF" : "#FFFFFF",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">👶</span>
              <div className="text-left">
                <p
                  className="text-sm font-semibold"
                  style={{ color: withKids ? "#0064FF" : "#374151" }}
                >
                  유아 동반
                </p>
                <p className="text-xs text-gray-400">아이와 함께 가요</p>
              </div>
            </div>
            {/* 토글 스위치 */}
            <div
              className="relative w-12 h-6 rounded-full transition-all duration-200"
              style={{ backgroundColor: withKids ? "#0064FF" : "#D1D5DB" }}
            >
              <div
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                style={{ left: withKids ? "calc(100% - 20px)" : "4px" }}
              />
            </div>
          </button>
        </section>
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[375px] px-5 pb-8 pt-4 bg-white border-t border-gray-100">
        <button onClick={handleSubmit} className="btn-primary">
          메뉴 추천받기 🍽️
        </button>
      </div>
    </main>
  );
}

export default function FilterPage() {
  return (
    <Suspense>
      <FilterPageInner />
    </Suspense>
  );
}
