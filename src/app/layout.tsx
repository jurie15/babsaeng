import type { Metadata, Viewport } from "next";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "밥선생",
  description: "오늘 뭐 먹을지 모르겠을 때, 밥선생이 골라드려요",
  keywords: ["음식", "추천", "밥선생", "메뉴"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>
          <div style={{ maxWidth: "375px", margin: "0 auto", minHeight: "100vh" }}>
            {children}
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
