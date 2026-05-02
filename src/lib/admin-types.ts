/**
 * Shared TypeScript types and interfaces for admin panel
 * Extracted from the monolithic admin/page.tsx
 */

export interface UserWithPremium {
  id: number;
  username: string;
  email: string;
  role_id: number;
  status: 'pending' | 'approved' | 'rejected';
  total_points: number;
  current_streak: number;
  created_at: string;
  is_premium: boolean;
  premium_code: string | null;
  code_expires_at: string | null;
}

export interface Module {
  id: number;
  title: string;
  description: string;
  is_premium: boolean;
  completion_bonus_points: number;
  created_at: string;
}

export interface Lesson {
  lesson_id: number;
  module_id: number;
  title: string;
  content: string;
  github_url: string | null;
  video_url: string | null;
  image_url: string | null;
  order_index: number;
  has_exam?: boolean;
}

export interface Exam {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  created_at: string;
  questions?: ExamQuestion[];
}

export interface ExamQuestion {
  id: number;
  exam_id: number;
  question_type: 'mcq' | 'checkbox' | 'fitb' | 'challenge';
  question_text: string;
  points: number;
  challenge_id: number | null;
  options?: ExamOption[];
}

export interface ExamOption {
  id: number;
  question_id: number;
  option_text: string;
  is_correct: boolean;
}

export interface ChallengeFlag {
  id?: number;
  flag: string;
  is_case_insensitive: boolean;
  allow_variations: boolean;
}

export interface ChallengeUrl {
  id?: number;
  url: string;
  display_name: string;
}

export interface Challenge {
  id: number;
  module_id: number;
  title: string;
  description: string;
  max_points: number;
  min_points: number;
  decay_limit: number;
  is_premium: boolean;
  difficulty_level: string;
  prerequisite_id: number | null;
  created_at: string;
  flags: ChallengeFlag[];
  urls: ChallengeUrl[];
}

export interface Resource {
  id: number;
  title: string;
  description: string;
  url: string;
  category: string;
  created_at: string;
  urls?: Array<{ id: number; url: string; display_name?: string; url_order: number }>;
}

export interface UpgradeCode {
  id: number;
  code: string;
  validity_months: number;
  created_at: string;
  expires_at: string | null;
  is_used: boolean;
  used_by_user_id: number | null;
  used_at: string | null;
  is_reusable: boolean;
  is_active: boolean;
  deleted_at: string | null;
  is_custom: boolean;
  payment_method?: string | null;
  price_tk?: number;
  usage_limit: number;
  usage_count: number;
}

export interface Event {
  id: number;
  title: string;
  type: string;
  description: string;
  slug?: string;
  event_code?: string;
  event_type: "online" | "offline" | "hybrid";
  event_date: string;
  event_time: string;
  location?: string;
  platform_name?: string;
  meeting_link?: string;
  capacity?: number;
  registered_count: number;
  is_premium: boolean;
  target_audience?: 'free' | 'premium' | 'all';
  photo_url?: string;
  gallery_images?: string;
  exclusivity_expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PaymentRequest {
  id: number;
  user_id: number;
  username: string;
  email: string;
  plan: string;
  amount: number;
  payment_method: string;
  transaction_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: number;
  rejection_reason?: string;
}

export interface CodeStats {
  total: number;
  unused: number;
  used: number;
}

export interface Message {
  type: "success" | "error";
  text: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}
