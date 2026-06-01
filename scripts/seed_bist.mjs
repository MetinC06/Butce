// node scripts/seed_bist.mjs > supabase/seeds/bist_transactions.sql
// Yahoo'dan tarihsel EURTRY kapanışlarını çeker, BIST işlemleri için INSERT SQL üretir.

const TX = [
  // [date, ticker, type, lots, price_per_lot, commission]
  ['2025-09-05', 'DOAS.IS',  'buy',   1,  176.10, 0.37],
  ['2025-09-05', 'ISMEN.IS', 'buy',   3,   42.84, 0.27],
  ['2025-09-05', 'TRGYO.IS', 'buy',   1,   71.35, 0.15],
  ['2025-09-05', 'TUPRS.IS', 'buy',   1,  168.10, 0.35],
  ['2025-10-06', 'DOAS.IS',  'buy',   2,  181.30, 0.76],
  ['2025-10-06', 'ISMEN.IS', 'buy',   9,   44.04, 0.83],
  ['2025-10-06', 'TRGYO.IS', 'buy',   5,   74.40, 0.78],
  ['2025-10-06', 'TUPRS.IS', 'buy',   2,  184.00, 0.77],
  ['2025-11-04', 'ECZYT.IS', 'buy',   2,  312.50, 1.31],
  ['2025-11-04', 'ISMEN.IS', 'buy',   2,   44.68, 0.19],
  ['2025-11-04', 'TBORG.IS', 'buy',   5,  203.90, 2.14],
  ['2025-11-04', 'TUPRS.IS', 'buy',   6,  192.00, 2.42],
  ['2025-11-10', 'ISMEN.IS', 'buy',   3,   41.78, 0.26],
  ['2025-11-10', 'MGROS.IS', 'buy',   2,  503.00, 2.11],
  ['2025-11-10', 'TUPRS.IS', 'buy',   5,  199.20, 2.09],
  ['2025-11-25', 'DOAS.IS',  'buy',  10,  184.90, 3.88],
  ['2025-11-25', 'ECZYT.IS', 'buy',   5,  355.00, 3.73],
  ['2025-11-25', 'ISMEN.IS', 'buy',  40,   40.14, 3.37],
  ['2025-11-25', 'MGROS.IS', 'buy',   2,  523.50, 2.20],
  ['2025-11-25', 'TBORG.IS', 'buy',   8,  164.10, 2.76],
  ['2025-11-25', 'TRGYO.IS', 'buy',  28,   70.05, 4.12],
  ['2025-11-25', 'TUPRS.IS', 'buy',  15,  193.70, 6.10],
  ['2025-12-19', 'DOAS.IS',  'buy',  10,  186.60, 3.92],
  ['2025-12-19', 'ISMEN.IS', 'buy',  37,   40.10, 3.12],
  ['2025-12-19', 'TRGYO.IS', 'buy',  13,   72.95, 1.99],
  ['2025-12-19', 'TUPRS.IS', 'buy',   6,  185.10, 2.33],
  ['2025-12-19', 'TUPRS.IS', 'buy',   7,  185.10, 2.72],
  ['2025-12-19', 'TUPRS.IS', 'buy',  10,  184.90, 3.88],
  ['2025-12-19', 'TUPRS.IS', 'buy',  18,  185.10, 7.00],
  ['2026-01-23', 'ASELS.IS', 'buy',   9,  303.00, 5.73],
  ['2026-01-23', 'DOAS.IS',  'buy',   8,  235.10, 3.95],
  ['2026-01-23', 'HTTBT.IS', 'buy',  53,   46.98, 5.23],
  ['2026-01-23', 'ISMEN.IS', 'buy',  66,   45.42, 6.30],
  ['2026-01-23', 'TAVHL.IS', 'buy',   9,  329.00, 6.22],
  ['2026-01-23', 'TRGYO.IS', 'buy',   3,   81.20, 0.51],
  ['2026-01-23', 'TUPRS.IS', 'buy',   8,  228.20, 3.83],
  ['2026-01-27', 'ISMEN.IS', 'buy',   1,   45.28, 0.10],
  ['2026-02-19', 'DOAS.IS',  'buy',   9,  227.70, 4.30],
  ['2026-02-19', 'TBORG.IS', 'sell', 13,  169.60, 4.63],
  ['2026-02-25', 'DOAS.IS',  'buy',  13,  218.10, 5.95],
  ['2026-02-25', 'HTTBT.IS', 'buy',  23,   41.84, 2.02],
  ['2026-02-25', 'ISMEN.IS', 'buy', 100,   49.76, 10.45],
  ['2026-02-25', 'MGROS.IS', 'buy',   7,  660.50, 9.71],
  ['2026-02-25', 'TAVHL.IS', 'buy',   9,  318.75, 6.02],
  ['2026-03-03', 'THYAO.IS', 'buy',   8,  286.00, 4.80],
  ['2026-03-18', 'ISMEN.IS', 'buy',  16,   45.30, 1.52],
  ['2026-03-23', 'THYAO.IS', 'sell',  7,  290.50, 4.27],
  ['2026-03-23', 'THYAO.IS', 'sell',  1,  290.50, 0.61],
  ['2026-03-24', 'ISMEN.IS', 'buy',  51,   45.30, 4.85],
  ['2026-03-26', 'TUPRS.IS', 'buy',  21,  237.80, 10.49],
  ['2026-04-07', 'BRYAT.IS', 'buy',   3, 2206.00, 13.90],
  ['2026-04-07', 'ISMEN.IS', 'buy',  40,   39.86, 3.35],
  ['2026-04-07', 'ISMEN.IS', 'buy',  21,   40.64, 1.79],
  ['2026-04-13', 'DOAS.IS',  'buy',   2,  190.00, 0.80],
  ['2026-04-15', 'DOAS.IS',  'buy',   4,  190.80, 1.60],
  ['2026-04-27', 'DOAS.IS',  'buy',  32,  183.90, 12.36],
  ['2026-04-27', 'ISMEN.IS', 'buy',   8,   43.62, 0.73],
  ['2026-04-27', 'MGROS.IS', 'buy',   6,  636.50, 8.02],
  ['2026-04-27', 'TUPRS.IS', 'buy',   7,  273.25, 4.02],
  ['2026-04-28', 'ANHYT.IS', 'buy',  35,  111.30, 8.18],
  ['2026-04-28', 'DOAS.IS',  'buy',  27,  182.10, 10.33],
  ['2026-04-28', 'ISMEN.IS', 'buy',   4,   42.08, 0.35],
  ['2026-04-29', 'DOAS.IS',  'buy',  10,  182.30, 3.83],
  ['2026-05-14', 'ISMEN.IS', 'buy',   2,   41.16, 0.17],
  ['2026-05-26', 'ISMEN.IS', 'buy',   8,   38.08, 0.64],
]

