-- ============================================================
-- COFFEE SHOP SYSTEM — DATABASE SCHEMA (PostgreSQL)
-- ============================================================

-- ENUM TYPES
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'manager', 'cashier', 'barista', 'stock_clerk');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE order_type AS ENUM ('dine_in', 'takeout', 'delivery', 'qr_dine_in');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending_payment', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'card', 'gcash', 'maya', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'refunded', 'partially_refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE stock_movement_type AS ENUM ('stock_in', 'stock_out', 'adjustment', 'waste');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE po_status AS ENUM ('draft', 'ordered', 'received', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE cash_movement_type AS ENUM ('cash_in', 'cash_out');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- BRANCHES
CREATE TABLE IF NOT EXISTS branches (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  address         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_main         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration for existing databases: add is_main column to branches
DO $$ BEGIN
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS is_main BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Ensure there is always a main branch: promote the oldest branch if none is marked main
UPDATE branches SET is_main = true
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE is_main = true)
  AND id = (SELECT id FROM branches ORDER BY id LIMIT 1);

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  branch_id       INTEGER REFERENCES branches(id),
  employee_id     VARCHAR(20) UNIQUE,
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(150) UNIQUE,
  password_hash   VARCHAR(255),
  pin_hash        VARCHAR(255),
  role            user_role NOT NULL,
  avatar          TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration for existing databases: add employee_id column if missing
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) UNIQUE;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Migration for existing databases: add avatar column if missing
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Migration for existing databases: password reset token columns
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR(255);
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ============================================================
-- MIGRATIONS — rename "variant" concept to "customization"
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = current_schema() AND tablename = 'product_variants') THEN
    ALTER TABLE product_variants RENAME TO product_customizations;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = current_schema() AND tablename = 'variant_templates') THEN
    ALTER TABLE variant_templates RENAME TO customization_templates;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'customization_templates' AND column_name = 'variant_type') THEN
    ALTER TABLE customization_templates RENAME COLUMN variant_type TO customization_type;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'recipes' AND column_name = 'product_variant_id') THEN
    ALTER TABLE recipes RENAME COLUMN product_variant_id TO product_customization_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'order_items' AND column_name = 'variant_id') THEN
    ALTER TABLE order_items RENAME COLUMN variant_id TO customization_id;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_recipes_variant;

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id              SERIAL PRIMARY KEY,
  phone_number    VARCHAR(20) UNIQUE,
  name            VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MENU: CATEGORIES / PRODUCTS / CUSTOMIZATIONS / ADD-ONS
