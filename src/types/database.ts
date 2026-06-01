export type ExpenseCategory = {
  id: string
  name: string
  icon: string | null
  color: string | null
  is_default: boolean
  created_by: string | null
  created_at: string
}

export type Income = {
  id: string
  user_id: string
  amount: number
  description: string | null
  date: string
  created_at: string
}

export type Expense = {
  id: string
  user_id: string
  category_id: string | null
  amount: number
  description: string | null
  date: string
  created_at: string
  expense_categories?: ExpenseCategory | null
}

export type Saving = {
  id: string
  user_id: string
  name: string
  balance: number
  updated_at: string
}

export type TransactionType = 'buy' | 'sell'

export type PortfolioTransaction = {
  id: string
  user_id: string
  ticker: string
  company_name: string | null
  type: TransactionType
  lots: number
  price_per_lot: number
  currency: string
  eur_rate: number          // işlem tarihinde 1 birim para = X EUR
  fee: number               // kendi para biriminde
  transaction_date: string  // YYYY-MM-DD
  note: string | null
  created_at: string
}
