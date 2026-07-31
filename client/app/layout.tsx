import { Alex_Brush, Geist_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";

// Century Gothic is a licensed font (Monotype / MS Office) and isn't
// distributable via next/font/google. It's applied as a system font stack
// in globals.css (--font-sans) instead, so no font object is loaded here.

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

// Cursive script used only for the DocuSign-style signature stamp
// (components/ui/signature-stamp.tsx) — see that file for the rest of the
// stamp styling.
const fontSignature = Alex_Brush({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-signature",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, fontSignature.variable, "font-sans")}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
