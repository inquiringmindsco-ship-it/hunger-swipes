// Shared types for HungerSwipes platform

// ============================================================
// USER / CREATOR ROLES
// ============================================================
export type UserRole = 
  | 'eater'           // Basic user, swipe and order
  | 'scout'            // Posts only, no monetization
  | 'home_creator'     // Posts + tips + recipes (no food sales)
  | 'cottage_creator'  // Limited legal food sales
  | 'verified_creator' // Full verified kitchen, can sell
  | 'restaurant'       // Restaurant account

// ============================================================
// CONTENT TYPES
// ============================================================
export type ContentLabel = 
  | 'discovery'      // Basic swipe content
  | 'trending'       // High engagement
  | 'monetized'      // Has paid recipe attached
  | 'verified_kitchen' // From verified seller

// ============================================================
// VERIFICATION STATUS
// ============================================================
export type VerificationStatus = 
  | 'none'
  | 'pending'
  | 'approved'
  | 'rejected'

// ============================================================
// PROFILE
// ============================================================
export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  role: UserRole
  username: string
  bio?: string
  commission_rate: number
  total_earnings: number
  pending_earnings: number
  // Expanded fields
  follower_count: number
  following_count: number
  post_count: number
  // Verification
  verification_status: VerificationStatus
  business_name?: string
  kitchen_type?: string
  has_kitchen?: boolean
  needs_kitchen?: boolean
  // Compliance
  agreed_to_terms: boolean
  terms_agreed_at?: string
  // Timestamps
  created_at: string
  updated_at: string
}

// ============================================================
// PHOTO / POST
// ============================================================
export interface Photo {
  id: string
  creator_id: string
  image_url: string
  thumbnail_url?: string
  title?: string
  description?: string
  // Tags
  tags: string[]
  dietary_tags: string[]
  ingredient_tags: string[]
  cuisine_tags: string[]
  // Nutrition
  calories?: number
  protein_grams?: number
  carbs_grams?: number
  fat_grams?: number
  // Details
  spice_level?: number  // 1-5
  portion_size?: 'light' | 'regular' | 'large' | 'shareable'
  location_text?: string
  price?: number
  // Dietary options
  vegetarian_option: boolean
  vegan_option: boolean
  gluten_free_option: boolean
  // Categorization
  health_category?: 'healthy' | 'indulgent' | 'balanced' | 'protein-packed' | 'light'
  // Original fields
  restaurant_name: string
  restaurant_location?: string
  restaurant_lat?: number
  restaurant_lng?: number
  dish_name: string
  cuisine_type?: string
  price_range?: '$' | '$$' | '$$$' | '$$$$'
  commission_rate: number
  // Scoring
  hunger_score: number
  completeness_score: number
  viral_score: number
  content_label: ContentLabel
  // Stats
  swipes_total: number
  swipes_right: number
  super_hungers: number
  saves: number
  orders: number
  earnings_total: number
  // Status
  status: 'active' | 'pending' | 'removed'
  created_at: string
  updated_at: string
  metadata_updated_at?: string
  // Relations
  creator?: Profile
}

// ============================================================
// PHOTO METADATA (Extended, one-to-one)
// ============================================================
export interface PhotoMetadata {
  id: string
  photo_id: string
  title?: string
  description?: string
  tags: string[]
  dietary_tags: string[]
  ingredient_tags: string[]
  cuisine_tags: string[]
  calories?: number
  protein_grams?: number
  carbs_grams?: number
  fat_grams?: number
  spice_level?: number
  portion_size?: string
  location_text?: string
  price?: number
  vegetarian_option: boolean
  vegan_option: boolean
  gluten_free_option: boolean
  health_category?: string
  completeness_score: number
  metadata_quality_status: 'basic' | 'enhanced' | 'top-tier'
  created_at: string
  updated_at: string
}

// ============================================================
// SWIPES
// ============================================================
export interface Swipe {
  id: string
  eater_id: string
  photo_id: string
  direction: 'left' | 'right' | 'up'
  created_at: string
}

// ============================================================
// MATCHES
// ============================================================
export interface Match {
  id: string
  eater_id: string
  photo_id: string
  created_at: string
  photo?: Photo
}

