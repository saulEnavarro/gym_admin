-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0025 · Fase 4 · Rebanada A · Catálogo e inventario                        ║
-- ║                                                                            ║
-- ║ EL CATÁLOGO ES DE LA ORGANIZACIÓN, LAS EXISTENCIAS SON DE LA SUCURSAL.     ║
-- ║ Un producto (nombre, precio, SKU) se define una vez para todo el gimnasio, ║
-- ║ pero el inventario está en un anaquel concreto: si Centro tiene 3 y Norte  ║
-- ║ 0, Norte no puede vender. Una sola bolsa por organización diría «hay 3»    ║
-- ║ sin decir dónde, y cualquier sucursal vendería lo que no tiene enfrente.   ║
-- ║                                                                            ║
-- ║ SALDO Y LIBRO. `product_stock` guarda cuánto hay; `stock_movements` guarda ║
-- ║ cómo llegó a ser eso. Sin la bitácora, un descuadre de inventario no se     ║
-- ║ puede investigar — sólo se puede corregir a ciegas, que es como no tenerlo.║
-- ║                                                                            ║
-- ║ PRECIOS SIN IVA, igual que las membresías (§7). El producto además lleva   ║
-- ║ COSTO, que las membresías no tienen, para poder calcular utilidad.         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- Categorías (editables por organización; se siembran las del prompt).
-- ─────────────────────────────────────────────────────────────────────────────
create table public.product_categories (
  id         uuid primary key default extensions.gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  name       text not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);

comment on table public.product_categories is
  'Categorías de producto por organización (Bebidas, Proteínas, …). Editables.';

create index product_categories_org_idx on public.product_categories (org_id, sort_order);

create trigger trg_product_categories_updated_at
  before update on public.product_categories
  for each row execute function public.set_updated_at();

create trigger trg_audit_product_categories
  after insert or update or delete on public.product_categories
  for each row execute function public.audit_row();

