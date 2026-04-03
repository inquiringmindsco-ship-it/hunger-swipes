-- Vendors table (independent food sellers)
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_name TEXT NOT NULL,
  description TEXT,
  price_range TEXT CHECK (price_range IN ('$', '$$', '$$$')),
  photo_url TEXT,
  location_text TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  is_open BOOLEAN DEFAULT true,
  payment_methods TEXT[], -- ['cash', 'cashapp', 'venmo', 'card']
  hours_text TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'removed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor activity log (for "verified recently" indicator)
CREATE TABLE IF NOT EXISTS vendor_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  activity_type TEXT CHECK (activity_type IN ('created', 'updated', 'location_confirmed', 'photo_added')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User reports on vendors
CREATE TABLE IF NOT EXISTS vendor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  report_type TEXT CHECK (report_type IN ('closed', 'moved', 'wrong_info', 'other')),
  user_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator referral tracking (future)
CREATE TABLE IF NOT EXISTS vendor_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id TEXT REFERENCES profiles(id),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  referred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for nearby vendor search
CREATE INDEX IF NOT EXISTS vendors_location ON vendors(latlng, status);
CREATE INDEX IF NOT EXISTS vendors_active ON vendors(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS vendor_activity_recent ON vendor_activity(vendor_id, created_at DESC);
