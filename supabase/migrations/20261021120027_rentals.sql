-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0027 · Fase 4 · Rebanada C · Renta de toallas (y de lo que se preste)     ║
-- ║                                                                            ║
-- ║ UN PRÉSTAMO NO ES UNA VENTA. La toalla sale del anaquel pero sigue siendo  ║
-- ║ del gimnasio: se registra a quién se le dio, cuándo, y si volvió. Por eso  ║
-- ║ la renta mueve INVENTARIO (rental_out / rental_in) pero no toca la caja.   ║
-- ║                                                                            ║
-- ║ LA CUOTA, SI SE COBRA, VA POR EL POS. Un producto «Renta de toalla» con su ║
-- ║ precio se vende como cualquier otro y el dinero entra al turno por el      ║
-- ║ único camino que ya existe. Meter un cobro aquí abriría una segunda ruta   ║
-- ║ hacia la caja, que es justo lo que se ha evitado en todo el proyecto.      ║
-- ║ Por lo mismo NO hay depósito en garantía en esta rebanada: sería dinero    ║
-- ║ retenido fuera del arqueo.                                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table public.products
  add column is_rentable boolean not null default false;

comment on column public.products.is_rentable is
  'El artículo se presta (toallas, candados). Puede además venderse.';

-- ─────────────────────────────────────────────────────────────────────────────
-- El préstamo y la devolución son movimientos de inventario como cualquier otro.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.stock_movements
  drop constraint stock_movements_kind_check;

alter table public.stock_movements
  add constraint stock_movements_kind_check check (kind in (
    'purchase', 'sale', 'sale_return', 'adjustment', 'loss',
    'transfer_in', 'transfer_out',
    'rental_out',  -- salió prestada
    'rental_in'    -- volvió del préstamo
  ));

