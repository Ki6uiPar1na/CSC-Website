-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

-- Users Table
-- role_id: 1=admin (full access), 2=instructor (unused), 3=user (default, regular user)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT DEFAULT 3,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  subscription_status ENUM('active', 'inactive', 'canceled') DEFAULT 'inactive',
  subscription_expires_at TIMESTAMP NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  rejection_reason TEXT,
  otp_code VARCHAR(255),
  otp_expires_at TIMESTAMP NULL,
  total_points INT DEFAULT 0,
  score INT DEFAULT 0,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Modules Table
CREATE TABLE IF NOT EXISTS modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completion_bonus_points INT DEFAULT 100,
  is_premium BOOLEAN DEFAULT FALSE,
  instructor_id INT,
  name VARCHAR(255),
  completed_by_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lessons Table
CREATE TABLE IF NOT EXISTS lessons (
  lesson_id INT AUTO_INCREMENT PRIMARY KEY,
  module_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT,
  github_url VARCHAR(500),
  video_url VARCHAR(500),
  image_url LONGTEXT,
  order_index INT DEFAULT 0,
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

-- Exams Table
CREATE TABLE IF NOT EXISTS exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lesson_id INT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE CASCADE
);

-- Exam Questions Table
CREATE TABLE IF NOT EXISTS exam_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam_id INT NOT NULL,
  question_type ENUM('mcq', 'checkbox', 'fitb', 'challenge') NOT NULL,
  question_text TEXT NOT NULL,
  points INT DEFAULT 0,
  challenge_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE SET NULL
);

-- MCQ Options Table
CREATE TABLE IF NOT EXISTS exam_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (question_id) REFERENCES exam_questions(id) ON DELETE CASCADE
);

-- Exam Submissions Table
CREATE TABLE IF NOT EXISTS exam_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  exam_id INT NOT NULL,
  question_id INT NOT NULL,
  answer_text TEXT,
  is_correct BOOLEAN DEFAULT FALSE,
  points_awarded INT DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES exam_questions(id) ON DELETE CASCADE
);

-- Challenges/Tasks Table (using flag_hash)
CREATE TABLE IF NOT EXISTS challenges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  module_id INT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  flag VARCHAR(255),
  flag_hash VARCHAR(255),
  max_points INT DEFAULT 500,
  min_points INT DEFAULT 50,
  decay_limit INT DEFAULT 50,
  solve_count INT DEFAULT 0,
  current_points INT DEFAULT 500,
  is_premium BOOLEAN DEFAULT FALSE,
  instructor_id INT,
  points INT,
  difficulty_level ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  prerequisite_id INT NULL,
  FOREIGN KEY (module_id) REFERENCES modules(id)
);

-- Challenge URLs Table
CREATE TABLE IF NOT EXISTS challenge_urls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  challenge_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (challenge_id),
  FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
);

-- Challenge Flags Table
CREATE TABLE IF NOT EXISTS challenge_flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  challenge_id INT NOT NULL,
  flag VARCHAR(255) NOT NULL,
  is_case_insensitive BOOLEAN DEFAULT FALSE,
  allow_variations BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (challenge_id),
  FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
);

-- Submissions/Solves Table
CREATE TABLE IF NOT EXISTS solves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  challenge_id INT,
  solved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  points_awarded INT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (challenge_id) REFERENCES challenges(id),
  UNIQUE KEY unique_solve (user_id, challenge_id)
);

