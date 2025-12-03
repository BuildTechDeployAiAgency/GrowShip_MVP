Shipments Table

create table public.shipments (
id uuid not null default gen_random_uuid (),
shipment_number character varying not null,
order_id uuid null,
po_id uuid null,
user_id uuid null,
brand_id uuid not null,
carrier character varying null,
tracking_number character varying null,
shipping_method character varying null,
shipping_cost numeric null default 0,
shipping_address_line1 character varying null,
shipping_address_line2 character varying null,
shipping_city character varying null,
shipping_state character varying null,
shipping_zip_code character varying null,
shipping_country character varying null,
shipped_date timestamp with time zone null,
estimated_delivery_date timestamp with time zone null,
actual_delivery_date timestamp with time zone null,
shipment_status public.shipment_status null default 'pending'::shipment_status,
notes text null,
created_at timestamp with time zone null default now(),
updated_at timestamp with time zone null default now(),
created_by uuid null,
updated_by uuid null,
distributor_id uuid null,
constraint shipments_pkey primary key (id),
constraint shipments_tracking_number_key unique (tracking_number),
constraint shipments_shipment_number_key unique (shipment_number),
constraint shipments_order_id_fkey foreign KEY (order_id) references orders (id),
constraint shipments_po_id_fkey foreign KEY (po_id) references purchase_orders (id),
constraint shipments_updated_by_fkey foreign KEY (updated_by) references auth.users (id),
constraint shipments_brand_id_fkey foreign KEY (brand_id) references brands (id) on delete CASCADE,
constraint shipments_user_id_fkey foreign KEY (user_id) references auth.users (id),
constraint shipments_created_by_fkey foreign KEY (created_by) references auth.users (id),
constraint shipments_distributor_id_fkey foreign KEY (distributor_id) references distributors (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_shipments_order_id on public.shipments using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_shipments_po_id on public.shipments using btree (po_id) TABLESPACE pg_default;

create index IF not exists idx_shipments_tracking_number on public.shipments using btree (tracking_number) TABLESPACE pg_default;

create index IF not exists idx_shipments_status on public.shipments using btree (shipment_status) TABLESPACE pg_default;

create index IF not exists idx_shipments_organization_id on public.shipments using btree (brand_id) TABLESPACE pg_default;

create index IF not exists idx_shipments_user_id on public.shipments using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_shipments_brand_id on public.shipments using btree (brand_id) TABLESPACE pg_default;

create index IF not exists idx_shipments_distributor_id on public.shipments using btree (distributor_id) TABLESPACE pg_default;

create index IF not exists idx_shipments_brand_distributor on public.shipments using btree (brand_id, distributor_id) TABLESPACE pg_default;

create trigger trigger_populate_shipment_distributor_id BEFORE INSERT
or
update on shipments for EACH row
execute FUNCTION populate_shipment_distributor_id ();

Order Table

create table public.orders (
id uuid not null default gen_random_uuid (),
order_number character varying(100) not null,
order_date timestamp with time zone not null,
user_id uuid not null,
brand_id uuid not null,
customer_id character varying(100) null,
customer_name character varying(255) not null,
customer_email character varying(255) null,
customer_phone character varying(50) null,
customer_type public.customer_type null,
items jsonb not null,
shipping_address_line1 character varying(255) null,
shipping_address_line2 character varying(255) null,
shipping_city character varying(100) null,
shipping_state character varying(100) null,
shipping_zip_code character varying(20) null,
shipping_country character varying(100) null,
shipping_method character varying(100) null,
tracking_number character varying(100) null,
estimated_delivery_date timestamp with time zone null,
actual_delivery_date timestamp with time zone null,
subtotal numeric(15, 2) not null,
discount_total numeric(15, 2) null default 0.00,
tax_total numeric(15, 2) null default 0.00,
shipping_cost numeric(15, 2) null default 0.00,
total_amount numeric(15, 2) not null,
currency character varying(3) null default 'USD'::character varying,
payment_method character varying(50) null,
payment_status public.payment_status null default 'pending'::payment_status,
order_status public.order_status null default 'pending'::order_status,
notes text null,
tags text[] null,
created_at timestamp with time zone null default now(),
updated_at timestamp with time zone null default now(),
created_by uuid null,
updated_by uuid null,
distributor_id uuid null,
purchase_order_id uuid null,
constraint orders_pkey primary key (id),
constraint orders_order_number_key unique (order_number),
constraint orders_distributor_id_fkey foreign KEY (distributor_id) references distributors (id) on delete set null,
constraint orders_purchase_order_id_fkey foreign KEY (purchase_order_id) references purchase_orders (id) on delete set null,
constraint orders_updated_by_fkey foreign KEY (updated_by) references auth.users (id),
constraint orders_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
constraint orders_brand_id_fkey foreign KEY (brand_id) references brands (id) on delete CASCADE,
constraint orders_created_by_fkey foreign KEY (created_by) references auth.users (id),
constraint valid_items check ((jsonb_array_length(items) > 0)),
constraint valid_subtotal check ((subtotal >= (0)::numeric)),
constraint valid_total check ((total_amount >= (0)::numeric))
) TABLESPACE pg_default;

create index IF not exists idx_orders_user_id on public.orders using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_orders_organization_id on public.orders using btree (brand_id) TABLESPACE pg_default;

create index IF not exists idx_orders_order_number on public.orders using btree (order_number) TABLESPACE pg_default;

create index IF not exists idx_orders_customer_id on public.orders using btree (customer_id) TABLESPACE pg_default;

create index IF not exists idx_orders_customer_name on public.orders using btree (customer_name) TABLESPACE pg_default;

create index IF not exists idx_orders_order_date on public.orders using btree (order_date desc) TABLESPACE pg_default;

create index IF not exists idx_orders_order_status on public.orders using btree (order_status) TABLESPACE pg_default;

create index IF not exists idx_orders_payment_status on public.orders using btree (payment_status) TABLESPACE pg_default;

create index IF not exists idx_orders_created_at on public.orders using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_orders_total_amount on public.orders using btree (total_amount) TABLESPACE pg_default;

create index IF not exists idx_orders_user_org on public.orders using btree (user_id, brand_id) TABLESPACE pg_default;

create index IF not exists idx_orders_org_status on public.orders using btree (brand_id, order_status) TABLESPACE pg_default;

create index IF not exists idx_orders_org_date on public.orders using btree (brand_id, order_date desc) TABLESPACE pg_default;

create index IF not exists idx_orders_items on public.orders using gin (items) TABLESPACE pg_default;

create index IF not exists idx_orders_tags on public.orders using gin (tags) TABLESPACE pg_default;

create index IF not exists idx_orders_search on public.orders using gin (
to_tsvector(
'english'::regconfig,
(
(
(
(
(COALESCE(order_number, ''::character varying))::text || ' '::text
) || (COALESCE(customer_name, ''::character varying))::text
) || ' '::text
) || COALESCE(notes, ''::text)
)
)
) TABLESPACE pg_default;

create index IF not exists idx_orders_brand_id on public.orders using btree (brand_id) TABLESPACE pg_default;

create index IF not exists idx_orders_distributor_id on public.orders using btree (distributor_id) TABLESPACE pg_default;

create index IF not exists idx_orders_brand_distributor on public.orders using btree (brand_id, distributor_id) TABLESPACE pg_default;

create index IF not exists idx_orders_distributor_date on public.orders using btree (distributor_id, order_date) TABLESPACE pg_default;

create index IF not exists idx_orders_purchase_order_id on public.orders using btree (purchase_order_id) TABLESPACE pg_default;

create index IF not exists idx_orders_po_brand_distributor on public.orders using btree (purchase_order_id, brand_id, distributor_id) TABLESPACE pg_default;

create index IF not exists idx_orders_po_date on public.orders using btree (purchase_order_id, order_date) TABLESPACE pg_default;

create index IF not exists idx_orders_brand_distributor_date on public.orders using btree (brand_id, distributor_id, order_date desc) TABLESPACE pg_default;

create trigger order_history_trigger
after
update on orders for EACH row when (
old.order_status is distinct from new.order_status
or old.payment_status is distinct from new.payment_status
or old.estimated_delivery_date is distinct from new.estimated_delivery_date
or old.actual_delivery_date is distinct from new.actual_delivery_date
or old.tracking_number::text is distinct from new.tracking_number::text
)
execute FUNCTION log_order_change ();

create trigger trigger_orders_updated_at BEFORE
update on orders for EACH row
execute FUNCTION update_orders_updated_at ();

create trigger validate_order_purchase_order_trigger BEFORE INSERT
or
update OF purchase_order_id,
brand_id,
distributor_id on orders for EACH row
execute FUNCTION validate_order_purchase_order ();

Purchase Order table

create table public.purchase_orders (
id uuid not null default gen_random_uuid (),
po_number character varying not null,
po_date timestamp with time zone not null,
user_id uuid null,
brand_id uuid not null,
supplier_id character varying null,
supplier_name character varying not null,
supplier_email character varying null,
supplier_phone character varying null,
items jsonb not null,
subtotal numeric null,
tax_total numeric null default 0,
shipping_cost numeric null default 0,
total_amount numeric null,
currency character varying null default 'USD'::character varying,
po_status public.po_status null default 'draft'::po_status,
payment_status public.payment_status null default 'pending'::payment_status,
expected_delivery_date timestamp with time zone null,
actual_delivery_date timestamp with time zone null,
notes text null,
tags text[] null,
created_at timestamp with time zone null default now(),
updated_at timestamp with time zone null default now(),
created_by uuid null,
updated_by uuid null,
distributor_id uuid null,
submitted_at timestamp with time zone null,
approved_at timestamp with time zone null,
approved_by uuid null,
rejection_reason text null,
approval_workflow_id uuid null,
constraint purchase_orders_pkey primary key (id),
constraint purchase_orders_po_number_key unique (po_number),
constraint purchase_orders_created_by_fkey foreign KEY (created_by) references auth.users (id),
constraint purchase_orders_distributor_id_fkey foreign KEY (distributor_id) references distributors (id) on delete set null,
constraint purchase_orders_user_id_fkey foreign KEY (user_id) references auth.users (id),
constraint purchase_orders_brand_id_fkey foreign KEY (brand_id) references brands (id) on delete CASCADE,
constraint purchase_orders_updated_by_fkey foreign KEY (updated_by) references auth.users (id),
constraint purchase_orders_approved_by_fkey foreign KEY (approved_by) references auth.users (id),
constraint purchase_orders_total_amount_check check ((total_amount >= (0)::numeric)),
constraint purchase_orders_items_check check ((jsonb_array_length(items) > 0)),
constraint purchase_orders_subtotal_check check ((subtotal >= (0)::numeric))
) TABLESPACE pg_default;

create index IF not exists idx_po_organization_id on public.purchase_orders using btree (brand_id) TABLESPACE pg_default;

create index IF not exists idx_po_po_date on public.purchase_orders using btree (po_date) TABLESPACE pg_default;

create index IF not exists idx_po_status on public.purchase_orders using btree (po_status) TABLESPACE pg_default;

create index IF not exists idx_po_user_id on public.purchase_orders using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_brand_id on public.purchase_orders using btree (brand_id) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_distributor_id on public.purchase_orders using btree (distributor_id) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_brand_distributor on public.purchase_orders using btree (brand_id, distributor_id) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_distributor_date on public.purchase_orders using btree (distributor_id, po_date) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_brand_distributor_date on public.purchase_orders using btree (brand_id, distributor_id, po_date desc) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_submitted_at on public.purchase_orders using btree (submitted_at) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_approved_at on public.purchase_orders using btree (approved_at) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_approved_by on public.purchase_orders using btree (approved_by) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_expected_delivery_date on public.purchase_orders using btree (expected_delivery_date) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_po_status on public.purchase_orders using btree (po_status) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_payment_status on public.purchase_orders using btree (payment_status) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_brand_status_payment_date on public.purchase_orders using btree (brand_id, po_status, payment_status, po_date desc) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_dist_status_payment_date on public.purchase_orders using btree (
distributor_id,
po_status,
payment_status,
po_date desc
) TABLESPACE pg_default
where
(distributor_id is not null);

create index IF not exists idx_purchase_orders_po_number_trgm on public.purchase_orders using gin (po_number gin_trgm_ops) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_supplier_name_trgm on public.purchase_orders using gin (supplier_name gin_trgm_ops) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_supplier_email_trgm on public.purchase_orders using gin (supplier_email gin_trgm_ops) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_active_pos on public.purchase_orders using btree (brand_id, po_date desc) TABLESPACE pg_default
where
(
po_status <> all (
array['cancelled'::po_status, 'rejected'::po_status]
)
);

create index IF not exists idx_purchase_orders_pending_payment on public.purchase_orders using btree (brand_id, po_date desc) TABLESPACE pg_default
where
(payment_status = 'pending'::payment_status);
