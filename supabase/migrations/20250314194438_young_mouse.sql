/*
  # Market Analysis Schema

  1. New Tables
    - products: Base product information
    - daily_product_data: Daily metrics for products
    - competitor_data: Competitor product information
    - visits_data: Product visit statistics
    - trends_data: Market trend analysis
    - questions_data: Product Q&A metrics
    - buy_box_data: Buy box competition data
    - sellers: Seller information
    - categories: Product categories

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to:
      - Read their own data
      - Insert their own data
      - Update their own data

  3. Indexes
    - Date-based indexes for time series data
    - Search optimization indexes for common queries
*/

-- Create extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id text UNIQUE NOT NULL,
  title text NOT NULL,
  seller_id text NOT NULL,
  category_id text,
  official_store_id text,
  catalog_product_id text,
  date_created timestamptz NOT NULL DEFAULT now(),
  last_updated timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_product_data (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  date date NOT NULL,
  price numeric(12,2) NOT NULL,
  sold_quantity integer NOT NULL DEFAULT 0,
  available_quantity integer NOT NULL DEFAULT 0,
  shipping_free boolean DEFAULT false,
  listing_type text,
  status text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS competitor_data (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  competitor_seller_id text NOT NULL,
  date date NOT NULL,
  price numeric(12,2) NOT NULL,
  sold_quantity integer NOT NULL DEFAULT 0,
  available_quantity integer NOT NULL DEFAULT 0,
  shipping_free boolean DEFAULT false,
  listing_type text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visits_data (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  date date NOT NULL,
  visits_today integer NOT NULL DEFAULT 0,
  visits_last_7_days integer NOT NULL DEFAULT 0,
  visits_last_30_days integer NOT NULL DEFAULT 0,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trends_data (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword text NOT NULL,
  search_volume integer NOT NULL DEFAULT 0,
  category_id text,
  date date NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions_data (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  date date NOT NULL,
  question_count integer NOT NULL DEFAULT 0,
  review_average numeric(3,2),
  review_count integer NOT NULL DEFAULT 0,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS buy_box_data (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  date date NOT NULL,
  winning_price numeric(12,2),
  buy_box_status text,
  buy_box_reason text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sellers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id text UNIQUE NOT NULL,
  nickname text NOT NULL,
  official_store_id text,
  reputation_level text,
  metrics jsonb,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id text UNIQUE NOT NULL,
  name text NOT NULL,
  parent_id text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for optimization
CREATE INDEX IF NOT EXISTS idx_daily_product_data_date ON daily_product_data(date);
CREATE INDEX IF NOT EXISTS idx_competitor_data_date ON competitor_data(date);
CREATE INDEX IF NOT EXISTS idx_visits_data_date ON visits_data(date);
CREATE INDEX IF NOT EXISTS idx_trends_data_date ON trends_data(date);
CREATE INDEX IF NOT EXISTS idx_questions_data_date ON questions_data(date);
CREATE INDEX IF NOT EXISTS idx_buy_box_data_date ON buy_box_data(date);

-- Create indexes for frequent searches
CREATE INDEX IF NOT EXISTS idx_products_item_id ON products(item_id);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_sellers_seller_id ON sellers(seller_id);
CREATE INDEX IF NOT EXISTS idx_categories_category_id ON categories(category_id);

-- Enable Row Level Security
DO $$
BEGIN
  ALTER TABLE products ENABLE ROW LEVEL SECURITY;
  ALTER TABLE daily_product_data ENABLE ROW LEVEL SECURITY;
  ALTER TABLE competitor_data ENABLE ROW LEVEL SECURITY;
  ALTER TABLE visits_data ENABLE ROW LEVEL SECURITY;
  ALTER TABLE trends_data ENABLE ROW LEVEL SECURITY;
  ALTER TABLE questions_data ENABLE ROW LEVEL SECURITY;
  ALTER TABLE buy_box_data ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
END $$;

-- Helper function to safely create policies
CREATE OR REPLACE FUNCTION create_policy_if_not_exists(
  table_name text,
  policy_name text,
  policy_type text,
  policy_using text
) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = table_name::name 
    AND policyname = policy_name::name
  ) THEN
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR %s USING (%s)',
      policy_name, table_name, policy_type, policy_using
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Helper function to safely create check policies
CREATE OR REPLACE FUNCTION create_check_policy_if_not_exists(
  table_name text,
  policy_name text,
  policy_type text,
  policy_check text
) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = table_name::name 
    AND policyname = policy_name::name
  ) THEN
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR %s WITH CHECK (%s)',
      policy_name, table_name, policy_type, policy_check
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create policies for all tables
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN 
    SELECT unnest(ARRAY[
      'products',
      'daily_product_data',
      'competitor_data',
      'visits_data',
      'trends_data',
      'questions_data',
      'buy_box_data',
      'sellers',
      'categories'
    ])
  LOOP
    -- Create SELECT policy
    PERFORM create_policy_if_not_exists(
      table_name,
      'Users can read own data',
      'SELECT',
      'auth.uid() = user_id'
    );
    
    -- Create INSERT policy
    PERFORM create_check_policy_if_not_exists(
      table_name,
      'Users can insert own data',
      'INSERT',
      'auth.uid() = user_id'
    );
    
    -- Create UPDATE policy
    PERFORM create_policy_if_not_exists(
      table_name,
      'Users can update own data',
      'UPDATE',
      'auth.uid() = user_id'
    );
  END LOOP;
END $$;