// Database entity types matching the SQL schema

export type UserRole = 'customer' | 'admin' | 'super_admin'
export type DrawStatus = 'upcoming' | 'selling' | 'closed' | 'resulted'
export type TicketStatus = 'available' | 'locked' | 'sold' | 'prize_claimed'
export type CartItemStatus = 'active' | 'expired' | 'converted'
export type OrderStatus = 'pending_payment' | 'verifying' | 'paid' | 'cancelled' | 'expired' | 'refunded'
export type PaymentStatus = 'pending' | 'verified' | 'rejected' | 'refunded'
export type PaymentMethod = 'bank_transfer'
export type SlipResult = 'match' | 'amount_mismatch' | 'account_mismatch' | 'expired' | 'unreadable'
export type PrizeClaimStatus = 'pending' | 'claimed' | 'paid' | 'rejected'
export type PayoutMethod = 'wallet' | 'bank_transfer'
export type PrizeItemStatus = 'unchecked' | 'no_prize' | 'won' | 'claimed' | 'paid_out'
export type WalletTransactionType = 'deposit' | 'withdrawal' | 'prize' | 'prize_payout' | 'purchase' | 'refund'
export type NotificationType = 'order_paid' | 'prize_won' | 'prize_payout' | 'prize' | 'cart_expiring' | 'system'

export interface User {
  id: string
  phone: string | null
  email: string | null
  full_name: string
  id_card_number: string | null
  avatar_url: string | null
  role: UserRole
  is_verified: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LotteryDraw {
  id: string
  draw_id: string
  draw_date_thai: string
  draw_date: string
  status: DrawStatus
  ticket_price_official: number
  sale_start: string | null
  sale_end: string | null
  created_at: string
}

export interface Ticket {
  id: string
  ticket_number: string
  draw_id: string
  set_number: string | null
  price: number
  cost: number
  status: TicketStatus
  barcode_raw: string | null
  image_url: string | null
  watermarked_url: string | null
  locked_by: string | null
  locked_until: string | null
  purchased_by: string | null
  created_at: string
  updated_at: string
}

export interface DrawResult {
  id: string
  draw_id: string
  prize_type: string
  prize_name: string
  prize_amount: number
  winning_number: string
  created_at: string
}

export interface CartItem {
  id: string
  user_id: string
  ticket_id: string
  locked_at: string
  expires_at: string
  status: CartItemStatus
  created_at: string
  // Joined
  ticket?: Ticket
}

export interface Order {
  id: string
  order_number: string
  user_id: string
  total_amount: number
  total_items: number
  status: OrderStatus
  payment_deadline: string
  paid_at: string | null
  created_at: string
  updated_at: string
  // Joined
  items?: OrderItem[]
  payment?: Payment
}

export interface OrderItem {
  id: string
  order_id: string
  ticket_id: string
  price: number
  prize_status: PrizeItemStatus
  created_at: string
  // Joined
  ticket?: Ticket
}

export interface Payment {
  id: string
  order_id: string
  method: PaymentMethod
  amount: number
  slip_image_url: string | null
  status: PaymentStatus
  slip_data: Record<string, unknown> | null
  rejection_reason: string | null
  verified_at: string | null
  created_at: string
}

export interface SlipVerification {
  id: string
  payment_id: string
  order_id: string
  transaction_id: string | null
  verified_amount: number | null
  sender_account: string | null
  receiver_account: string | null
  transfer_datetime: string | null
  result: SlipResult
  raw_api_response: Record<string, unknown> | null
  created_at: string
}

export interface PrizeClaim {
  id: string
  order_item_id: string
  ticket_id: string
  draw_id: string
  user_id: string
  prize_type: string
  prize_amount: number
  platform_fee: number
  net_amount: number
  status: PrizeClaimStatus
  payout_method: PayoutMethod | null
  payout_reference: string | null
  claimed_at: string
  paid_at: string | null
  paid_by: string | null
  paid_out_at: string | null
  created_at: string
}

export interface Wallet {
  id: string
  user_id: string
  balance: number
  total_deposited: number
  total_withdrawn: number
  total_prize_received: number
  updated_at: string
  created_at: string
}

export interface WalletTransaction {
  id: string
  wallet_id: string
  type: WalletTransactionType
  amount: number
  balance_after: number | null
  reference_type: string | null
  reference_id: string | null
  description: string | null
  created_at: string
}

export interface BankAccount {
  id: string
  user_id: string
  bank_code: string | null
  bank_name: string
  account_number: string
  account_name: string
  is_default: boolean
  is_verified: boolean
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  is_read: boolean
  link: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface PlatformSetting {
  key: string
  value: unknown
  updated_at: string
}
