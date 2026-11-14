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

// Link sem prazo tem expira_em null: vale até o técnico desativar.
const LINK_VIGENTE = "revogado_em is null and (expira_em is null or expira_em > now())";

async function linkValido(linkId) {
  const { rows } = await query(`select 1 from access_links where id = $1 and ${LINK_VIGENTE}`, [
    linkId,
  ]);
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
    // Link de acesso (veja /acessos), sem conta Google: o token do link é a
    // credencial. Link sem person_id é da comissão técnica (staff); com
    // person_id, é de uma atleta externa e entra como ela.
    Credentials({
      id: "link",
      name: "Link de acesso",
      credentials: { token: {} },
      async authorize(credentials) {
        const token = String(credentials?.token || "");
        if (!token) return null;
        const { rows } = await query(
          `update access_links set ultimo_uso = now()
           where token_hash = $1 and ${LINK_VIGENTE}
           returning id, nome, person_id`,
          [hashToken(token)]
        );
        const link = rows[0];
        if (!link) return null;

        if (link.person_id) {
          const { rows: p } = await query(
            "select id, nome, categoria, coordena from people where id = $1 and role = 'athlete'",
            [link.person_id]
          );
          if (!p.length) return null;
          return {
            id: `link-${link.id}`,
            name: p[0].nome,
            role: "athlete",
            linkId: link.id,
            personId: p[0].id,
            categoria: p[0].categoria,
            coordena: p[0].coordena,
          };
        }
        return { id: `link-${link.id}`, name: link.nome, role: "staff", linkId: link.id };
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
      if (user?.linkId) {
        token.role = user.role;
        token.linkId = user.linkId;
        token.nome = user.name;
        token.personId = user.personId ?? null;
        token.categoria = user.categoria ?? null;
        token.coordena = user.coordena ?? false;
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
      if (token.linkId && !(await linkValido(token.linkId))) return null;

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
