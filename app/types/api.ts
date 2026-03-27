// API response types for the lottery platform

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error'
  data?: T
  message?: string
  code?: string
}

export interface PaginatedResponse<T> {
  status: 'success'
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Ticket search params
export interface TicketSearchParams {
  number?: string
  suffix2?: string
  suffix3?: string
  prefix3?: string
  draw_id?: string
  min_price?: number
  max_price?: number
  status?: 'available'
  sort?: 'price_asc' | 'price_desc' | 'number_asc' | 'number_desc'
  page?: number
  limit?: number
}

// Cart
export interface CartAddResponse {
  cart_item_id: string
  ticket_id: string
  ticket_number: string
  price: number
  locked_at: string
  expires_at: string
  countdown_seconds: number
}

export interface CartItemWithCountdown {
  id: string
  ticket_id: string
  ticket_number: string
  price: number
  locked_at: string
  expires_at: string
  countdown_seconds: number
  set_number: string | null
}

// Checkout
export interface CheckoutResponse {
  order_id: string
  order_number: string
  total_amount: number
  item_count: number
  payment_deadline: string
  bank_account: {
    bank: string
    account_number: string
    account_name: string
  }
}

// Slip verification
export interface SlipUploadResponse {
  payment_id: string
  verification_status: 'processing' | 'verified' | 'rejected'
}

// Prize check
export interface PrizeCheckResult {
  ticket_id: string
  ticket_number: string
  prize_type: string | null
  prize_name: string | null
  prize_amount: number
  is_winner: boolean
}

// External lottery API (rayriffy)
export interface RaffiyDrawResponse {
  status: 'success'
  response: {
    id: string
    date: string
    endpoint: string
    prizes: RaffiyPrize[]
    runningNumbers: RaffiyRunningNumber[]
  }
}

export interface RaffiyPrize {
  id: string
  name: string
  reward: string
  number: string[]
}

export interface RaffiyRunningNumber {
  id: string
  name: string
  reward: string
  number: string[]
}