CREATE TABLE IF NOT EXISTS categories (
  id              SERIAL PRIMARY KEY,
  branch_id       INTEGER REFERENCES branches(id),
  name            VARCHAR(100) NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS products (
  id              SERIAL PRIMARY KEY,
  category_id     INTEGER NOT NULL REFERENCES categories(id),
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  base_price      NUMERIC(10,2) NOT NULL,
  image_url       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_customizations (
  id                    SERIAL PRIMARY KEY,
  product_id            INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name                  VARCHAR(100) NOT NULL,
  customization_type    VARCHAR(20) NOT NULL DEFAULT 'option',
  price_delta           NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_default            BOOLEAN NOT NULL DEFAULT false,
  is_active             BOOLEAN NOT NULL DEFAULT true
);

-- CUSTOMIZATION TEMPLATES (predefined size/option library, pick via dropdown + search)
CREATE TABLE IF NOT EXISTS customization_templates (
  id                    SERIAL PRIMARY KEY,
  name                  VARCHAR(100) NOT NULL UNIQUE,
  customization_type    VARCHAR(20) NOT NULL DEFAULT 'option',
  default_price_delta   NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock                 INTEGER NOT NULL DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration for existing databases: add stock column to customization_templates
DO $$ BEGIN
  ALTER TABLE customization_templates ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Migration: add customization_type to existing product_customizations and backfill from template library
ALTER TABLE product_customizations
  ADD COLUMN IF NOT EXISTS customization_type VARCHAR(20) NOT NULL DEFAULT 'option';

UPDATE product_customizations pc
SET customization_type = COALESCE(
  (SELECT t.customization_type FROM customization_templates t WHERE t.name = pc.name),
  pc.customization_type
);

-- NOTE: add-on / temperature / milk options are consolidated into
-- customization_templates (customization_type = 'addon' / 'temperature' / 'milk').

-- INVENTORY: INGREDIENTS / RECIPES / STOCK MOVEMENTS
CREATE TABLE IF NOT EXISTS ingredients (
  id                  SERIAL PRIMARY KEY,
  branch_id           INTEGER REFERENCES branches(id),
  name                VARCHAR(150) NOT NULL,
  unit                VARCHAR(20) NOT NULL,
  current_stock       NUMERIC(12,2) NOT NULL DEFAULT 0,
  reorder_threshold   NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_cost           NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipes (
  id                          SERIAL PRIMARY KEY,
  product_id                  INTEGER REFERENCES products(id),
  product_customization_id    INTEGER REFERENCES product_customizations(id) ON DELETE CASCADE,
  ingredient_id               INTEGER NOT NULL REFERENCES ingredients(id),
  qty_required                NUMERIC(10,3) NOT NULL
);

-- RECIPE LIBRARY (predefined BOM templates, selectable when creating a product)
CREATE TABLE IF NOT EXISTS recipe_templates (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL UNIQUE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipe_template_items (
  id                  SERIAL PRIMARY KEY,
  recipe_template_id  INTEGER NOT NULL REFERENCES recipe_templates(id) ON DELETE CASCADE,
  ingredient_id       INTEGER NOT NULL REFERENCES ingredients(id),
  qty_required        NUMERIC(10,3) NOT NULL,
  UNIQUE (recipe_template_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS addon_recipes (
  id              SERIAL PRIMARY KEY,
  addon_id        INTEGER NOT NULL REFERENCES customization_templates(id) ON DELETE CASCADE,
  ingredient_id   INTEGER NOT NULL REFERENCES ingredients(id),
  qty_required    NUMERIC(10,3) NOT NULL,
  UNIQUE (addon_id, ingredient_id)
);

-- SUPPLIERS & PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS suppliers (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  contact_person  VARCHAR(100),
  phone           VARCHAR(20),
  email           VARCHAR(150),
  is_active       BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id              SERIAL PRIMARY KEY,
  supplier_id     INTEGER NOT NULL REFERENCES suppliers(id),
  status          po_status NOT NULL DEFAULT 'draft',
  ordered_at      TIMESTAMPTZ,
  received_at     TIMESTAMPTZ,
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                  SERIAL PRIMARY KEY,
  purchase_order_id   INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  ingredient_id       INTEGER NOT NULL REFERENCES ingredients(id),
  quantity            NUMERIC(12,2) NOT NULL,
  unit_cost           NUMERIC(10,2) NOT NULL
);

-- ORDERS & POS
CREATE TABLE IF NOT EXISTS orders (
  id                  SERIAL PRIMARY KEY,
  branch_id           INTEGER REFERENCES branches(id),
  order_number         VARCHAR(20) NOT NULL UNIQUE,
  order_token          UUID NOT NULL DEFAULT gen_random_uuid(),
  order_type           order_type NOT NULL,
  table_number         VARCHAR(10),
  customer_id          INTEGER REFERENCES customers(id),
  placed_by_user_id    INTEGER REFERENCES users(id),
  status               order_status NOT NULL DEFAULT 'pending_payment',
  payment_status       payment_status NOT NULL DEFAULT 'unpaid',
  subtotal             NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_total       NUMERIC(10,2) NOT NULL DEFAULT 0,
  service_charge_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  total                NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration for existing databases: add service_charge_total column to orders
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_charge_total NUMERIC(10,2) NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN null; END $$;

CREATE TABLE IF NOT EXISTS order_items (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      INTEGER NOT NULL REFERENCES products(id),
  customization_id INTEGER REFERENCES product_customizations(id),
  quantity        INTEGER NOT NULL DEFAULT 1,
  unit_price      NUMERIC(10,2) NOT NULL,
  line_notes      TEXT,
  prepared_by     INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_item_addons (
  id              SERIAL PRIMARY KEY,
  order_item_id   INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  addon_id        INTEGER NOT NULL REFERENCES customization_templates(id),
  unit_price      NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id                          SERIAL PRIMARY KEY,
  ingredient_id               INTEGER REFERENCES ingredients(id),
  customization_template_id   INTEGER REFERENCES customization_templates(id),
  type                        stock_movement_type NOT NULL,
  quantity                    NUMERIC(12,2) NOT NULL,
  reference_order_id          INTEGER REFERENCES orders(id),
  note                        TEXT,
  created_by                  INTEGER REFERENCES users(id),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration for existing databases: make ingredient_id nullable and add customization_template_id
DO $$ BEGIN
  ALTER TABLE stock_movements ALTER COLUMN ingredient_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS customization_template_id INTEGER REFERENCES customization_templates(id);
EXCEPTION WHEN duplicate_column THEN null; END $$;

CREATE TABLE IF NOT EXISTS order_status_history (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status          order_status NOT NULL,
  changed_by      INTEGER REFERENCES users(id),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method          payment_method NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  reference_no    VARCHAR(100),
  received_by     INTEGER REFERENCES users(id),
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS discounts_promos (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(30) UNIQUE,
  description     VARCHAR(150),
  type            discount_type NOT NULL,
  value           NUMERIC(10,2) NOT NULL,
  valid_from      TIMESTAMPTZ,
  valid_to        TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS order_discounts (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  discount_id     INTEGER NOT NULL REFERENCES discounts_promos(id),
  amount_applied  NUMERIC(10,2) NOT NULL,
  approved_by     INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_item_discounts (
  id              SERIAL PRIMARY KEY,
  order_item_id   INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  discount_id     INTEGER NOT NULL REFERENCES discounts_promos(id),
  amount_applied  NUMERIC(10,2) NOT NULL,
  approved_by     INTEGER REFERENCES users(id)
);

-- SHIFTS & CASH DRAWER
CREATE TABLE IF NOT EXISTS shifts (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id),
  branch_id           INTEGER REFERENCES branches(id),
  cash_drawer_start   NUMERIC(10,2) NOT NULL DEFAULT 0,
  cash_drawer_end     NUMERIC(10,2),
  opened_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at           TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cash_movements (
  id              SERIAL PRIMARY KEY,
  shift_id        INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  type            cash_movement_type NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  reason          VARCHAR(150),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift_reports (
  id                  SERIAL PRIMARY KEY,
  shift_id            INTEGER NOT NULL UNIQUE REFERENCES shifts(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL REFERENCES users(id),
  user_name           VARCHAR(120),
  branch_id           INTEGER REFERENCES branches(id),
  branch_name         VARCHAR(120),
  opened_at           TIMESTAMPTZ NOT NULL,
  closed_at           TIMESTAMPTZ NOT NULL,
  cash_drawer_start   DOUBLE PRECISION NOT NULL DEFAULT 0,
  cash_drawer_end     DOUBLE PRECISION NOT NULL DEFAULT 0,
  transaction_count   INTEGER NOT NULL DEFAULT 0,
  total_sales         DOUBLE PRECISION NOT NULL DEFAULT 0,
  cash_sales          DOUBLE PRECISION NOT NULL DEFAULT 0,
  digital_sales       DOUBLE PRECISION NOT NULL DEFAULT 0,
  variance            DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shift_reports_closed_at ON shift_reports (closed_at);
CREATE INDEX IF NOT EXISTS idx_shift_reports_branch_id ON shift_reports (branch_id);
CREATE INDEX IF NOT EXISTS idx_shift_reports_user_id ON shift_reports (user_id);

-- Migration: allow deleting users that have historical references (shifts / shift reports)
DO $$ BEGIN
  ALTER TABLE shifts ALTER COLUMN user_id DROP NOT NULL;
  ALTER TABLE shift_reports ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS settings (
  key             VARCHAR(100) PRIMARY KEY,
  value           TEXT NOT NULL
);

-- GMAIL INTEGRATION (supplier email ingestion)
CREATE TABLE IF NOT EXISTS gmail_accounts (
  id                SERIAL PRIMARY KEY,
  email             VARCHAR(150) NOT NULL,
  access_token      TEXT,
  refresh_token     TEXT,
  token_expires_at  TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_messages (
  id                SERIAL PRIMARY KEY,
  gmail_message_id  VARCHAR(255) UNIQUE,
  from_email        VARCHAR(150),
  subject           TEXT,
  body              TEXT,
  po_code           VARCHAR(20),
  matched_items     JSONB,
  parsed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(order_token);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient ON stock_movements(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_recipes_customization ON recipes(product_customization_id);
CREATE INDEX IF NOT EXISTS idx_orders_branch_status ON orders(branch_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient_date ON stock_movements(ingredient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_recipes_product ON recipes(product_id) WHERE product_id IS NOT NULL;
