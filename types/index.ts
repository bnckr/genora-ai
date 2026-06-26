export type GenerationFeature =
  | 'image' | 'video' | 'avatar' | 'voice' | 'music'
  | 'image_edit' | 'video_edit' | 'prompt_enhance'

export type GenerationStatus =
  | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export type CreditTransactionType = 'credit' | 'debit'

export type SubscriptionStatus =
  | 'active' | 'trialing' | 'past_due' | 'cancelled' | 'unpaid'

export type AssetType = 'image' | 'video' | 'audio' | 'avatar'

export interface Plan {
  id: string
  name: string
  price_brl_cents: number
  credits_monthly: number
  features: {
    hd: boolean
    watermark: boolean
    api_access: boolean
    team: boolean
  }
  is_active: boolean
  sort_order: number
}

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  plan_id: string
  credits_balance: number
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  stripe_subscription_id: string | null
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  thumbnail_url: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface Generation {
  id: string
  user_id: string
  project_id: string | null
  feature: GenerationFeature
  prompt: string
  model: string
  provider: string
  status: GenerationStatus
  credits_used: number
  cost_usd: number | null
  job_id: string | null
  error_msg: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  generation_id: string
  user_id: string
  storage_path: string
  cdn_url: string
  type: AssetType
  size_bytes: number | null
  width: number | null
  height: number | null
  duration_sec: number | null
  is_public: boolean
  created_at: string
}

export interface CreditTransaction {
  id: string
  user_id: string
  amount: number
  type: CreditTransactionType
  reason: string
  generation_id: string | null
  stripe_invoice_id: string | null
  balance_after: number
  created_at: string
}

export interface CreditCost {
  id: string
  feature: GenerationFeature
  model: string
  credits: number
  description: string | null
}

// API response wrappers
export type ApiSuccess<T> = { data: T; error: null }
export type ApiError = { data: null; error: string }
export type ApiResponse<T> = ApiSuccess<T> | ApiError
