-- ENUMS

CREATE TYPE user_type AS ENUM ('fund_raiser', 'donee', 'user_admin', 'platform_management');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned');
CREATE TYPE fra_status AS ENUM ('draft', 'active', 'completed', 'expired', 'cancelled');
CREATE TYPE donation_status AS ENUM ('pending', 'completed', 'flagged', 'refunded');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');
CREATE TYPE report_period AS ENUM ('daily', 'weekly', 'monthly');

-- USERS

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  user_type user_type NOT NULL,
  status user_status DEFAULT 'active',
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  avatar_url TEXT,
  preferred_language VARCHAR(10) DEFAULT 'en',
  violation_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CATEGORIES

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FUND RAISING ACTIVITIES

CREATE TABLE IF NOT EXISTS fund_raising_activities (
  id SERIAL PRIMARY KEY,
  fund_raiser_id INT REFERENCES users(id) ON DELETE CASCADE,
  category_id INT REFERENCES categories(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_amount NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) DEFAULT 0,
  status fra_status DEFAULT 'active',
  end_date DATE NOT NULL,
  location_text VARCHAR(255),
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  view_count INT DEFAULT 0,
  shortlist_count INT DEFAULT 0,
  impact_score NUMERIC(3,2) DEFAULT 0,
  is_spike_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DONATIONS

CREATE TABLE IF NOT EXISTS donations (
  id SERIAL PRIMARY KEY,
  fra_id INT REFERENCES fund_raising_activities(id) ON DELETE CASCADE,
  donor_id INT REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL,
  status donation_status DEFAULT 'completed',
  is_anonymous BOOLEAN DEFAULT FALSE,
  message TEXT,
  flagged_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PAYMENT DETAILS

CREATE TABLE IF NOT EXISTS payment_details (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  card_last_four CHAR(4),
  card_brand VARCHAR(50),
  payment_token VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FAVORITES

CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  fra_id INT REFERENCES fund_raising_activities(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, fra_id)
);

-- RATINGS

CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  donor_id INT REFERENCES users(id),
  fra_id INT REFERENCES fund_raising_activities(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (donor_id, fra_id)
);

-- CAMPAIGN UPDATES

CREATE TABLE IF NOT EXISTS campaign_updates (
  id SERIAL PRIMARY KEY,
  fra_id INT REFERENCES fund_raising_activities(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- THANK YOU MESSAGES

CREATE TABLE IF NOT EXISTS thank_you_messages (
  id SERIAL PRIMARY KEY,
  fra_id INT REFERENCES fund_raising_activities(id),
  fund_raiser_id INT REFERENCES users(id),
  donor_id INT REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- REPORTED CAMPAIGNS

CREATE TABLE IF NOT EXISTS reported_campaigns (
  id SERIAL PRIMARY KEY,
  fra_id INT REFERENCES fund_raising_activities(id),
  reported_by INT REFERENCES users(id),
  reason TEXT NOT NULL,
  status report_status DEFAULT 'pending',
  reviewed_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP
);

-- USER VIOLATIONS

CREATE TABLE IF NOT EXISTS user_violations (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  type VARCHAR(100),
  description TEXT,
  actioned_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USER PREFERENCES

CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  preferred_categories INT[],
  preferred_location VARCHAR(255),
  max_distance_km INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PLATFORM REPORTS

CREATE TABLE IF NOT EXISTS platform_reports (
  id SERIAL PRIMARY KEY,
  period report_period NOT NULL,
  report_date DATE NOT NULL,
  new_fras INT DEFAULT 0,
  total_donations NUMERIC(12,2) DEFAULT 0,
  active_users INT DEFAULT 0,
  new_users INT DEFAULT 0,
  generated_by INT REFERENCES users(id),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES

CREATE INDEX IF NOT EXISTS idx_fra_status ON fund_raising_activities(status);
CREATE INDEX IF NOT EXISTS idx_fra_category ON fund_raising_activities(category_id);
CREATE INDEX IF NOT EXISTS idx_fra_end_date ON fund_raising_activities(end_date);
CREATE INDEX IF NOT EXISTS idx_fra_fund_raiser ON fund_raising_activities(fund_raiser_id);
CREATE INDEX IF NOT EXISTS idx_fra_location ON fund_raising_activities(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_donations_fra ON donations(fra_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE INDEX IF NOT EXISTS idx_fra_search ON fund_raising_activities
  USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- SEED: DEFAULT CATEGORIES

INSERT INTO categories (name, slug) VALUES
  ('Medical', 'medical'),
  ('Education', 'education'),
  ('Disaster Relief', 'disaster-relief'),
  ('Animals', 'animals'),
  ('Community', 'community'),
  ('Environment', 'environment'),
  ('Sports', 'sports'),
  ('Arts & Culture', 'arts-culture'),
  ('Tech & Innovation', 'tech-innovation'),
  ('Other', 'other')
ON CONFLICT (slug) DO NOTHING;

-- SEED: TEST ACCOUNTS (all roles)

INSERT INTO users (email, password_hash, user_type, full_name, status, violation_count) VALUES
  ('donee@sim.com',                  encode(sha256('donee'::bytea), 'hex'),                  'donee',                'Donee User',                'active', 0),
  ('fundraiser@sim.com',             encode(sha256('fundraiser'::bytea), 'hex'),             'fund_raiser',          'Fund Raiser User',          'active', 0),
  ('admin@sim.com',                  encode(sha256('admin'::bytea), 'hex'),                  'user_admin',           'Admin',                     'active', 0),
  ('platformmanagement@sim.com',     encode(sha256('platformmanagement'::bytea), 'hex'),     'platform_management',  'Platform Management',       'active', 0)
ON CONFLICT (email) DO NOTHING;

-- SEED: TEST FUND RAISING ACTIVITIES
-- fund_raiser_id=2 corresponds to fundraiser@sim.com (second user inserted above)

INSERT INTO fund_raising_activities (fund_raiser_id, category_id, title, description, target_amount, current_amount, end_date, location_text, status) VALUES
  (2, 1, 'Help Sick Children in Singapore', 'Support children battling serious illnesses. Every donation helps cover medical bills and treatment costs for families in need.', 15000.00, 3200.00, '2026-12-31', 'Singapore', 'active'),
  (2, 3, 'Penang Flood Relief', 'Emergency relief for families affected by the Penang floods. Funds go towards food, shelter, and rebuilding homes.', 10000.00, 6750.00, '2026-12-31', 'Penang, Malaysia', 'active'),
  (2, 4, 'Animal Rescue Fund', 'Supporting local animal shelters and rescue operations. Help us provide food, medical care, and shelter for abandoned animals.', 5000.00, 1100.00, '2026-12-31', 'Singapore', 'active'),
  (2, 2, 'Bursary for SIM Students', 'Help underprivileged students at SIM complete their degrees. Funds go directly to tuition and living expenses.', 20000.00, 8000.00, '2026-12-31', 'Singapore', 'active')
ON CONFLICT DO NOTHING;
