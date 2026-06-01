-- Portföy XIRR migration
-- Eski `portfolio` tablosu kaldırılır, yerine işlem bazlı `portfolio_transactions` gelir.
-- Lot sayısı = sum(buy.lots) - sum(sell.lots) (uygulamada hesaplanır).
-- Supabase > SQL Editor'da bir kez çalıştır.

DROP TABLE IF EXISTS portfolio CASCADE;

CREATE TABLE portfolio_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticker TEXT NOT NULL,
  company_name TEXT,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  lots DECIMAL(14, 6) NOT NULL CHECK (lots > 0),
  price_per_lot DECIMAL(18, 6) NOT NULL CHECK (price_per_lot >= 0),
  currency TEXT NOT NULL,
  eur_rate DECIMAL(18, 8) NOT NULL CHECK (eur_rate > 0),
  fee DECIMAL(14, 4) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  transaction_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX portfolio_transactions_user_ticker_date_idx
  ON portfolio_transactions (user_id, ticker, transaction_date);

ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_tx_select" ON portfolio_transactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "portfolio_tx_insert" ON portfolio_transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "portfolio_tx_update" ON portfolio_transactions
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "portfolio_tx_delete" ON portfolio_transactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());
