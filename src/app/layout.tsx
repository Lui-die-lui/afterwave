import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AFTERWAVE — 오늘 지구가 남긴 가장 큰 신호",
  description: "USGS 공개 피드 기준, 최근 24시간 내 최대 규모 지진을 Asia/Seoul 기준으로 매일 기록합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
