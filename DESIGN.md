# Database Design

## 1. Database Schema

The database is designed to support a Capture The Flag (CTF) platform with role-based access control, subscription-based premium content, modular learning paths, a competitive leaderboard, and user consistency tracking.

### 1.1 Tables

#### 1. `roles`
*   `role_id` (PK, Integer, Auto-increment)
*   `name` (String, Unique) - e.g., `admin`, `instructor`, `user`
*   *Constraint: Application-level check to ensure only one user holds the 'admin' role.*

#### 2. `users`
*   `user_id` (PK, UUID/Integer)
*   `role_id` (FK -> `roles.role_id`)
*   `email_address` (String, Unique, Not Null)
*   `username` (String, Unique, Not Null)
*   `subscription_status` (Enum) - `active`, `inactive`, `canceled`
*   `subscription_expires_at` (Timestamp) - `max(today + amount/price, last_subscription_date + amount/price)`
*   `otp_code` (String, Nullable) - Bcrypt/Argon2 hashed 6-digit code for secure login/registration
*   `otp_expires_at` (Timestamp, Nullable) - Set to generation time + 5 mins
*   `total_points` (Integer, Default 0) - Cached sum for leaderboard performance
*   `current_streak` (Integer, Default 0) - Number of consecutive days with at least one successful submission
*   `longest_streak` (Integer, Default 0) - The user's all-time highest consecutive day streak
*   `last_active_date` (Date, Nullable) - The date of their most recent successful submission
*   `created_at` (Timestamp, Default `now()`)
*   `updated_at` (Timestamp, Default `now()`)

#### 3. `payments`
*   `payment_id` (PK, UUID/Integer)
*   `user_id` (FK -> `users.user_id`)
*   `transaction_id` (String, Unique) - From payment gateway
*   `amount` (Decimal, 10, 2)
*   `currency` (String, 3 chars) - e.g., 'USD'
*   `status` (Enum) - `pending`, `completed`, `failed`
*   `payment_date` (Timestamp, Default `now()`)

#### 4. `modules` (Courses/Categories)
*   `module_id` (PK, Integer)
*   `instructor_id` (FK -> `users.user_id`) - The lead instructor for the module
*   `name` (String)
*   `description` (Text)
*   `is_premium` (Boolean, Default `false`)
*   `completed_by_count` (Integer, Default 0) - Cached count of users who finished all tasks/lessons
*   `created_at` (Timestamp)

#### 5. `lessons` (Instructional Content)
*   `lesson_id` (PK, Integer)
*   `module_id` (FK -> `modules.module_id`)
*   `title` (String)
*   `content` (Text/Markdown)
*   `order_index` (Integer) - For sequencing within a module

#### 6. `tasks` (CTF Challenges)
*   `task_id` (PK, Integer)
*   `module_id` (FK -> `modules.module_id`, Nullable) - Can be standalone or part of a module
*   `instructor_id` (FK -> `users.user_id`) - Allows individual tasks to be written by different instructors
*   `title` (String)
*   `description` (Text/Markdown)
*   `flag_hash` (String, Not Null) - Bcrypt or Argon2 hash of the correct flag (protects flags against database leaks and rainbow tables)
*   `points` (Integer, Not Null)
*   `difficulty_level` (Enum) - `easy`, `medium`, `hard`
*   `is_premium` (Boolean, Default `false`)

#### 7. `submissions` (User Activity Tracking)
*   `submission_id` (PK, UUID/Integer)
*   `user_id` (FK -> `users.user_id`)
*   `task_id` (FK -> `tasks.task_id`)
*   `submitted_flag` (String)
*   `is_correct` (Boolean)
*   `submitted_at` (Timestamp, Default `now()`)

#### 8. `user_daily_activity` (Consistency Graph / Calendar)
*   `activity_id` (PK, UUID/Integer)
*   `user_id` (FK -> `users.user_id`)
*   `activity_date` (Date, Not Null)
*   `tasks_solved` (Integer, Default 0)
*   `points_earned` (Integer, Default 0)
*   *Constraint: Unique composite key on (`user_id`, `activity_date`). Used to efficiently render a GitHub-style activity calendar/heatmap without expensive aggregations over the `submissions` table.*

## 2. Relationships, Constraints, & Security

### 2.1 Security Measures
*   **Flag Protection**: Flags must NEVER be stored in plain text. `tasks.flag_hash` uses a strong, slow hashing algorithm (like Bcrypt or Argon2) rather than SHA-256. This prevents attackers from quickly cracking flags using dictionary attacks or rainbow tables if the database is compromised.
*   **Authentication**: OTP codes in `users.otp_code` are also strongly hashed, ensuring intercepted database dumps do not grant immediate account access.
*   **Rate Limiting (Brute-Force Prevention)**: The API layer must implement rate limiting on task submissions (insertions into `submissions`) per user/IP. This prevents users from brute-forcing flags or overwhelming the database with failed attempt records.

### 2.2 Leaderboard Logic
*   **Performance Optimization**: The `users.total_points` column is updated whenever a record is inserted into `submissions` where `is_correct` is `true` (and the user hasn't previously solved that specific `task_id`).
*   **Tie-breaking**: Leaderboard queries should sort by `total_points` (DESC) and then by the `max(submitted_at)` for successful submissions (ASC).

### 2.3 Streak Logic & Consistency Calendar
*   **Graph/Calendar Generation**: The `user_daily_activity` table easily supports heatmap generation. When a correct submission occurs, an upsert (INSERT ON CONFLICT) runs to increment `tasks_solved` and `points_earned` for that specific `activity_date`.
*   **Tracking**: When a user makes a successful submission, the system checks the `users.last_active_date`.
    *   If it is **today**, no changes are made to the streak.
    *   If it is **yesterday**, `current_streak` is incremented by 1.
    *   If it is **older than yesterday** (or null), `current_streak` is reset to 1.
*   **Points Bonus**: For every new consecutive day added to the `current_streak`, bonus points can be dynamically added to `total_points` to reward consistency.
*   **Records**: If `current_streak` surpasses `longest_streak`, the `longest_streak` is updated.
*   **Date Update**: Finally, `last_active_date` is set to the current date.

### 2.4 Content Ownership
*   A `module` is owned by one `instructor`.
*   A `task` is owned by one `instructor`, allowing for multi-instructor collaboration within the same module.

### 2.5 Access Control
*   `lessons` and `tasks` inherit the `is_premium` status of their parent `module` unless the `task.is_premium` flag is explicitly set to `true` for a standalone challenge.