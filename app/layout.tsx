import type { Metadata } from "next";
import "./globals.css";
import dynamic from "next/dynamic";
import QueryProvider from "@/providers/QueryProvider";
const ToastProvider = dynamic(() => import("@/providers/ToastProvider"), {
  ssr: false,
});
export const metadata: Metadata = {
  title: "Chat Application",
  description: "Generated by Chat Application",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <ToastProvider> {children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
