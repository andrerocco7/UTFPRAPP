import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { query } from "./lib/db";

const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

async function findPersonByEmail(email) {
  const { rows } = await query(
    "select id, nome, email, role, categoria from people where lower(email) = $1",
    [email.toLowerCase()]
  );
  return rows[0] || null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      // Restringe o consentimento do Google à conta institucional, quando configurado.
      authorization: {
        params: allowedDomains.length ? { hd: allowedDomains[0] } : {},
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      const email = (user.email || "").toLowerCase();
      if (!email) return false;

      if (allowedDomains.length && !allowedDomains.some((d) => email.endsWith("@" + d))) {
        // Domínio fora da universidade — recusa o login.
        return "/login?erro=dominio";
      }

      const person = await findPersonByEmail(email);
      if (!person) {
        // E-mail válido, mas não cadastrado pelo técnico como atleta/admin.
        return "/login?erro=nao-cadastrado";
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const person = await findPersonByEmail(user.email);
        if (person) {
          token.personId = person.id;
          token.role = person.role;
          token.categoria = person.categoria;
          token.nome = person.nome;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.personId = token.personId;
        session.user.role = token.role;
        session.user.categoria = token.categoria;
        session.user.nome = token.nome || session.user.name;
      }
      return session;
    },
  },
});
