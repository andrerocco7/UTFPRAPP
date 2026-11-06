import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { query } from "./lib/db";
import { hashToken } from "./lib/accessLinks";

const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

async function findPersonByEmail(email) {
  const { rows } = await query(
    "select id, nome, email, role, categoria, coordena from people where lower(email) = $1",
    [email.toLowerCase()]
  );
  return rows[0] || null;
}

async function linkValido(linkId) {
  const { rows } = await query(
    "select 1 from access_links where id = $1 and revogado_em is null and expira_em > now()",
    [linkId]
  );
  return rows.length > 0;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      // O Auth.js só infere credenciais das variáveis AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET.
      // Passamos explicitamente para usar os nomes documentados no .env.example.
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Restringe o consentimento do Google à conta institucional, quando configurado.
      authorization: {
        params: allowedDomains.length ? { hd: allowedDomains[0] } : {},
      },
    }),
    // Comissão técnica entrando por link de acesso (veja /acessos). Sem conta
    // Google: o token do link é a credencial.
    Credentials({
      id: "link",
      name: "Link de acesso",
      credentials: { token: {} },
      async authorize(credentials) {
        const token = String(credentials?.token || "");
        if (!token) return null;
        const { rows } = await query(
          `update access_links set ultimo_uso = now()
           where token_hash = $1 and revogado_em is null and expira_em > now()
           returning id, nome`,
          [hashToken(token)]
        );
        if (!rows.length) return null;
        return { id: `link-${rows[0].id}`, name: rows[0].nome, role: "staff", linkId: rows[0].id };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // O link já foi validado no authorize.
      if (account?.provider === "link") return true;

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
      if (user?.role === "staff") {
        token.role = "staff";
        token.linkId = user.linkId;
        token.nome = user.name;
        token.personId = null;
        token.categoria = null;
        token.coordena = false;
      } else if (user?.email) {
        const person = await findPersonByEmail(user.email);
        if (person) {
          token.personId = person.id;
          token.role = person.role;
          token.categoria = person.categoria;
          token.coordena = person.coordena;
          token.nome = person.nome;
        }
      }

      // Link revogado ou expirado derruba a sessão já na próxima requisição,
      // sem esperar o cookie expirar: devolver null faz auth() retornar vazio.
      if (token.role === "staff" && !(await linkValido(token.linkId))) return null;

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.personId = token.personId;
        session.user.role = token.role;
        session.user.categoria = token.categoria;
        session.user.coordena = token.coordena || false;
        session.user.nome = token.nome || session.user.name;
      }
      return session;
    },
  },
});