-- Submissions Table (general tracking)
CREATE TABLE IF NOT EXISTS submissions (
  submission_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  task_id INT NOT NULL,
  submitted_flag VARCHAR(255),
  is_correct BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Daily Activity Table
CREATE TABLE IF NOT EXISTS user_daily_activity (
  activity_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  activity_date DATE NOT NULL,
  tasks_solved INT DEFAULT 0,
  points_earned INT DEFAULT 0,
  UNIQUE KEY unique_daily_activity (user_id, activity_date),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Upgrade Codes Table
CREATE TABLE IF NOT EXISTS upgrade_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  validity_months INT NOT NULL DEFAULT 1,
  created_by_admin_id INT NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_by_user_id INT NULL,
  used_at TIMESTAMP NULL,
  is_reusable BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMP NULL,
  is_custom BOOLEAN DEFAULT FALSE,
  payment_method VARCHAR(50),
  price_tk DECIMAL(10, 2) DEFAULT 0,
  usage_limit INT DEFAULT 1,
  usage_count INT DEFAULT 0,
  FOREIGN KEY (created_by_admin_id) REFERENCES users(id),
  FOREIGN KEY (used_by_user_id) REFERENCES users(id)
);

-- Upgrade Code Usage Tracking
CREATE TABLE IF NOT EXISTS upgrade_code_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  upgrade_code_id INT NOT NULL,
  user_id INT NOT NULL,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (upgrade_code_id) REFERENCES upgrade_codes(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_code_user (upgrade_code_id, user_id)
);

-- Resources Table
CREATE TABLE IF NOT EXISTS resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  url VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  action VARCHAR(50) DEFAULT 'Read',
  is_external BOOLEAN DEFAULT TRUE,
  created_by_admin_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_admin_id) REFERENCES users(id)
);

-- Resource URLs Table
CREATE TABLE IF NOT EXISTS resource_urls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  display_name VARCHAR(255),
  url_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

-- Site Settings Table
CREATE TABLE IF NOT EXISTS site_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Events Table
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  description TEXT,
  slug VARCHAR(255) UNIQUE NOT NULL,
  event_code VARCHAR(50) UNIQUE NOT NULL,
  event_type ENUM('online', 'offline', 'hybrid') DEFAULT 'online',
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  location VARCHAR(255),
  platform_name VARCHAR(100),
  meeting_link VARCHAR(500),
  capacity INT,
  registered_count INT DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  target_audience ENUM('free', 'premium', 'all') DEFAULT 'all',
  photo_url LONGTEXT,
  gallery_images LONGTEXT,
  exclusivity_expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  convert_to_contest BOOLEAN DEFAULT FALSE,
  is_converted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Payment Requests Table
CREATE TABLE IF NOT EXISTS payment_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(255) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  reviewed_by INT NULL,
  rejection_reason TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id),
  INDEX idx_status (status),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- User Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  type ENUM('payment_rejected', 'payment_approved', 'premium_activated', 'system', 'event_update', 'resource_update', 'challenge_update', 'broadcast') DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT DEFAULT 0,
  target_audience ENUM('user', 'all_users', 'premium_users', 'non_premium_users') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  INDEX idx_target_audience (target_audience)
);

