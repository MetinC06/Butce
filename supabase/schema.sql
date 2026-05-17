-- Bütçe Takibi - Supabase Schema
-- Bu SQL'i Supabase > SQL Editor'da çalıştır

-- Harcama kategorileri
CREATE TABLE expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '💰',
  color TEXT DEFAULT '#16a34a',
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gelirler
CREATE TABLE incomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Harcamalar
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasarruf hesapları
CREATE TABLE savings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portföy (hisse senetleri)
CREATE TABLE portfolio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticker TEXT NOT NULL,
  company_name TEXT,
  lots DECIMAL(10,4) NOT NULL CHECK (lots > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- Row Level Security'yi aç
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;

-- Kategoriler - tüm giriş yapmış kullanıcılar görebilir (aile uygulaması)
CREATE POLICY "categories_select" ON expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_insert" ON expense_categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "categories_delete" ON expense_categories FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Gelirler
CREATE POLICY "incomes_select" ON incomes FOR SELECT TO authenticated USING (true);
CREATE POLICY "incomes_insert" ON incomes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "incomes_delete" ON incomes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Harcamalar
CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Tasarruflar
CREATE POLICY "savings_select" ON savings FOR SELECT TO authenticated USING (true);
CREATE POLICY "savings_insert" ON savings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_update" ON savings FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "savings_delete" ON savings FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Portföy
CREATE POLICY "portfolio_select" ON portfolio FOR SELECT TO authenticated USING (true);
CREATE POLICY "portfolio_insert" ON portfolio FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "portfolio_update" ON portfolio FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "portfolio_delete" ON portfolio FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Varsayılan kategoriler
INSERT INTO expense_categories (name, icon, color, is_default) VALUES
  ('Market', '🛒', '#16a34a', true),
  ('Benzin', '⛽', '#dc2626', true),
  ('Mortgage / Kira', '🏠', '#2563eb', true),
  ('Faturalar', '💡', '#d97706', true),
  ('Restoran', '🍽️', '#7c3aed', true),
  ('Sağlık', '🏥', '#059669', true),
  ('Ulaşım', '🚌', '#0891b2', true),
  ('Eğlence', '🎬', '#db2777', true),
  ('Giyim', '👕', '#9333ea', true),
  ('Eğitim', '📚', '#ea580c', true);
