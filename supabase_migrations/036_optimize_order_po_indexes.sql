-- Improve filtering performance for high-volume list views
create index if not exists idx_orders_brand_distributor_date
  on orders(brand_id, distributor_id, order_date desc);

create index if not exists idx_purchase_orders_brand_distributor_date
  on purchase_orders(brand_id, distributor_id, po_date desc);

create index if not exists idx_products_brand_status_category
  on products(brand_id, status, product_category);

