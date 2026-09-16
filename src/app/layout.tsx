import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "AFTERWAVE — 오늘 지구가 남긴 가장 큰 신호",
  description: "USGS 공개 피드 기준, 최근 24시간 내 최대 규모 지진을 Asia/Seoul 기준으로 매일 기록합니다.",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("aw-theme");
    var theme = stored === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <head>
        {/* Runs before hydration so the correct theme is on screen for the
            very first paint — first visit is always light regardless of OS
            preference; a saved choice is restored without a flash. */}
        <Script id="aw-theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
