import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AuthProvider } from "@/context/AuthContext";
import { HostelProvider } from "@/context/HostelContext";
import { ThemeProvider } from "@/context/ThemeContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "ControlHostel",
  description: "Gestión de hostels",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <AuthProvider>
            <HostelProvider>{children}</HostelProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
