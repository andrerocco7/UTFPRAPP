import { Oswald, Work_Sans } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import Sidebar from "@/components/Sidebar";

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const workSans = Work_Sans({
  variable: "--font-worksans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata = {
  title: "Basquete UTFPR",
  description: "Painel do técnico — atletas, treinos, competições e jogadas.",
};

export default async function RootLayout({ children }) {
  const session = await auth();

  return (
    <html lang="pt-BR" className={`${oswald.variable} ${workSans.variable}`}>
      <body>
        {session?.user ? (
          <div className="flex flex-col md:flex-row min-h-dvh">
            <Sidebar user={session.user} />
            <main className="flex-1 min-w-0 px-4 py-6 md:px-9 md:py-8 max-w-5xl">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