// ============================================================
// ORDERS
// ============================================================
export interface Order {
  id: string
  photo_id: string
  eater_id: string
  creator_id: string
  restaurant_name: string
  dish_name: string
  dish_price: number
  commission_rate: number
  commission_amount: number
  platform_fee: number
  creator_earnings: number
  creator_rate: number  // Locked at order time
  payout_tier: 'basic' | 'enhanced' | 'top-tier'
  completeness_score: number  // Locked at order time
  status: 'pending' | 'completed' | 'refunded'
  order_url?: string
  created_at: string
  photo?: Photo
}

// ============================================================
// EARNINGS LEDGER
// ============================================================
export interface Earning {
  id: string
  creator_id: string
  photo_id: string
  order_id: string
  recipe_id?: string
  tip_id?: string
  amount: number
  source: 'order' | 'recipe' | 'tip'
  status: 'pending' | 'paid'
  created_at: string
  paid_at?: string
}

// ============================================================
// TIPS (Support / Proud to Pay)
// ============================================================
export interface Tip {
  id: string
  sender_id: string    // eater who sent
  creator_id: string   // creator who received
  photo_id?: string    // optional, associated post
  amount: number
  message?: string
  status: 'pending' | 'completed' | 'failed'
  created_at: string
}

// ============================================================
// RECIPES (Paid recipes attached to posts)
// ============================================================
export interface Recipe {
  id: string
  photo_id: string
  creator_id: string
  recipe_title: string
  ingredients: string[]
  steps: string[]
  prep_time_minutes?: number
  cook_time_minutes?: number
  price: number        // 0 = free, >0 = paid
  purchase_count: number
  revenue_total: number
  status: 'active' | 'removed'
  created_at: string
  updated_at: string
}

export interface RecipePurchase {
  id: string
  recipe_id: string
  buyer_id: string
  amount_paid: number
  creator_earnings: number
  platform_fee: number
  created_at: string
}

// ============================================================
// FOLLOWERS
// ============================================================
export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

// ============================================================
// COMMENTS
// ============================================================
export interface Comment {
  id: string
  photo_id: string
  user_id: string
  content: string
  parent_id?: string  // for threaded replies
  reply_count: number
  created_at: string
  updated_at: string
  user?: Profile
}

// ============================================================
// REACTIONS
// ============================================================
export interface Reaction {
  id: string
  photo_id: string
  user_id: string
  reaction_type: 'love' | 'hungry' | 'yum' | 'wow'
  created_at: string
}

// ============================================================
// FOOD MOODS (Social posts)
// ============================================================
export interface FoodMood {
  id: string
  user_id: string
  content: string        // "What I'm craving" text
  is_public: boolean
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string
  user?: Profile
}

// ============================================================
// CREATOR VERIFICATION
// ============================================================
export interface CreatorVerification {
  id: string
  creator_id: string
  business_name: string
  business_permit?: string
  kitchen_type: 'home' | 'commercial' | 'shared' | 'pop-up'
  kitchen_address?: string
  kitchen_lat?: number
  kitchen_lng?: number
  needs_kitchen_assistance: boolean
  status: VerificationStatus
  rejection_reason?: string
  submitted_at?: string
  reviewed_at?: string
  created_at: string
  updated_at: string
}

// ============================================================
// PAYOUT TIERS
// ============================================================
export interface PayoutTier {
  tier: 'basic' | 'enhanced' | 'top-tier'
  tierLabel: string
  creatorRate: number
  color: string
  description: string
}

// ============================================================
// EATER PREFERENCES
// ============================================================
export interface EaterPreferences {
  dietaryRestrictions: string[]
  favoriteCuisines: string[]
  priceRange: string[]
  spicePreference: number
  healthFocus: string[]
  excludeIngredients: string[]
  minCalories?: number
  maxCalories?: number
}

// ============================================================
// RANKING
// ============================================================
export interface RankingFactors {
  hungerScore: number
  completenessScore: number
  viralScore: number
  createdAt: Date
  orderVelocity: number
}

export interface RankingResult {
  rankScore: number
  breakdown: {
    hungerComponent: number
    completenessComponent: number
    viralComponent: number
    recencyComponent: number
    velocityComponent: number
  }
}
