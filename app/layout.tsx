import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { QueryProvider } from "@/lib/query-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { ExtensionErrorHandler } from "@/components/common/extension-error-handler";
import { Toaster } from "@/components/ui/sonner";
import { NotificationListener } from "@/components/notifications/notification-listener";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GrowShip - Multi-Tenant Business Platform",
  description:
    "Connect brands, distributors, and manufacturers in one unified platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ExtensionErrorHandler />
        <QueryProvider>
          <AuthProvider>
            <NotificationListener />
            {children}
          </AuthProvider>
        </QueryProvider>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <Toaster />
      </body>
    </html>
  );
}
