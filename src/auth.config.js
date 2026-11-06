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
      // A politica de privacidade precisa abrir sem login: o Google exige uma
      // URL publica para liberar o app fora do modo de teste.
      // /entrar/<token> é a porta de entrada dos links de acesso da comissão
      // técnica: quem abre ainda não tem sessão.
      const isPublicPath =
        nextUrl.pathname === "/login" ||
        nextUrl.pathname === "/privacidade" ||
        nextUrl.pathname.startsWith("/api/auth") ||
        nextUrl.pathname.startsWith("/entrar/");
      if (isPublicPath) return true;
      return isLoggedIn;
    },
  },
};
