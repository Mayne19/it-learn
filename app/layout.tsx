import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import { Geist, Geist_Mono } from "next/font/google"
import { cn } from "@/lib/utils"

const fontSans = Geist({ subsets: ["latin"], variable: "--font-sans" })
const fontHeading = Geist({ subsets: ["latin"], variable: "--font-heading" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400"] })

export const metadata: Metadata = {
  title: "IT Lernen — Java & Langages dynamiques",
  description: "Plateforme de révision multi-cours (Java, Python, Perl, JavaScript) pour vos examens en Allemagne",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={cn(fontSans.variable, fontHeading.variable, fontMono.variable)}
    >
      <body className="min-h-screen bg-background text-foreground antialiased overscroll-none">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Header />
          <main className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
