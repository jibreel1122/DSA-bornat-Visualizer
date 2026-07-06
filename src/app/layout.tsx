import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { LocaleProvider } from "@/lib/i18n";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Bornat Data Structure Visualizer",
    template: "%s · Bornat Visualizer",
  },
  description:
    "Learn, Visualize, Experiment, and Master Data Structures & Algorithms — interactive step-by-step visualizations, code in 12 languages, quizzes, and practice mode.",
  authors: [{ name: "Jibreel Bornat" }],
  keywords: ["data structures", "algorithms", "visualizer", "sorting", "graphs", "trees", "education"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafc" },
    { media: "(prefers-color-scheme: dark)", color: "#131320" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <LocaleProvider>
            <SettingsProvider>
              <TooltipProvider delayDuration={250}>
                <div className="flex min-h-screen flex-col">
                  <Navbar />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </div>
                <Toaster richColors position="bottom-right" />
              </TooltipProvider>
            </SettingsProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