/** Siembra las categorías del prompt en una organización. Idempotente. */
create or replace function public.seed_product_categories(p_org uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.product_categories (org_id, name, sort_order)
  values
    (p_org, 'Bebidas', 1),
    (p_org, 'Proteínas', 2),
    (p_org, 'Pre-entrenos', 3),
    (p_org, 'Suplementos', 4),
    (p_org, 'Ropa', 5),
    (p_org, 'Toallas', 6),
    (p_org, 'Accesorios', 7),
    (p_org, 'Otros', 8)
  on conflict (org_id, name) do nothing;
$$;

-- Las organizaciones nuevas nacen con su catálogo de categorías: si no, el
-- primer producto obligaría a inventar la taxonomía desde cero.
create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.org_branding (org_id, display_name)
  values (new.id, new.name)
  on conflict (org_id) do nothing;

  perform public.seed_product_categories(new.id);
  return new;
end;
$$;

-- Y las que ya existen también.
select public.seed_product_categories(o.id) from public.organizations o;

-- ─────────────────────────────────────────────────────────────────────────────
-- Productos (catálogo de la organización).
-- ─────────────────────────────────────────────────────────────────────────────
create table public.products (
  id          uuid primary key default extensions.gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  category_id uuid references public.product_categories (id) on delete set null,

  name        text not null,
  description text,
  sku         text,
  barcode     text,           -- se lee con el mismo lector del check-in
  photo_url   text,           -- ruta en bucket privado, nunca pública

  -- Ambos SIN IVA. `cost` alimenta la utilidad de los reportes (Rebanada D).
  cost        numeric(10, 2) not null default 0 check (cost  >= 0),
  price       numeric(10, 2) not null default 0 check (price >= 0),

  -- Servicios y productos a granel que no se cuentan pieza por pieza.
  track_stock boolean not null default true,

  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.products is
  'Catálogo de productos de la organización. Precios SIN IVA (§7).';
comment on column public.products.track_stock is
  'false = no se descuentan existencias (servicios, granel).';

-- SKU y código de barras únicos DENTRO de la organización: dos gimnasios
-- distintos pueden vender el mismo refresco con el mismo código.
create unique index products_org_sku_key
  on public.products (org_id, sku) where sku is not null;
create unique index products_org_barcode_key
  on public.products (org_id, barcode) where barcode is not null;

create index products_org_active_idx on public.products (org_id, is_active);
create index products_category_idx   on public.products (category_id);

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger trg_audit_products
  after insert or update or delete on public.products
  for each row execute function public.audit_row();

-- ─────────────────────────────────────────────────────────────────────────────
-- Existencias por sucursal (el SALDO).
-- ─────────────────────────────────────────────────────────────────────────────
create table public.product_stock (
  product_id   uuid not null references public.products (id) on delete cascade,
  branch_id    uuid not null references public.branches (id) on delete cascade,
  org_id       uuid not null references public.organizations (id) on delete cascade,
  quantity     integer not null default 0,
  -- Umbral de alerta. NULL = sin alerta para este producto en esta sucursal.
  min_quantity integer check (min_quantity is null or min_quantity >= 0),
  updated_at   timestamptz not null default now(),
  primary key (product_id, branch_id)
);

comment on table public.product_stock is
  'Existencias de un producto EN UNA SUCURSAL. El saldo; el libro es stock_movements.';

create index product_stock_org_idx    on public.product_stock (org_id);
create index product_stock_branch_idx on public.product_stock (branch_id);

create trigger trg_product_stock_updated_at
  before update on public.product_stock
  for each row execute function public.set_updated_at();

create trigger trg_audit_product_stock
  after insert or update or delete on public.product_stock
  for each row execute function public.audit_row();

-- ─────────────────────────────────────────────────────────────────────────────
-- Movimientos de inventario (el LIBRO). Append-only.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.stock_movements (
  id         uuid primary key default extensions.gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  branch_id  uuid not null references public.branches (id) on delete cascade,

  kind       text not null check (kind in (
               'purchase',    -- entrada por compra a proveedor
               'sale',        -- salida por venta en el POS (Rebanada B)
               'sale_return', -- reingreso por cancelación de una venta
               'adjustment',  -- ajuste tras conteo físico
               'loss',        -- merma, caducidad, robo
               'transfer_in',
               'transfer_out')),
  -- Siempre positiva: el signo lo da `kind`. Guardar negativos invita a que un
  -- error de signo pase inadvertido en un reporte.
  quantity   integer not null check (quantity > 0),
  -- Costo unitario de la entrada, para valuar el inventario (Rebanada D).
  unit_cost  numeric(10, 2) check (unit_cost is null or unit_cost >= 0),

  sale_id    uuid,   -- se ata a sales en la Rebanada B
  notes      text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.stock_movements is
  'Bitácora de inventario: explica cómo product_stock llegó a su saldo actual.';

create index stock_movements_product_idx on public.stock_movements (product_id, created_at desc);
create index stock_movements_org_idx     on public.stock_movements (org_id, created_at desc);
create index stock_movements_branch_idx  on public.stock_movements (branch_id, created_at desc);

create trigger trg_audit_stock_movements
  after insert or update or delete on public.stock_movements
  for each row execute function public.audit_row();

/** ¿Este tipo de movimiento suma o resta existencias? */
create or replace function public.stock_movement_sign(p_kind text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_kind
           when 'purchase'    then  1
           when 'sale_return' then  1
           when 'transfer_in' then  1
           when 'sale'        then -1
           when 'loss'        then -1
           when 'transfer_out' then -1
           else 0  -- 'adjustment' fija el saldo, no lo desplaza
         end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- register_stock_movement: escribe el libro y actualiza el saldo, atómicamente.
--   SECURITY INVOKER → pasa por RLS con la identidad de quien lo hace.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.register_stock_movement(
  p_product   uuid,
  p_branch    uuid,
  p_kind      text,
  p_quantity  integer,
  p_unit_cost numeric default null,
  p_notes     text    default null,
  p_sale      uuid    default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_org     uuid;
  v_track   boolean;
  v_sign    integer;
  v_current integer;
  v_new     integer;
  v_id      uuid;
begin
  if coalesce(p_quantity, 0) <= 0 then
    raise exception 'La cantidad debe ser mayor a cero' using errcode = '22023';
  end if;

  select p.org_id, p.track_stock into v_org, v_track
  from public.products p where p.id = p_product;
  if not found then
    raise exception 'Producto no encontrado' using errcode = 'P0002';
  end if;
  if not v_track then
    raise exception 'Este producto no lleva control de existencias' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.branches b where b.id = p_branch and b.org_id = v_org
  ) then
    raise exception 'La sucursal no pertenece a esta organización' using errcode = '42501';
  end if;
  if not public.can_access_branch(p_branch) then
    raise exception 'No puedes operar esa sucursal' using errcode = '42501';
  end if;

  v_sign := public.stock_movement_sign(p_kind);
  if v_sign = 0 and p_kind <> 'adjustment' then
    raise exception 'Tipo de movimiento inválido' using errcode = '22023';
  end if;

  -- Se bloquea el renglón del saldo: dos cajas vendiendo la última pieza a la
  -- vez no pueden dejar el inventario en −1.
  insert into public.product_stock (product_id, branch_id, org_id, quantity)
  values (p_product, p_branch, v_org, 0)
  on conflict (product_id, branch_id) do nothing;

  select ps.quantity into v_current
  from public.product_stock ps
  where ps.product_id = p_product and ps.branch_id = p_branch
  for update;

  if p_kind = 'adjustment' then
    -- El ajuste FIJA el saldo al conteo físico; la cantidad es el resultado.
    v_new := p_quantity;
  else
    v_new := v_current + (v_sign * p_quantity);
  end if;

  if v_new < 0 then
    raise exception 'No hay existencias suficientes: quedan % y se intentan sacar %',
      v_current, p_quantity using errcode = 'P0001';
  end if;

  update public.product_stock
     set quantity = v_new
   where product_id = p_product and branch_id = p_branch;

  insert into public.stock_movements (
    org_id, product_id, branch_id, kind, quantity, unit_cost, sale_id, notes, created_by
  ) values (
    v_org, p_product, p_branch, p_kind,
    -- En un ajuste se guarda la DIFERENCIA aplicada, no el conteo: el libro
    -- tiene que explicar el desplazamiento del saldo.
    case when p_kind = 'adjustment' then abs(p_quantity - v_current) else p_quantity end,
    p_unit_cost, p_sale,
    case when p_kind = 'adjustment' then
      coalesce(p_notes, '') || ' (conteo físico: ' || p_quantity || ', antes ' || v_current || ')'
    else p_notes end,
    (select auth.uid())
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.register_stock_movement(uuid, uuid, text, integer, numeric, text, uuid) is
  'Registra un movimiento de inventario y actualiza el saldo de la sucursal.';

-- ─────────────────────────────────────────────────────────────────────────────
-- transfer_stock: mover piezas entre sucursales sin que se pierdan en el aire.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.transfer_stock(
  p_product uuid,
  p_from    uuid,
  p_to      uuid,
  p_quantity integer,
  p_notes   text default null
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_from = p_to then
    raise exception 'El origen y el destino deben ser distintos' using errcode = '22023';
  end if;

  -- La salida primero: si no alcanza, revienta aquí y no se crea la entrada.
  perform public.register_stock_movement(
    p_product, p_from, 'transfer_out', p_quantity, null,
    coalesce(p_notes, 'Traspaso entre sucursales'));
  perform public.register_stock_movement(
    p_product, p_to, 'transfer_in', p_quantity, null,
    coalesce(p_notes, 'Traspaso entre sucursales'));
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Productos con existencias por debajo de su mínimo (alertas del panel).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view public.low_stock_products
with (security_invoker = true) as
select ps.org_id,
       ps.product_id,
       ps.branch_id,
       p.name        as product_name,
       p.sku,
       b.name        as branch_name,
       ps.quantity,
       ps.min_quantity
from public.product_stock ps
join public.products p on p.id = ps.product_id
join public.branches b on b.id = ps.branch_id
where p.is_active
  and p.track_stock
  and ps.min_quantity is not null
  and ps.quantity <= ps.min_quantity;

comment on view public.low_stock_products is
  'Existencias en o por debajo del mínimo, por sucursal. Alimenta las alertas.';

grant select on public.low_stock_products to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
--   Catálogo (categorías, productos): leen los miembros —recepción necesita
--   verlo para vender—, escriben admin y gerente: es configuración.
--   Existencias y movimientos: los toca también recepción, que es quien recibe
--   la mercancía y hace los conteos. Nada se borra del libro.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.product_categories enable row level security;
alter table public.products           enable row level security;
alter table public.product_stock      enable row level security;
alter table public.stock_movements    enable row level security;

create policy "product_categories: members read"
  on public.product_categories for select to authenticated
  using (public.is_org_member(org_id));

create policy "product_categories: managers write"
  on public.product_categories for all to authenticated
  using (public.has_role_in_org(org_id, array['admin','manager']::public.app_role[]))
  with check (public.has_role_in_org(org_id, array['admin','manager']::public.app_role[]));

create policy "products: members read"
  on public.products for select to authenticated
  using (public.is_org_member(org_id));

create policy "products: managers write"
  on public.products for all to authenticated
  using (public.has_role_in_org(org_id, array['admin','manager']::public.app_role[]))
  with check (public.has_role_in_org(org_id, array['admin','manager']::public.app_role[]));

create policy "product_stock: members read"
  on public.product_stock for select to authenticated
  using (public.is_org_member(org_id));

create policy "product_stock: staff write"
  on public.product_stock for all to authenticated
  using (public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[]))
  with check (public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[]));

create policy "stock_movements: members read"
  on public.stock_movements for select to authenticated
  using (public.is_org_member(org_id));

create policy "stock_movements: staff insert"
  on public.stock_movements for insert to authenticated
  with check (
    public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[])
  );

revoke execute on function public.register_stock_movement(uuid, uuid, text, integer, numeric, text, uuid) from public, anon;
revoke execute on function public.transfer_stock(uuid, uuid, uuid, integer, text)                          from public, anon;
revoke execute on function public.seed_product_categories(uuid)                                            from public, anon;

grant execute on function public.register_stock_movement(uuid, uuid, text, integer, numeric, text, uuid) to authenticated;
grant execute on function public.transfer_stock(uuid, uuid, uuid, integer, text)                          to authenticated;
grant execute on function public.seed_product_categories(uuid)                                            to service_role;
