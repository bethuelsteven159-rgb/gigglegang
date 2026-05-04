🚀 Campus Food System – Frontend Architecture Guide
⚠️ VERY IMPORTANT – READ BEFORE CODING

Our JavaScript is modular.
If you edit code in the wrong place, you will break features.

RULES

1. DO NOT put logic inside HTML files
2. DO NOT create random JS files
3. DO NOT edit main.js unless adding a new page
4. ALWAYS edit the correct folder based on responsibility

🧠 PROJECT STRUCTURE
js/
│
├── config/ → Supabase connection
├── shared/ → reusable helpers
├── auth/ → login & role logic
├── admin/ → admin features
├── vendor/ → vendor features
├── student/ → student features
├── pages/ → page initializers (IMPORTANT)
└── main.js → app router

🧭 HOW THE SYSTEM WORKS
Flow:

1. HTML → main.js → pages/... → feature modules → Supabase
2. HTML loads main.js
3. main.js detects page
4. Calls correct initializer in pages/
5. That loads logic from student/vendor/admin

📦 FEATURES WE BUILT (THIS SESSION)

1. LIVE ORDER TRACKING (Student Dashboard)

- shows active orders only
- updates in real time

2. shows:

- status
- time since ordered
- items
- allows cancellation

3. ORDER CANCELLATION SYSTEM

- Students can cancel only when:
- Order Placed
- Being Prepared
- After cancelling:
- status becomes "Cancelled"
- removed from live dashboard
- locked permanently
- vendor can see but cannot edit

3. ORDER STATE FLOW
   Order Placed
   ->
   Being Prepared
   ->
   Ready for Collection
   ->
   Completed (LOCKED)

OR

- Order Placed → Cancelled (LOCKED)
- Being Prepared → Cancelled (LOCKED)
- Rules:
  - cannot go backwards
  - completed cannot change
  - cancelled cannot change

4. REVIEW SYSTEM (FIXED)

- Before:
  - all orders shared reviews ❌
- Now:
  - reviews linked using order_id
  - reviews.order_id = orders.id
- Result:
  - each order has its own review
  - no cross-link bugs

5. VENDOR REVIEW VIEW

- Vendors can:
- see reviews per order
- open modal
- view:
  - rating
  - comment
  - items
  - student

6. ORDER SORTING (VENDOR)

- Orders sorted by:
  - Order Placed
  - Being Prepared
  - Ready for Collection
  - Completed
  - Cancelled
  - Active orders appear first.

7. REALTIME SYSTEM

- Using Supabase Realtime:
  - vendor updates → student sees instantly
  - no page refresh
  - dashboard updates live

9. DATABASE SECURITY FIX (RLS)

- Students must be allowed to update their own orders:
  - create policy "Students can cancel their own orders"
  - on public.orders
  - for update
  - to authenticated
  - using (student_id = auth.uid())
  - with check (student_id = auth.uid());

📁 FOLDER EXPLANATION

1. js/pages/ (VERY IMPORTANT)

- Each HTML page has one initializer.
- Example:
  - dashboard_student.html → pages/student-dashboard-page.js
- This file:
  - connects page to logic
  - runs startup code
  - exposes functions to HTML

2. js/student/

- Student features:
  - dashboard.js → live orders
  - menu.js → menu loading
  - cart.js → cart logic
  - checkout.js → placing orders
  - history.js → past orders + reviews
  - browse-vendors.js → vendor browsing

3. js/vendor/

- Vendor features:
  - dashboard.js → vendor name
  - menu.js → manage menu
  - orders.js → order handling + reviews

4. js/admin/

- Admin features:
  - dashboard.js → admin display
  - vendors.js → manage vendors
  - orders.js → view all orders

5. js/shared/

- Reusable logic:
  - notifications.js → toast + notifications
  - session.js → login session
  - auth-helpers.js → user lookup
  - guards.js → role protection

6. js/auth/

- Authentication:
  - login.js → Google login
  - role-selection.js → role choosing

7. js/config/

- supabase.js → database connection

8. js/main.js

- Router:
  - detects page
  - runs correct initializer
  - Only edit when adding a new page.

🧠 HOW TO ADD A NEW PAGE

- Example: Reviews page
  - Create HTML:
    - student_reviews.html
  - Create logic:
    - js/student/reviews.js
  - Create initializer:
    - js/pages/student-reviews-page.js
  - Register in main.js: 'student_reviews.html': initStudentReviewsPage

🧭 WHERE TO EDIT WHAT

- Problem Where
- page not loading pages/
- student feature student/
- vendor feature vendor/
- admin feature admin/
- login/auth auth/
- shared tools shared/
- routing main.js

⚠️ COMMON MISTAKES

- putting logic in HTML
- editing wrong folder
- duplicating functions
- not using modules
- forgetting RLS

🧠 FINAL PRINCIPLE

- HTML → structure
- pages/ → startup
- modules → logic
- Supabase → data

🏁 FINAL RESULT

- This system now has:
  - realtime updates
  - clean modular structure
  - working review system
  - live order tracking
  - cancellation system
  - secure database rules
  - scalable architecture
