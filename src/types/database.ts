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

export type PortfolioItem = {
  id: string
  user_id: string
  ticker: string
  company_name: string | null
  lots: number
  created_at: string
}
