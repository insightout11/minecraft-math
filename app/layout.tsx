import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Minecraft Math — Jackson's Blocky Adventure",
  description: "A blocky maths adventure for Jackson: battle mobs, earn loot, master times tables.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Minecraft Math"
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1020"
};

const SW_REGISTER = `
(function () {
  try {
    if ("serviceWorker" in navigator) {
      var host = window.location.hostname;
      if (host !== "localhost" && host !== "127.0.0.1") {
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("/sw.js").catch(function () {});
        });
      }
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: SW_REGISTER }} />
      </body>
    </html>
  );
}
