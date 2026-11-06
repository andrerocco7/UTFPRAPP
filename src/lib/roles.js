// Papéis:
// - admin: o técnico. Vê e faz tudo.
// - staff: comissão técnica que entra por link de acesso (sem conta Google).
//   Age como técnico, mas não vê dados sensíveis: e-mails, notas individuais
//   das atletas e o Financeiro; também não mexe na coordenação do financeiro
//   nem nos links de acesso.
// - athlete: a atleta (com a flag coordena, também vê o Financeiro da equipe).

// Telas e ações "de técnico" (treinos, escalação, arremessos de qualquer
// atleta...): admin ou staff.
export function isCoach(user) {
  return user?.role === "admin" || user?.role === "staff";
}
