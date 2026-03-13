"use client";

import { useRouter } from "next/navigation";

const DUMMY_SAVED = [
  { id: 1, name: "된장찌개", emoji: "🍲", category: "한식", date: "오늘" },
  { id: 2, name: "파스타", emoji: "🍝", category: "양식", date: "어제" },
  { id: 3, name: "초밥", emoji: "🍣", category: "일식", date: "3일 전" },
];

export default function MyPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white px-5 pt-14 pb-5">
        <button
          onClick={() => router.back()}
          className="text-gray-500 text-xl mb-4"
        >
          ←
        </button>
        {/* 프로필 */}
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: "#E8F1FF" }}
          >
            👤
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">밥선생 사용자</h1>
            <p className="text-sm text-gray-400">오늘도 맛있는 하루!</p>
          </div>
        </div>

        {/* 통계 */}
        <div className="flex gap-4 mt-5">
          {[
            { label: "추천받음", value: "23" },
            { label: "저장됨", value: "3" },
            { label: "이번 달", value: "8" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex-1 text-center py-3 rounded-2xl"
              style={{ backgroundColor: "#F9FAFB" }}
            >
              <p className="text-lg font-bold" style={{ color: "#0064FF" }}>
                {stat.value}
              </p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-6 flex flex-col gap-6">
        {/* 저장한 메뉴 */}
        <section>
          <h2 className="section-title">저장한 메뉴</h2>
          {DUMMY_SAVED.length > 0 ? (
            <div className="flex flex-col gap-3">
              {DUMMY_SAVED.map((item) => (
                <div
                  key={item.id}
                  className="card flex items-center gap-4"
                >
                  <span className="text-3xl">{item.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-400">{item.category}</p>
                  </div>
                  <span className="text-xs text-gray-300">{item.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-8 text-gray-300">
              <p className="text-3xl mb-2">🍽️</p>
              <p className="text-sm">저장한 메뉴가 없어요</p>
            </div>
          )}
        </section>

        {/* 설정 메뉴 */}
        <section>
          <h2 className="section-title">설정</h2>
          <div className="card flex flex-col divide-y divide-gray-100">
            {[
              { label: "알림 설정", emoji: "🔔" },
              { label: "내 선호 음식", emoji: "❤️" },
              { label: "앱 정보", emoji: "ℹ️" },
            ].map((item) => (
              <button
                key={item.label}
                className="flex items-center gap-3 py-3.5 text-left w-full"
              >
                <span className="text-lg">{item.emoji}</span>
                <span className="text-sm font-medium text-gray-700">
                  {item.label}
                </span>
                <span className="ml-auto text-gray-300">›</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
