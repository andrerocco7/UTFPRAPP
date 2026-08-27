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
          <div className="flex min-h-dvh">
            <Sidebar user={session.user} />
            <main className="flex-1 px-6 py-7 md:px-9 md:py-8 max-w-5xl">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