-- Broadcast Logs Table
CREATE TABLE IF NOT EXISTS broadcast_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  target_audience ENUM('all', 'premium', 'non-premium') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message LONGTEXT NOT NULL,
  recipients_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_admin_id (admin_id),
  INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS lesson_completion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lesson_id INT NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY user_lesson (user_id, lesson_id),
  INDEX (user_id),
  INDEX (lesson_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resource_completions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  resource_id INT NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY user_resource (user_id, resource_id),
  INDEX (user_id),
  INDEX (resource_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

-- Executives Table
CREATE TABLE IF NOT EXISTS executives (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  bio TEXT,
  photo_url LONGTEXT,
  year_joined INT,
  session VARCHAR(50) DEFAULT '2026-2027',
  social_links LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Alumni Table
CREATE TABLE IF NOT EXISTS alumni (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  graduation_year INT NOT NULL,
  session VARCHAR(50) DEFAULT '2021-2022',
  role_title VARCHAR(255),
  bio TEXT,
  photo_url LONGTEXT,
  achievements TEXT,
  social_links LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Contests Table
CREATE TABLE IF NOT EXISTS contests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATETIME,
  winners LONGTEXT,
  photo_url LONGTEXT,
  details TEXT,
  team_id INT NULL,
  ctftime_event_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed initial roles
INSERT IGNORE INTO roles (role_id, name) VALUES 
(1, 'admin'),
(2, 'instructor'),
(3, 'user');

-- Competition Achievements Table
-- Competition Achievements Table with Team Info
CREATE TABLE IF NOT EXISTS competition_achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  competition_name VARCHAR(255) NOT NULL,
  contest_name VARCHAR(255) NOT NULL,
  team_name VARCHAR(255),
  team_members LONGTEXT,
  is_team_contest BOOLEAN DEFAULT TRUE,
  position INT,
  prize_money INT,
  description TEXT,
  gallery_images LONGTEXT,
  achievement_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_competition_name (competition_name),
  INDEX idx_achievement_date (achievement_date)
);

-- Sample Achievement Data with Team Info
INSERT INTO competition_achievements (competition_name, contest_name, team_name, team_members, is_team_contest, position, prize_money, description, achievement_date) VALUES
('National CTF Championship 2025', 'Inter-University CTF Finals', 'JKKNIU Elite Squad', 'Md. Hasan Ali, Fatima Rahman, Karim Hassan, Nusrat Jahan', 1, 1, 500000, 'Our core team secured the top position in the annual national level CTF competition with a perfect score. This was a significant achievement after months of preparation and practice.', '2026-04-15'),

('National CTF Championship 2025', 'University Round - Qualifiers', 'JKKNIU Blue Team', 'Md. Hasan Ali, Fatima Rahman, Karim Hassan', 1, 2, 50000, 'Strong performance in preliminary rounds helped our team advance to the finals. We solved 18 out of 20 challenges correctly.', '2026-03-22'),

('National CTF Championship 2025', 'Online Preliminaries', 'JKKNIU Red Team', 'Nusrat Jahan, Ahmed Khan, Sofia Amin, Rashed Khan', 1, 1, 75000, 'First position among 500+ teams participating online. Our team demonstrated exceptional problem-solving skills.', '2026-03-01'),

('International Cyber Challenge 2025', 'Global Competition Round 1', 'JKKNIU Global', 'Md. Hasan Ali, Fatima Rahman, Karim Hassan, Nusrat Jahan, Ahmed Khan', 1, 3, 150000, 'Ranked among top global teams in the 48-hour intense hacking marathon. We competed against 2000+ teams worldwide.', '2026-02-10'),

('International Cyber Challenge 2025', 'Asia Regional Finals', 'JKKNIU Asia Warriors', 'Fatima Rahman, Ahmed Khan, Sofia Amin', 1, 1, 200000, 'Won first place in the Asia Regional competition, defeating 45 teams from across Asia.', '2025-12-15'),

('JKKNIU Internal Competitions', 'Beginner Level CTF', 'Team Phoenix', 'Md. Hasan Ali, Rashed Khan', 1, 1, 25000, 'First position in the beginner level internal competition organized for students new to cybersecurity.', '2025-11-20'),

('JKKNIU Internal Competitions', 'Advanced Level CTF', 'Elite Coders', 'Fatima Rahman, Ahmed Khan, Sofia Amin', 1, 2, 40000, 'Second position in the advanced level competition among senior club members.', '2025-10-05'),

('Bug Bounty Programs', 'Critical Vulnerability Discovery', 'Md. Hasan Ali', 'Solo - Found critical vulnerability in government portal', 0, NULL, 300000, 'Identified and responsibly disclosed a critical vulnerability in a major government portal. Received recognition and reward.', '2025-09-12'),

('Regional Cybersecurity Summit 2025', 'Capture The Flag', 'JKKNIU Summit Team', 'Karim Hassan, Nusrat Jahan, Ahmed Khan', 1, 1, 100000, 'Winner of the CTF competition at the Regional Cybersecurity Summit with 95% accuracy rate.', '2025-08-30');

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  ctftime_team_id INT NULL,
  ctftime_logo VARCHAR(500) NULL,
  ctftime_country VARCHAR(100) NULL,
  ctftime_primary_alias VARCHAR(255) NULL,
  ctftime_rating JSON NULL,
  ctftime_members JSON NULL,
  ctftime_last_fetched DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user (user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id)
);

-- Event RSVPs Table
CREATE TABLE IF NOT EXISTS event_rsvps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  rsvp_status ENUM('going', 'maybe', 'interested') DEFAULT 'going',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_event (user_id, event_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
