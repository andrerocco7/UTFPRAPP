-- Esquema do painel de basquete UTFPR

create table if not exists people (
  id serial primary key,
  nome text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'athlete')),
  categoria text check (categoria in ('F', 'M')),
  curso text default '',
  posicao text default '',
  status text not null default 'ativo' check (status in ('ativo', 'observacao', 'lesionado', 'afastado')),
  -- Coordenacao nao e um papel: e uma atleta que tambem organiza o financeiro
  -- da propria equipe. Ela continua jogando, escalando e treinando normalmente.
  coordena boolean not null default false,
  criado_em timestamptz not null default now()
);

create table if not exists notes (
  id serial primary key,
  person_id integer not null references people(id) on delete cascade,
  texto text not null,
  criado_em timestamptz not null default now()
);

create table if not exists competitions (
  id text primary key,
  nome text not null,
  periodo text default '',
  regras text default '',
  historico_f text default '',
  historico_m text default ''
);

create table if not exists trainings (
  categoria text not null check (categoria in ('F', 'M')),
  dia text not null,
  rotina text default '',
  video_url text default '',
  primary key (categoria, dia)
);

-- Diario de treinos: um registro por data de treino (nao por dia da semana),
-- com o que rolou naquela sessao especifica. Visivel para as atletas da
-- equipe, para dar continuidade quando alguem falta.
create table if not exists training_logs (
  id serial primary key,
  categoria text not null check (categoria in ('F', 'M')),
  data date not null default current_date,
  texto text not null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_training_logs_categoria_data on training_logs (categoria, data desc);

create table if not exists squads (
  id serial primary key,
  competition_id text not null references competitions(id),
  categoria text not null check (categoria in ('F', 'M')),
  ano integer not null,
  criado_em timestamptz not null default now()
);

create table if not exists squad_members (
  squad_id integer not null references squads(id) on delete cascade,
  person_id integer not null references people(id) on delete cascade,
  convocado boolean not null default false,
  motivo_corte text default '',
  primary key (squad_id, person_id)
);

create table if not exists plays (
  id serial primary key,
  nome text not null,
  categoria text not null check (categoria in ('F', 'M', 'ambos')),
  situacao text default '',
  descricao text default '',
  video_url text default '',
  criado_em timestamptz not null default now()
);

insert into competitions (id, nome, periodo, regras, historico_f, historico_m) values
  ('ep', 'Engenhariadas Paranaense', 'Geralmente no feriado de Corpus Christi',
   'Somente atletas da Atlética Avalanche (cursos de engenharia, arquitetura e BSI).',
   'Atual bicampeão.',
   'Campeão em 2023; sem título desde então. Em 2026, eliminado na 1ª rodada do mata-mata.'),
  ('jups', 'JUPS — Jogos Universitários do Paraná', 'A definir',
   'Aberta a todos os alunos representando a UTFPR. Limite de 25 anos, com 2 vagas (de 12) para atletas acima da idade que ainda são alunos. Nível técnico mais alto entre as 3 competições. Campeão estadual garante vaga no nacional.',
   '2º lugar na chave ouro em 2026.',
   'Campeão da série prata em 2026 (retorno à série ouro); caiu para a série prata no ano anterior.'),
  ('joia', 'JOIA', 'Incerta para 2026, mas historicamente sempre esteve no calendário',
   '',
   'Bicampeão.',
   'Eliminado nas semifinais em 2025.')
on conflict (id) do nothing;

insert into trainings (categoria, dia, rotina) values
  ('F', 'segunda', ''), ('F', 'quarta', ''), ('F', 'sabado', ''),
  ('M', 'segunda', ''), ('M', 'sexta', '')
on conflict (categoria, dia) do nothing;

-- Treinos de arremesso: cada linha de shooting_sets e uma serie lancada
-- (ex: "7 de 10 do lance livre"), para permitir ver evolucao dentro do
-- treino e ao longo das semanas.
create table if not exists shooting_sessions (
  id serial primary key,
  data date not null default current_date,
  categoria text not null check (categoria in ('F', 'M')),
  criado_em timestamptz not null default now(),
  unique (data, categoria)
);

create table if not exists shooting_sets (
  id serial primary key,
  session_id integer not null references shooting_sessions(id) on delete cascade,
  person_id integer not null references people(id) on delete cascade,
  spot text not null,
  tentativas integer not null check (tentativas > 0),
  acertos integer not null check (acertos >= 0),
  criado_em timestamptz not null default now(),
  constraint acertos_ate_tentativas check (acertos <= tentativas)
);

create index if not exists idx_shooting_sets_person on shooting_sets (person_id);
create index if not exists idx_shooting_sets_session on shooting_sets (session_id);

-- Coordenacao do financeiro: flag numa atleta ja cadastrada, nao um papel.
-- A atleta marcada enxerga o Financeiro so da propria equipe (coluna categoria);
-- o tecnico (admin) enxerga as duas. Migra qualquer 'coordinator' antigo de volta
-- para 'athlete' com a flag ligada.
alter table people add column if not exists coordena boolean not null default false;
update people set coordena = true, role = 'athlete' where role = 'coordinator';
alter table people drop constraint if exists people_role_check;
alter table people add constraint people_role_check
  check (role in ('admin', 'athlete'));

-- Financeiro. Valores sempre em centavos (integer) — nunca float, para nao
-- acumular erro de arredondamento em soma de dinheiro.
create table if not exists finance_charges (
  id serial primary key,
  titulo text not null,
  categoria text not null check (categoria in ('F', 'M', 'ambos')),
  valor_centavos integer not null check (valor_centavos > 0),
  vencimento date,
  criado_em timestamptz not null default now()
);

create table if not exists finance_payments (
  charge_id integer not null references finance_charges(id) on delete cascade,
  person_id integer not null references people(id) on delete cascade,
  pago_em date not null default current_date,
  primary key (charge_id, person_id)
);

create table if not exists finance_expenses (
  id serial primary key,
  descricao text not null,
  categoria text not null check (categoria in ('F', 'M', 'ambos')),
  tipo text not null default 'outro'
    check (tipo in ('inscricao', 'transporte', 'arbitragem', 'material', 'alimentacao', 'outro')),
  valor_centavos integer not null check (valor_centavos > 0),
  data date not null default current_date,
  criado_em timestamptz not null default now()
);

create index if not exists idx_finance_payments_charge on finance_payments (charge_id);
