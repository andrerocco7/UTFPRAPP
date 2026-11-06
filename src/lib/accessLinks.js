import { createHash, randomBytes } from "node:crypto";

// Token do link de acesso: 32 bytes aleatórios em base64url (43 caracteres).
// No banco fica só o sha256 — quem lê o banco não consegue montar o link.
export function novoToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}