create or replace function public.stock_movement_sign(p_kind text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_kind
           when 'purchase'     then  1
           when 'sale_return'  then  1
           when 'transfer_in'  then  1
           when 'rental_in'    then  1
           when 'sale'         then -1
           when 'loss'         then -1
           when 'transfer_out' then -1
           when 'rental_out'   then -1
           else 0  -- 'adjustment' fija el saldo, no lo desplaza
         end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Préstamos.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.rentals (
  id          uuid primary key default extensions.gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  branch_id   uuid not null references public.branches (id) on delete restrict,
  product_id  uuid not null references public.products (id) on delete restrict,
  client_id   uuid not null references public.clients (id) on delete restrict,

  quantity    integer not null default 1 check (quantity > 0),
  rented_at   timestamptz not null default now(),
  -- Cuándo debería volver. La UI propone el cierre del día; NULL = sin plazo.
  due_at      timestamptz,

  returned_at timestamptz,
  returned_by uuid references auth.users (id) on delete set null,
  status      text not null default 'pending'
                check (status in ('pending', 'returned', 'lost')),

  notes       text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint rentals_closed_fields check (
    (status = 'pending'  and returned_at is null) or
    (status <> 'pending' and returned_at is not null)
  )
);

comment on table public.rentals is
  'Préstamos de artículos (toallas). El artículo sale del inventario pero '
  'sigue siendo del gimnasio: aquí se registra a quién y si volvió.';

create index rentals_org_status_idx on public.rentals (org_id, status, rented_at desc);
create index rentals_client_idx     on public.rentals (client_id, rented_at desc);
create index rentals_branch_idx     on public.rentals (branch_id, status);

create trigger trg_rentals_updated_at
  before update on public.rentals
  for each row execute function public.set_updated_at();

create trigger trg_audit_rentals
  after insert or update or delete on public.rentals
  for each row execute function public.audit_row();

-- ─────────────────────────────────────────────────────────────────────────────
-- rent_product: presta piezas a un socio y las descuenta del anaquel.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.rent_product(
  p_product   uuid,
  p_client    uuid,
  p_branch    uuid,
  p_quantity  integer default 1,
  p_due_hours integer default null,
  p_notes     text    default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_prod   public.products%rowtype;
  v_client public.clients%rowtype;
  v_id     uuid;
begin
  if coalesce(p_quantity, 0) <= 0 then
    raise exception 'La cantidad debe ser mayor a cero' using errcode = '22023';
  end if;

  select * into v_prod from public.products p where p.id = p_product;
  if not found then
    raise exception 'Producto no encontrado' using errcode = 'P0002';
  end if;
  if not v_prod.is_rentable then
    raise exception 'Ese artículo no está marcado como rentable' using errcode = 'P0001';
  end if;
  if not v_prod.is_active then
    raise exception 'Ese artículo no está disponible' using errcode = 'P0001';
  end if;

  -- RLS acota la búsqueda: un socio de otra organización no se resuelve.
  select * into v_client from public.clients c where c.id = p_client;
  if not found then
    raise exception 'Socio no encontrado' using errcode = 'P0002';
  end if;
  if not v_client.is_active then
    raise exception 'El socio está dado de baja' using errcode = 'P0001';
  end if;

  if not public.can_access_branch(p_branch) then
    raise exception 'No puedes operar esa sucursal' using errcode = '42501';
  end if;

  -- Sale del anaquel. Si no alcanza, revienta aquí y no se crea el préstamo:
  -- no se puede prestar lo que no se tiene.
  perform public.register_stock_movement(
    p_product, p_branch, 'rental_out', p_quantity, null,
    'Préstamo a ' || v_client.first_name || ' ' || v_client.last_name);

  insert into public.rentals (
    org_id, branch_id, product_id, client_id, quantity, due_at, notes, created_by
  ) values (
    v_prod.org_id, p_branch, p_product, p_client, p_quantity,
    case when p_due_hours is null then null
         else now() + make_interval(hours => p_due_hours) end,
    p_notes, (select auth.uid())
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.rent_product(uuid, uuid, uuid, integer, integer, text) is
  'Presta un artículo a un socio y lo descuenta del inventario de la sucursal.';

-- ─────────────────────────────────────────────────────────────────────────────
-- return_rental: cierra el préstamo. Si el artículo no volvió, se da por
-- perdido y sale como merma: el inventario ya no lo tiene y hay que reponerlo.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.return_rental(
  p_rental uuid,
  p_lost   boolean default false,
  p_notes  text    default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_r public.rentals%rowtype;
begin
  select * into v_r from public.rentals r where r.id = p_rental;
  if not found then
    raise exception 'Préstamo no encontrado' using errcode = 'P0002';
  end if;
  if v_r.status <> 'pending' then
    raise exception 'Ese préstamo ya está cerrado' using errcode = 'P0001';
  end if;

  if p_lost then
    -- No vuelve al anaquel: ya salió con rental_out. Se registra la merma para
    -- que la bitácora explique por qué la pieza dejó de existir.
    insert into public.stock_movements (
      org_id, product_id, branch_id, kind, quantity, notes, created_by
    ) values (
      v_r.org_id, v_r.product_id, v_r.branch_id, 'loss', v_r.quantity,
      coalesce(p_notes, 'Préstamo no devuelto'), (select auth.uid())
    );
  else
    perform public.register_stock_movement(
      v_r.product_id, v_r.branch_id, 'rental_in', v_r.quantity, null,
      coalesce(p_notes, 'Devolución de préstamo'));
  end if;

  update public.rentals
     set status      = case when p_lost then 'lost' else 'returned' end,
         returned_at = now(),
         returned_by = (select auth.uid()),
         notes       = coalesce(p_notes, notes)
   where id = p_rental;
end;
$$;

comment on function public.return_rental(uuid, boolean, text) is
  'Cierra un préstamo: devuelve la pieza al anaquel o la da por perdida (merma).';

-- ─────────────────────────────────────────────────────────────────────────────
-- Préstamos pendientes, con la señal de vencido para las alertas.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view public.pending_rentals
with (security_invoker = true) as
select r.id,
       r.org_id,
       r.branch_id,
       r.client_id,
       r.product_id,
       r.quantity,
       r.rented_at,
       r.due_at,
       p.name  as product_name,
       b.name  as branch_name,
       c.first_name,
       c.last_name,
       c.member_number,
       (r.due_at is not null and r.due_at < now()) as overdue,
       floor(extract(epoch from (now() - r.rented_at)) / 60)::integer as minutes_out
from public.rentals r
join public.products p on p.id = r.product_id
join public.branches b on b.id = r.branch_id
join public.clients  c on c.id = r.client_id
where r.status = 'pending';

comment on view public.pending_rentals is
  'Préstamos sin devolver, con el tiempo fuera y si ya pasaron de su plazo.';

grant select on public.pending_rentals to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS · rentals
--   Ver: miembros de la org, y el socio ve SUS préstamos desde el portal.
--   Escribir: staff de mostrador. Nada se borra.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.rentals enable row level security;

create policy "rentals: members read"
  on public.rentals for select to authenticated
  using (public.is_org_member(org_id));

create policy "rentals: portal client reads own"
  on public.rentals for select to authenticated
  using (client_id = public.current_client_id());

create policy "rentals: staff insert"
  on public.rentals for insert to authenticated
  with check (
    public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[])
  );

create policy "rentals: staff update"
  on public.rentals for update to authenticated
  using (
    public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[])
  )
  with check (
    public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[])
  );

revoke execute on function public.rent_product(uuid, uuid, uuid, integer, integer, text) from public, anon;
revoke execute on function public.return_rental(uuid, boolean, text)                     from public, anon;
grant  execute on function public.rent_product(uuid, uuid, uuid, integer, integer, text) to authenticated;
grant  execute on function public.return_rental(uuid, boolean, text)                     to authenticated;
