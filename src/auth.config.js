// Configuração "edge-safe": usada pelo middleware, sem acesso a banco de dados.
// A configuração completa (com Google + consultas ao Postgres) fica em src/auth.js.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublicPath =
        nextUrl.pathname === "/login" || nextUrl.pathname.startsWith("/api/auth");
      if (isPublicPath) return true;
      return isLoggedIn;
    },
  },
};
