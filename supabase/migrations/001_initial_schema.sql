-- =============================================
-- Online Lottery Platform — Database Schema
-- PostgreSQL (Supabase-ready)
-- =============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- 1. USERS
-- =========================
CREATE TABLE users (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           varchar(15) UNIQUE NOT NULL,
    email           varchar(255),
    full_name       varchar(255) NOT NULL,
    id_card_number  varchar(512),
    avatar_url      text,
    role            varchar(20) NOT NULL DEFAULT 'customer'
                    CHECK (role IN ('customer', 'admin', 'super_admin')),
    is_verified     boolean NOT NULL DEFAULT false,
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_phone ON users (phone);
CREATE INDEX idx_users_role ON users (role);

-- =========================
-- 2. LOTTERY_DRAWS
-- =========================
CREATE TABLE lottery_draws (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id                 varchar(20) UNIQUE NOT NULL,
    draw_date_thai          varchar(100) NOT NULL,
    draw_date               date NOT NULL,
    status                  varchar(20) NOT NULL DEFAULT 'upcoming'
                            CHECK (status IN ('upcoming', 'selling', 'closed', 'resulted')),
    ticket_price_official   integer NOT NULL DEFAULT 8000,
    sale_start              timestamptz,
    sale_end                timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_draws_status ON lottery_draws (status);
CREATE INDEX idx_draws_date ON lottery_draws (draw_date DESC);

-- =========================
-- 3. TICKETS
-- =========================
CREATE TABLE tickets (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number     varchar(6) NOT NULL,
    draw_id           uuid NOT NULL REFERENCES lottery_draws(id),
    set_number        varchar(10),
    price             integer NOT NULL,
    cost              integer NOT NULL DEFAULT 8000,
    status            varchar(20) NOT NULL DEFAULT 'available'
                      CHECK (status IN ('available', 'locked', 'sold', 'prize_claimed')),
    barcode_raw       varchar(500),
    image_url         text,
    watermarked_url   text,
    locked_by         uuid REFERENCES users(id),
    locked_until      timestamptz,
    purchased_by      uuid REFERENCES users(id),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),

    UNIQUE (ticket_number, draw_id, set_number)
);

CREATE INDEX idx_tickets_number ON tickets (ticket_number);
CREATE INDEX idx_tickets_status ON tickets (status);
CREATE INDEX idx_tickets_draw ON tickets (draw_id);
CREATE INDEX idx_tickets_locked_until ON tickets (locked_until) WHERE status = 'locked';
CREATE INDEX idx_tickets_purchased_by ON tickets (purchased_by) WHERE purchased_by IS NOT NULL;
CREATE INDEX idx_tickets_number_suffix ON tickets (right(ticket_number, 2));
CREATE INDEX idx_tickets_number_suffix3 ON tickets (right(ticket_number, 3));

-- =========================
-- 4. DRAW_RESULTS
-- =========================
CREATE TABLE draw_results (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id         uuid NOT NULL REFERENCES lottery_draws(id),
    prize_type      varchar(50) NOT NULL,
    prize_name      varchar(100) NOT NULL,
    reward_amount   integer NOT NULL,
    winning_number  varchar(6) NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_results_draw ON draw_results (draw_id);
CREATE INDEX idx_results_number ON draw_results (winning_number);

-- =========================
-- 5. CART_ITEMS
-- =========================
CREATE TABLE cart_items (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id),
    ticket_id   uuid NOT NULL REFERENCES tickets(id) UNIQUE,
    locked_at   timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
    status      varchar(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'expired', 'converted')),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cart_user ON cart_items (user_id) WHERE status = 'active';
CREATE INDEX idx_cart_expires ON cart_items (expires_at) WHERE status = 'active';

-- =========================
-- 6. ORDERS
-- =========================
CREATE TABLE orders (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number        varchar(30) UNIQUE NOT NULL,
    user_id             uuid NOT NULL REFERENCES users(id),
    total_amount        integer NOT NULL,
    item_count          integer NOT NULL,
    status              varchar(20) NOT NULL DEFAULT 'pending_payment'
                        CHECK (status IN ('pending_payment', 'verifying', 'paid', 'cancelled', 'refunded')),
    payment_deadline    timestamptz NOT NULL,
    paid_at             timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user ON orders (user_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_deadline ON orders (payment_deadline) WHERE status = 'pending_payment';

-- =========================
-- 7. ORDER_ITEMS
-- =========================
CREATE TABLE order_items (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        uuid NOT NULL REFERENCES orders(id),
    ticket_id       uuid NOT NULL REFERENCES tickets(id) UNIQUE,
    price           integer NOT NULL,
    prize_status    varchar(20) NOT NULL DEFAULT 'unchecked'
                    CHECK (prize_status IN ('unchecked', 'no_prize', 'won', 'claimed', 'paid_out')),
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_ticket ON order_items (ticket_id);
CREATE INDEX idx_order_items_prize ON order_items (prize_status) WHERE prize_status = 'won';

-- =========================
-- 8. PAYMENTS
-- =========================
CREATE TABLE payments (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id          uuid NOT NULL REFERENCES orders(id),
    method            varchar(20) NOT NULL DEFAULT 'bank_transfer',
    amount            integer NOT NULL,
    slip_image_url    text,
    status            varchar(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'verified', 'rejected', 'refunded')),
    slip_data         jsonb,
    rejection_reason  text,
    verified_at       timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_order ON payments (order_id);
CREATE INDEX idx_payments_status ON payments (status);

-- =========================
-- 9. SLIP_VERIFICATIONS
-- =========================
CREATE TABLE slip_verifications (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id          uuid NOT NULL REFERENCES payments(id),
    order_id            uuid NOT NULL REFERENCES orders(id),
    transaction_id      varchar(100),
    verified_amount     integer,
    sender_account      varchar(50),
    receiver_account    varchar(50),
    transfer_datetime   timestamptz,
    result              varchar(30) NOT NULL
                        CHECK (result IN ('match', 'amount_mismatch', 'account_mismatch', 'expired', 'unreadable')),
    raw_api_response    jsonb,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_slip_payment ON slip_verifications (payment_id);

-- =========================
-- 10. PRIZE_CLAIMS
-- =========================
CREATE TABLE prize_claims (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id     uuid NOT NULL REFERENCES order_items(id),
    user_id           uuid NOT NULL REFERENCES users(id),
    prize_type        varchar(50) NOT NULL,
    prize_amount      integer NOT NULL,
    platform_fee      integer NOT NULL DEFAULT 0,
    net_amount        integer NOT NULL,
    status            varchar(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'paid_out', 'failed')),
    payout_method     varchar(20)
                      CHECK (payout_method IN ('wallet', 'bank_transfer')),
    payout_reference  varchar(100),
    claimed_at        timestamptz NOT NULL DEFAULT now(),
    paid_out_at       timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_claims_user ON prize_claims (user_id);
CREATE INDEX idx_claims_status ON prize_claims (status);

-- =========================
-- 11. WALLETS
-- =========================
CREATE TABLE wallets (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL REFERENCES users(id) UNIQUE,
    balance                 integer NOT NULL DEFAULT 0,
    total_deposited         integer NOT NULL DEFAULT 0,
    total_withdrawn         integer NOT NULL DEFAULT 0,
    total_prize_received    integer NOT NULL DEFAULT 0,
    updated_at              timestamptz NOT NULL DEFAULT now(),
    created_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT positive_balance CHECK (balance >= 0)
);

CREATE INDEX idx_wallets_user ON wallets (user_id);

-- =========================
-- 12. WALLET_TRANSACTIONS
-- =========================
CREATE TABLE wallet_transactions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id       uuid NOT NULL REFERENCES wallets(id),
    type            varchar(20) NOT NULL
                    CHECK (type IN ('deposit', 'withdrawal', 'prize_payout', 'purchase', 'refund')),
    amount          integer NOT NULL,
    balance_after   integer NOT NULL,
    reference_id    varchar(100),
    description     text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_txn_wallet ON wallet_transactions (wallet_id);
CREATE INDEX idx_wallet_txn_created ON wallet_transactions (created_at DESC);

-- =========================
-- 13. BANK_ACCOUNTS
-- =========================
CREATE TABLE bank_accounts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id),
    bank_code       varchar(10) NOT NULL,
    bank_name       varchar(100) NOT NULL,
    account_number  varchar(512) NOT NULL,
    account_name    varchar(255) NOT NULL,
    is_default      boolean NOT NULL DEFAULT false,
    is_verified     boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_accounts_user ON bank_accounts (user_id);

-- =========================
-- 14. NOTIFICATIONS
-- =========================
CREATE TABLE notifications (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id),
    type        varchar(30) NOT NULL
                CHECK (type IN ('order_paid', 'prize_won', 'prize_payout', 'cart_expiring', 'system')),
    title       varchar(255) NOT NULL,
    body        text NOT NULL,
    is_read     boolean NOT NULL DEFAULT false,
    metadata    jsonb,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications (created_at DESC);

-- =========================
-- 15. PLATFORM_SETTINGS
-- =========================
CREATE TABLE platform_settings (
    key         varchar(100) PRIMARY KEY,
    value       jsonb NOT NULL,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (key, value) VALUES
    ('platform_fee_percent', '5'::jsonb),
    ('cart_lock_duration_seconds', '900'::jsonb),
    ('max_cart_items', '10'::jsonb),
    ('platform_bank_account', '{"bank": "SCB", "account_number": "xxx-x-xxxxx-x", "account_name": "บจ. ลอตโต้"}'::jsonb),
    ('slip_verification_provider', '"slipok"'::jsonb);

-- =========================
-- Auto-update updated_at trigger
-- =========================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tickets_updated_at
    BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_wallets_updated_at
    BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =========================
-- Row Level Security (RLS)
-- =========================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users: can read own profile
CREATE POLICY "users_select_own" ON users
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Tickets: anyone can read available tickets
CREATE POLICY "tickets_select_public" ON tickets
    FOR SELECT USING (true);

-- Cart: users can manage own cart
CREATE POLICY "cart_select_own" ON cart_items
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cart_insert_own" ON cart_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cart_update_own" ON cart_items
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cart_delete_own" ON cart_items
    FOR DELETE USING (auth.uid() = user_id);

-- Orders: users can read own orders
CREATE POLICY "orders_select_own" ON orders
    FOR SELECT USING (auth.uid() = user_id);

-- Order items: users can read items from own orders
CREATE POLICY "order_items_select_own" ON order_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
    );

-- Payments: users can read own payments
CREATE POLICY "payments_select_own" ON payments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid())
    );

-- Prize claims: users can read own claims
CREATE POLICY "prize_claims_select_own" ON prize_claims
    FOR SELECT USING (auth.uid() = user_id);

-- Wallets: users can read own wallet
CREATE POLICY "wallets_select_own" ON wallets
    FOR SELECT USING (auth.uid() = user_id);

-- Wallet transactions: users can read own transactions
CREATE POLICY "wallet_txn_select_own" ON wallet_transactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM wallets WHERE wallets.id = wallet_transactions.wallet_id AND wallets.user_id = auth.uid())
    );

-- Bank accounts: users can manage own bank accounts
CREATE POLICY "bank_accounts_select_own" ON bank_accounts
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bank_accounts_insert_own" ON bank_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bank_accounts_update_own" ON bank_accounts
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bank_accounts_delete_own" ON bank_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Notifications: users can read own notifications
CREATE POLICY "notifications_select_own" ON notifications
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);