const COMPANY = {
  'ANHYT.IS': 'Anadolu Hayat Emeklilik',
  'ASELS.IS': 'Aselsan',
  'BRYAT.IS': 'Borusan Yatırım',
  'DOAS.IS':  'Doğuş Otomotiv',
  'ECZYT.IS': 'Eczacıbaşı Yatırım',
  'HTTBT.IS': 'Hitit Bilgisayar',
  'ISMEN.IS': 'İş Yatırım Menkul Değerler',
  'MGROS.IS': 'Migros',
  'TAVHL.IS': 'TAV Havalimanları',
  'TBORG.IS': 'Coca-Cola İçecek',
  'THYAO.IS': 'Türk Hava Yolları',
  'TRGYO.IS': 'Torunlar GYO',
  'TUPRS.IS': 'Tüpraş',
}

const period1 = Math.floor(new Date('2025-08-25T00:00:00Z').getTime() / 1000)
const period2 = Math.floor(new Date('2026-06-02T00:00:00Z').getTime() / 1000)

const url = `https://query1.finance.yahoo.com/v8/finance/chart/EURTRY=X?period1=${period1}&period2=${period2}&interval=1d`
const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
if (!res.ok) {
  console.error('Yahoo error:', res.status)
  process.exit(1)
}
const data = await res.json()
const result = data?.chart?.result?.[0]
const ts = result?.timestamp
const closes = result?.indicators?.quote?.[0]?.close
if (!ts || !closes) {
  console.error('Yahoo returned no data')
  process.exit(1)
}

function rateForDate(dateISO) {
  const target = Math.floor(new Date(dateISO + 'T00:00:00Z').getTime() / 1000) + 86400
  let pick = null
  for (let i = 0; i < ts.length; i++) {
    if (ts[i] <= target && closes[i] != null) pick = closes[i]
  }
  return pick
}

function sqlEscape(s) { return s.replace(/'/g, "''") }

const USER_EMAIL = process.env.USER_EMAIL || 'metincanbek06@gmail.com'

const rows = TX.map(([date, ticker, type, lots, price, fee]) => {
  const eurtry = rateForDate(date)
  if (!eurtry) throw new Error(`No rate for ${date}`)
  const eurRate = 1 / eurtry
  const company = COMPANY[ticker] || ''
  return `    (uid, '${ticker}', '${sqlEscape(company)}', '${type}', ${lots}, ${price.toFixed(2)}, 'TRY', ${eurRate.toFixed(8)}, ${fee.toFixed(2)}, '${date}')`
})

const out = `-- BIST işlemleri seed
-- Supabase SQL Editor'da çalıştır (service_role ile çalışır, auth.uid() null döner — bu yüzden
-- e-mail ile auth.users'tan kullanıcının id'sini buluyoruz).
--
-- Aşağıdaki email'i kendi Supabase hesabınızla değiştirin gerekirse.
-- Yeniden çalıştırmadan önce mevcut işlemleri silmek isterseniz, en üste:
--   DELETE FROM portfolio_transactions
--   WHERE user_id = (SELECT id FROM auth.users WHERE email = '${sqlEscape(USER_EMAIL)}')
--     AND ticker LIKE '%.IS';

DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = '${sqlEscape(USER_EMAIL)}';
  IF uid IS NULL THEN
    RAISE EXCEPTION 'User not found for email: %', '${sqlEscape(USER_EMAIL)}';
  END IF;

  INSERT INTO portfolio_transactions (user_id, ticker, company_name, type, lots, price_per_lot, currency, eur_rate, fee, transaction_date) VALUES
${rows.join(',\n')};
END $$;
`

console.log(out)
