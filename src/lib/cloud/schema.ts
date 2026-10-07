// Script SQL que el cliente ejecuta una sola vez en el SQL Editor de SU proyecto de Supabase.
// Diseño genérico (una tabla jsonb para todo): las versiones nuevas de BarOS (tablas o campos nuevos)
// no requieren volver a tocar la base de cada cliente.

export const CLOUD_SCHEMA_VERSION = 1;

const sqlString = (s: string) => `'${s.replace(/'/g, "''")}'`;

export const buildSchemaSql = (memberEmail: string) => `-- =====================================================================
-- LYNX BarOS · Réplica en la nube (Supabase) · esquema v${CLOUD_SCHEMA_VERSION}
-- Ejecutar UNA vez en: Supabase → SQL Editor → New query → pegar → Run.
-- Se puede volver a ejecutar sin perder datos.
-- =====================================================================

-- Datos replicados desde la PC principal del bar (una fila por registro)
create table if not exists public.lynx_records (
  table_name  text        not null,
  record_id   text        not null,
  data        jsonb,
  deleted     boolean     not null default false,
  updated_at  timestamptz not null,
  synced_at   timestamptz not null default now(),
  sync_run    text,
  primary key (table_name, record_id)
);
create index if not exists lynx_records_table_updated on public.lynx_records (table_name, updated_at desc);

-- Metadatos (versión del esquema, última sincronización)
create table if not exists public.lynx_meta (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz not null default now()
);

-- Usuarios habilitados: SOLO estos mails pueden leer o escribir los datos del bar
create table if not exists public.lynx_members (
  email      text primary key,
  created_at timestamptz not null default now()
);

create or replace function public.lynx_is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.lynx_members
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

alter table public.lynx_records enable row level security;
alter table public.lynx_meta    enable row level security;
alter table public.lynx_members enable row level security;  -- sin políticas: nadie la toca por la API

drop policy if exists lynx_records_members on public.lynx_records;
create policy lynx_records_members on public.lynx_records
  for all to authenticated using (public.lynx_is_member()) with check (public.lynx_is_member());

drop policy if exists lynx_meta_members on public.lynx_meta;
create policy lynx_meta_members on public.lynx_meta
  for all to authenticated using (public.lynx_is_member()) with check (public.lynx_is_member());

revoke all on public.lynx_records, public.lynx_meta, public.lynx_members from anon;
grant select, insert, update, delete on public.lynx_records, public.lynx_meta to authenticated;

insert into public.lynx_members (email) values (${sqlString(memberEmail.trim().toLowerCase())})
  on conflict (email) do nothing;

insert into public.lynx_meta (key, value) values ('schema_version', '${CLOUD_SCHEMA_VERSION}'::jsonb)
  on conflict (key) do update set value = excluded.value, updated_at = now();

-- Vistas de consulta (respetan los permisos de quien consulta)
create or replace view public.lynx_ventas with (security_invoker = true) as
  select record_id,
         (data ->> 'timestamp')::timestamptz as fecha,
         data ->> 'tableId'                 as mesa,
         (data ->> 'total')::numeric        as total,
         (data ->> 'tip')::numeric          as propina,
         data ->> 'paymentMethod'           as medio_pago,
         data ->> 'customerId'              as dni_cliente,
         data ->> 'closedBy'                as cobrado_por
  from public.lynx_records
  where table_name = 'orders' and not deleted;

create or replace view public.lynx_recargas_vasos with (security_invoker = true) as
  select record_id,
         (data ->> 'timestamp')::timestamptz as fecha,
         data ->> 'mugCode'                  as vaso,
         data ->> 'ownerDni'                 as dni_cliente,
         data ->> 'productName'              as cerveza,
         (data ->> 'volumeMl')::numeric / 1000 as litros,
         (data ->> 'amount')::numeric        as monto,
         (data ->> 'points')::int            as puntos
  from public.lynx_records
  where table_name = 'mugFills' and not deleted;

revoke all on public.lynx_ventas, public.lynx_recargas_vasos from anon;
`;
