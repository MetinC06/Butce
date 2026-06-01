-- BIST işlemleri seed
-- Supabase SQL Editor'da çalıştır (service_role ile çalışır, auth.uid() null döner — bu yüzden
-- e-mail ile auth.users'tan kullanıcının id'sini buluyoruz).
--
-- Aşağıdaki email'i kendi Supabase hesabınızla değiştirin gerekirse.
-- Yeniden çalıştırmadan önce mevcut işlemleri silmek isterseniz, en üste:
--   DELETE FROM portfolio_transactions
--   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'metincanbek06@gmail.com')
--     AND ticker LIKE '%.IS';

DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'metincanbek06@gmail.com';
  IF uid IS NULL THEN
    RAISE EXCEPTION 'User not found for email: %', 'metincanbek06@gmail.com';
  END IF;

  INSERT INTO portfolio_transactions (user_id, ticker, company_name, type, lots, price_per_lot, currency, eur_rate, fee, transaction_date) VALUES
    (uid, 'DOAS.IS', 'Doğuş Otomotiv', 'buy', 1, 176.10, 'TRY', 0.02078236, 0.37, '2025-09-05'),
    (uid, 'ISMEN.IS', 'İş Yatırım Menkul Değerler', 'buy', 3, 42.84, 'TRY', 0.02078236, 0.27, '2025-09-05'),
    (uid, 'TRGYO.IS', 'Torunlar GYO', 'buy', 1, 71.35, 'TRY', 0.02078236, 0.15, '2025-09-05'),
    (uid, 'TUPRS.IS', 'Tüpraş', 'buy', 1, 168.10, 'TRY', 0.02078236, 0.35, '2025-09-05'),
    (uid, 'DOAS.IS', 'Doğuş Otomotiv', 'buy', 2, 181.30, 'TRY', 0.02047131, 0.76, '2025-10-06'),
    (uid, 'ISMEN.IS', 'İş Yatırım Menkul Değerler', 'buy', 9, 44.04, 'TRY', 0.02047131, 0.83, '2025-10-06'),
    (uid, 'TRGYO.IS', 'Torunlar GYO', 'buy', 5, 74.40, 'TRY', 0.02047131, 0.78, '2025-10-06'),
    (uid, 'TUPRS.IS', 'Tüpraş', 'buy', 2, 184.00, 'TRY', 0.02047131, 0.77, '2025-10-06'),
    (uid, 'ECZYT.IS', 'Eczacıbaşı Yatırım', 'buy', 2, 312.50, 'TRY', 0.02068051, 1.31, '2025-11-04'),
    (uid, 'ISMEN.IS', 'İş Yatırım Menkul Değerler', 'buy', 2, 44.68, 'TRY', 0.02068051, 0.19, '2025-11-04'),
    (uid, 'TBORG.IS', 'Coca-Cola İçecek', 'buy', 5, 203.90, 'TRY', 0.02068051, 2.14, '2025-11-04'),
    (uid, 'TUPRS.IS', 'Tüpraş', 'buy', 6, 192.00, 'TRY', 0.02068051, 2.42, '2025-11-04'),
    (uid, 'ISMEN.IS', 'İş Yatırım Menkul Değerler', 'buy', 3, 41.78, 'TRY', 0.02048014, 0.26, '2025-11-10'),
    (uid, 'MGROS.IS', 'Migros', 'buy', 2, 503.00, 'TRY', 0.02048014, 2.11, '2025-11-10'),
    (uid, 'TUPRS.IS', 'Tüpraş', 'buy', 5, 199.20, 'TRY', 0.02048014, 2.09, '2025-11-10'),
    (uid, 'DOAS.IS', 'Doğuş Otomotiv', 'buy', 10, 184.90, 'TRY', 0.02037728, 3.88, '2025-11-25'),
    (uid, 'ECZYT.IS', 'Eczacıbaşı Yatırım', 'buy', 5, 355.00, 'TRY', 0.02037728, 3.73, '2025-11-25'),
    (uid, 'ISMEN.IS', 'İş Yatırım Menkul Değerler', 'buy', 40, 40.14, 'TRY', 0.02037728, 3.37, '2025-11-25'),
    (uid, 'MGROS.IS', 'Migros', 'buy', 2, 523.50, 'TRY', 0.02037728, 2.20, '2025-11-25'),
    (uid, 'TBORG.IS', 'Coca-Cola İçecek', 'buy', 8, 164.10, 'TRY', 0.02037728, 2.76, '2025-11-25'),
    (uid, 'TRGYO.IS', 'Torunlar GYO', 'buy', 28, 70.05, 'TRY', 0.02037728, 4.12, '2025-11-25'),
    (uid, 'TUPRS.IS', 'Tüpraş', 'buy', 15, 193.70, 'TRY', 0.02037728, 6.10, '2025-11-25'),
    (uid, 'DOAS.IS', 'Doğuş Otomotiv', 'buy', 10, 186.60, 'TRY', 0.01993895, 3.92, '2025-12-19'),
    (uid, 'ISMEN.IS', 'İş Yatırım Menkul Değerler', 'buy', 37, 40.10, 'TRY', 0.01993895, 3.12, '2025-12-19'),
    (uid, 'TRGYO.IS', 'Torunlar GYO', 'buy', 13, 72.95, 'TRY', 0.01993895, 1.99, '2025-12-19'),
    (uid, 'TUPRS.IS', 'Tüpraş', 'buy', 6, 185.10, 'TRY', 0.01993895, 2.33, '2025-12-19'),
    (uid, 'TUPRS.IS', 'Tüpraş', 'buy', 7, 185.10, 'TRY', 0.01993895, 2.72, '2025-12-19'),
    (uid, 'TUPRS.IS', 'Tüpraş', 'buy', 10, 184.90, 'TRY', 0.01993895, 3.88, '2025-12-19'),
    (uid, 'TUPRS.IS', 'Tüpraş', 'buy', 18, 185.10, 'TRY', 0.01993895, 7.00, '2025-12-19'),
    (uid, 'ASELS.IS', 'Aselsan', 'buy', 9, 303.00, 'TRY', 0.01963573, 5.73, '2026-01-23'),
    (uid, 'DOAS.IS', 'Doğuş Otomotiv', 'buy', 8, 235.10, 'TRY', 0.01963573, 3.95, '2026-01-23'),
    (uid, 'HTTBT.IS', 'Hitit Bilgisayar', 'buy', 53, 46.98, 'TRY', 0.01963573, 5.23, '2026-01-23'),
    (uid, 'ISMEN.IS', 'İş Yatırım Menkul Değerler', 'buy', 66, 45.42, 'TRY', 0.01963573, 6.30, '2026-01-23'),
    (uid, 'TAVHL.IS', 'TAV Havalimanları', 'buy', 9, 329.00, 'TRY', 0.01963573, 6.22, '2026-01-23'),
    (uid, 'TRGYO.IS', 'Torunlar GYO', 'buy', 3, 81.20, 'TRY', 0.01963573, 0.51, '2026-01-23'),
    (uid, 'TUPRS.IS', 'Tüpraş', 'buy', 8, 228.20, 'TRY', 0.01963573, 3.83, '2026-01-23'),
    (uid, 'ISMEN.IS', 'İş Yatırım Menkul Değerler', 'buy', 1, 45.28, 'TRY', 0.01915878, 0.10, '2026-01-27'),
    (uid, 'DOAS.IS', 'Doğuş Otomotiv', 'buy', 9, 227.70, 'TRY', 0.01936925, 4.30, '2026-02-19'),
    (uid, 'TBORG.IS', 'Coca-Cola İçecek', 'sell', 13, 169.60, 'TRY', 0.01936925, 4.63, '2026-02-19'),
    (uid, 'DOAS.IS', 'Doğuş Otomotiv', 'buy', 13, 218.10, 'TRY', 0.01926380, 5.95, '2026-02-25'),
    (uid, 'HTTBT.IS', 'Hitit Bilgisayar', 'buy', 23, 41.84, 'TRY', 0.01926380, 2.02, '2026-02-25'),
    (uid, 'ISMEN.IS', 'İş Yatırım Menkul Değerler', 'buy', 100, 49.76, 'TRY', 0.01926380, 10.45, '2026-02-25'),
    (uid, 'MGROS.IS', 'Migros', 'buy', 7, 660.50, 'TRY', 0.01926380, 9.71, '2026-02-25'),
    (uid, 'TAVHL.IS', 'TAV Havalimanları', 'buy', 9, 318.75, 'TRY', 0.01926380, 6.02, '2026-02-25'),
    (uid, 'THYAO.IS', 'Türk Hava Yolları', 'buy', 8, 286.00, 'TRY', 0.01963883, 4.80, '2026-03-03'),
    (uid, 'ISMEN.IS', 'İş Yatırım Menkul Değerler', 'buy', 16, 45.30, 'TRY', 0.01968979, 1.52, '2026-03-18'),
    (uid, 'THYAO.IS', 'Türk Hava Yolları', 'sell', 7, 290.50, 'TRY', 0.01941809, 4.27, '2026-03-23'),
    (uid, 'THYAO.IS', 'Türk Hava Yolları', 'sell', 1, 290.50, 'TRY', 0.01941809, 0.61, '2026-03-23'),
    (uid, 'ISMEN.IS', 'İş Yatırım Menkul Değerler', 'buy', 51, 45.30, 'TRY', 0.01941714, 4.85, '2026-03-24'),
    (uid, 'TUPRS.IS', 'Tüpraş', 'buy', 21, 237.80, 'TRY', 0.01948664, 10.49, '2026-03-26'),
    (uid, 'BRYAT.IS', 'Borusan Yatırım', 'buy', 3, 2206.00, 'TRY', 0.01921760, 13.90, '2026-04-07'),
    (uid, 'ISMEN.IS', 'İş Yatırım Menkul Değerler', 'buy', 40, 39.86, 'TRY', 0.01921760, 3.35, '2026-04-07'),
    (uid, 'ISMEN.IS', 'İş Yatırım Menkul Değerler', 'buy', 21, 40.64, 'TRY', 0.01921760, 1.79, '2026-04-07'),
    (uid, 'DOAS.IS', 'Doğuş Otomotiv', 'buy', 2, 190.00, 'TRY', 0.01901584, 0.80, '2026-04-13'),
    (uid, 'DOAS.IS', 'Doğuş Otomotiv', 'buy', 4, 190.80, 'TRY', 0.01892490, 1.60, '2026-04-15'),
    (uid, 'DOAS.IS', 'Doğuş Otomotiv', 'buy', 32, 183.90, 'TRY', 0.01894168, 12.36, '2026-04-27'),
    (uid, 'ISMEN.IS', 'İş Yatırım Menkul Değerler', 'buy', 8, 43.62, 'TRY', 0.01894168, 0.73, '2026-04-27'),
    (uid, 'MGROS.IS', 'Migros', 'buy', 6, 636.50, 'TRY', 0.01894168, 8.02, '2026-04-27'),
    (uid, 'TUPRS.IS', 'Tüpraş', 'buy', 7, 273.25, 'TRY', 0.01894168, 4.02, '2026-04-27'),
    (uid, 'ANHYT.IS', 'Anadolu Hayat Emeklilik', 'buy', 35, 111.30, 'TRY', 0.01889682, 8.18, '2026-04-28'),
    (uid, 'DOAS.IS', 'Doğuş Otomotiv', 'buy', 27, 182.10, 'TRY', 0.01889682, 10.33, '2026-04-28'),
    (uid, 'ISMEN.IS', 'İş Yatırım Menkul Değerler', 'buy', 4, 42.08, 'TRY', 0.01889682, 0.35, '2026-04-28'),
    (uid, 'DOAS.IS', 'Doğuş Otomotiv', 'buy', 10, 182.30, 'TRY', 0.01894531, 3.83, '2026-04-29'),
    (uid, 'ISMEN.IS', 'İş Yatırım Menkul Değerler', 'buy', 2, 41.16, 'TRY', 0.01880449, 0.17, '2026-05-14'),
    (uid, 'ISMEN.IS', 'İş Yatırım Menkul Değerler', 'buy', 8, 38.08, 'TRY', 0.01873016, 0.64, '2026-05-26');
END $$;

