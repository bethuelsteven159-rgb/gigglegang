Frontend JavaScript Structure Explanation

We split the old script.js into smaller files so that each file has one clear responsibility. Before, one giant file was handling Supabase setup, login, session storage, admin features, vendor features, student features, cart logic, order history, realtime updates, and page startup all in one place. That made it hard to debug, hard to test, and risky to change because editing one part could accidentally break another part. The new structure is designed so that if we want to change one feature, we can go straight to the right file instead of searching through one huge script. The old script clearly contained all of these mixed responsibilities in one place, which is exactly why we separated it.

1. js/config/supabase.js

I created supabase.js so that the Supabase connection details live in one place. This file is responsible for holding the frontend Supabase URL and anon key, and for creating the shared Supabase client that the rest of the frontend uses. Instead of repeating the keys in many files, every other script should import the client from here. The idea is simple: if a script needs to talk to the database, it should do something like import { sb } from '../config/supabase.js'; and then use sb.from(...), sb.auth..., or sb.storage.... This is better than repeating the keys in many files because if the project changes database credentials in the future, we only update them once in this file instead of hunting through the whole project. In the old large script, the Supabase URL, key, and client creation were all written at the top of the file, so we pulled that part out into its own module.

2. js/shared/

I created a shared folder for code that is used in many places, not just one page or one role. These are helper files.

js/shared/notifications.js

This file is responsible for small user feedback features such as showing toast messages and requesting browser notification permission. We use it whenever we want to show success or error messages, or whenever a page needs to ask the browser for permission to send notifications. In the old script, the toast function and notification permission logic were generic and not tied to just admin, vendor, or student, so they belong in shared. If in future you want to change how messages look or how notifications are handled, this is the file to edit. For example, if you want longer-lasting toasts or a different style, you edit this file and the change can affect all pages consistently.

js/shared/session.js

This file is responsible for session-related actions such as saving user info into sessionStorage, clearing it, and logging out. We use it whenever a page needs to read or write the current logged-in user’s details. In the old script, logout and session storage logic were mixed with many other things, so splitting them out makes them easier to reason about. If in future you want to store extra things in the session, such as a profile picture or vendor status, this is a good place to extend. The logout button on many pages used to depend on a global function in the big script, so now this file gives us one clean home for that. The shared use of session data is visible across your HTML pages, where they read the stored username and role to display names and protect access.

js/shared/auth-helpers.js

This file is responsible for common login and identity helper functions such as setting loading messages, showing the role-selection section, extracting the username from the Supabase user object, redirecting users based on role, and looking up student or vendor IDs from the database. We use it whenever auth, role detection, or user identity is needed. For example, vendor pages need getVendorId(username), and student history needs getStudentId(username). Instead of repeating that logic in many feature files, we keep it here. If in future the app changes how usernames are decided or how role redirects work, this is the file to edit. The old giant script already had these helper functions in one mixed section, so this split is really just putting them into a proper home.

js/shared/guards.js

This file is responsible for route protection in the frontend. It contains simple checks like “if the role is not admin, send the user back to index.html.” We use it on dashboard and role-specific pages so that the wrong user type cannot stay on the wrong page. In the old HTML files, you had repeated inline code that checked the session role and redirected if it did not match. Now that logic belongs in one place. If in future you add another role or a page that should be open to more than one role, this is where you would extend that logic. The repeated role checks in the dashboard HTML pages are exactly the pattern this file replaces.

3. js/auth/

I created an auth folder for files related only to authentication and first-time account setup.

js/auth/login.js

This file is responsible for Google sign-in and checking the session after the login redirect. We use it on the login page, mainly on index.html. It handles the action when the user clicks “Continue with Google,” asks Supabase to log them in, and then checks whether they already have a role. If they already have a role, it stores their session data and redirects them to the correct dashboard. If they do not have a role yet, it shows the role-selection section. If in future you want to change the login provider, change the redirect URL, or add login error handling, this is the file to edit. In the old script, this was all mixed into the same file as menu management and orders, which was one of the main reasons the old file became too large.

js/auth/role-selection.js

This file is responsible for deciding what kind of user a logged-in person is and saving the role for first-time users. It checks if the user is an admin, vendor, or student by querying the relevant tables. It also handles the “Choose your account type” flow on first login. We use it only where role setup and role detection are needed, especially the login page. If in future you add another role, such as “reviewer” or “delivery,” this is one of the first places you would edit. You would update the role detection logic here, then update role redirects, then add a dashboard or page initializer for that role. The old script already had this role detection and role save flow mixed inside the giant file, so this split makes it easier to understand and extend.

4. js/admin/

I created an admin folder for features that belong only to the admin user.

js/admin/dashboard.js

This file is responsible for small admin dashboard display logic, especially showing the admin username in the navbar and welcome text. It is simple, but that is good because it keeps page display logic out of the HTML and away from the feature modules. If in future you want the admin dashboard to show more information like counts or stats, this file can grow into a dashboard display/controller file.

js/admin/vendors.js

This file is responsible for vendor management features such as loading all vendors, approving or suspending vendors, deleting vendors, and optionally creating vendors if that admin form is still used. We use it on admin_vendor_control.html, which currently shows the vendor table and action buttons. If in future you want to add a new admin action such as “reset vendor status,” “view vendor details,” or “ban vendor permanently,” this is the correct file to edit because those actions belong to admin vendor management. The vendor-control HTML clearly depends on actions like loading vendors and updating vendor status, so this file is the modular replacement for those old global functions.

js/admin/orders.js

This file is responsible for loading all orders across all vendors for the admin page. We use it on admin_orders.html. If in future the admin needs filters, search, or date range tools for orders, this is where those features should be added. The all-orders page currently just displays order data in a table, so this file keeps that logic out of HTML and separate from student/vendor order logic. The admin orders page clearly exists only to show all orders and is different from vendor-specific order views.

5. js/vendor/

I created a vendor folder for features that only vendors use.

js/vendor/dashboard.js

This file is responsible for showing the vendor name on vendor pages and welcome text on the vendor dashboard. Like the other dashboard files, it keeps page display setup clean and separate.

js/vendor/menu.js

This file is responsible for vendor menu management: loading the vendor’s own menu, adding a new menu item, uploading a menu image, toggling sold-out/available status, and deleting menu items. We use it on vendor_menu.html. If in future you want to let vendors edit existing items, add item categories, or validate prices more strictly, this is the file to edit. This file is basically the vendor’s kitchen control room. The vendor menu page clearly depends on loading menu items and actions like add, mark sold out, and delete, so this file now owns those responsibilities.

js/vendor/orders.js

This file is responsible for vendor-specific order handling, such as loading only the logged-in vendor’s orders and allowing status updates. We use it on the vendor orders page. If in future vendors should print orders, filter by status, or mark an order ready with one click, this is the correct file to extend. The old giant script already had vendor order loading and order-status updating in the same mass of code, so splitting it here makes those vendor responsibilities clearer.

6. js/student/

I created a student folder for features used only by students.

js/student/dashboard.js

This file is responsible for displaying the student username and welcome text on student pages. It keeps page setup clean.

js/student/menu.js

This file is responsible for loading the main menu view for students, which combines available items from approved vendors. We use it when the student visits the ordering page and chooses “Browse by Menu.” If in future you add search, category filtering, or sorting by price, this is the file to edit. The student order page currently begins with a default menu view, so this file is the modular home of that logic.

js/student/cart.js

This file is responsible for cart state and cart display. It stores the cart array, adds items to it, removes items, saves the cart into sessionStorage, and refreshes the cart panel. We use it from student ordering flows. If in future you want quantity controls, coupon codes, or cart persistence beyond the session, this is the file to edit. It is important because many student-order functions depend on the cart, but the cart itself is a separate concern and should not be mixed with page initialization. The old script had a global cart variable and cart helpers near student logic, which is exactly what this module replaces.

js/student/checkout.js

This file is responsible for placing an order. It checks whether the cart is empty, ensures the user is logged in, gets or creates the student record, makes sure all items in the cart belong to one vendor, checks the vendor status, builds the order object, inserts it into the orders table, clears the cart, and refreshes the display. We use it on student_orders.html when the user clicks “Place Order.” If in future you want to support ordering from multiple vendors, online payment, or sending order confirmation emails, this is the file to extend. This is one of the heavier student files because checkout naturally contains many business rules. That same complexity was visible in the old giant script when placeOrder() handled all of these steps inside one huge file.

js/student/history.js

This file is responsible for loading the student’s order history and subscribing to realtime updates for that student’s orders. We use it on student_history.html. If in future you want the history page to allow review-writing, order cancellation, or re-ordering old meals, this is one of the places to extend. For example, if you add a “Leave Review” button next to each completed order, you would probably render that button in this file because this file builds the order-history rows. The student history page clearly depends on loading past orders and showing status updates, and the old script already included both the order history query and realtime subscription logic.

js/student/browse-vendors.js

This file is responsible for the “Browse by Vendor” view on the student order page. It loads the vendor list, renders vendor cards, shows the selected vendor’s menu, and supports returning to the full menu. We use it on student_orders.html. If in future you want a vendor profile page, ratings under vendor names, or vendor search, this is the best file to edit because it already handles vendor browsing behavior. The student order page contained a large inline script for browse-by-menu / browse-by-vendor toggling and vendor-specific menu rendering, and this module is the extracted version of that logic.

7. js/pages/

I created a pages folder because every HTML page needs a small initializer. A page initializer is responsible for saying, “This page is loading, so run these specific startup actions.” This avoids putting JavaScript directly in the HTML and avoids loading every feature on every page.

For example:

index-page.js initializes the login page
admin-dashboard-page.js initializes the admin dashboard
admin-vendors-page.js initializes vendor control
admin-orders-page.js initializes the admin orders page
vendor-dashboard-page.js initializes the vendor dashboard
vendor-menu-page.js initializes the vendor menu page
vendor-orders-page.js initializes the vendor orders page
student-dashboard-page.js initializes the student dashboard
student-orders-page.js initializes the student order page
student-history-page.js initializes the student history page

These files are important because they connect the HTML page to the correct modules. If the page still uses old onclick="..." handlers, the page initializer also temporarily attaches those functions to window, so the old HTML still works while the code becomes modular. That is why you saw lines like window.createVendor = createVendor; or window.addToCart = addToCart;. Those lines belong inside the relevant page initializer because that page decides which functions must be globally exposed during migration. The HTML pages you shared all had either inline page setup or inline onclick handlers, so page initializers are the correct replacement.

8. js/main.js

I created main.js as the entry point and traffic controller of the whole frontend. This file runs on page load, detects which HTML page is open, and calls the correct page initializer from the pages folder. It also keeps global startup tasks in one place, such as notification permission requests. You should think of main.js as the router for the frontend JavaScript. It does not contain business logic like loading menu items or placing orders. Instead, it simply decides which page script should run. This is important because it stops every page from loading unnecessary code manually. We already structured it so that it maps page names like index.html, student_orders.html, and vendor_menu.html to their matching initializer functions. That is the heart of the new structure.

9. How to add a new page in future, for example a Reviews page

This is the part that will save you in future.

If we decide to create a new page like leave_reviews.html, the process should be:

Create the HTML page.
Create a feature file for the page’s logic, for example js/student/reviews.js or js/reviews/reviews.js, depending on whether reviews belong only to students or to the whole app.
Create a page initializer file, for example js/pages/student-reviews-page.js.
In that page initializer, import the functions needed for that page, run any role check, set names if needed, load data, and attach any old inline onclick functions to window if the HTML still uses them.
Open js/main.js.
Import the new page initializer.
Add the new HTML file and initializer to the routes object in main.js.
In the new HTML page, load <script type="module" src="js/main.js"></script> instead of adding big inline scripts.

So yes, when you create a new page, you normally do need to edit main.js, because main.js needs to know which initializer belongs to that new page. The only time you do not edit main.js is if the new page does not use any JavaScript at all, which is rare in this project.

A simple example would be:

leave_reviews.html
js/student/reviews.js
js/pages/student-reviews-page.js

Then in main.js you add:

an import for initStudentReviewsPage
a new route like 'leave_reviews.html': initStudentReviewsPage

That is the correct future pattern.

10. How to know where to edit something

This is the rule that keeps the structure understandable:

If the problem is about database connection, edit config/supabase.js
If the problem is about login or role selection, edit auth/
If the problem is about toast, session, user lookup, or role guarding, edit shared/
If the problem is about admin actions, edit admin/
If the problem is about vendor menu or vendor orders, edit vendor/
If the problem is about student menu, cart, checkout, history, or vendor browsing, edit student/
If the problem is about what should happen when a specific HTML page opens, edit pages/
If the problem is about telling the app which initializer to run for a page, edit main.js

That is the cleanest mental model.

11. Why this is better than before

Before, one file contained nearly everything: auth, menu loading, cart handling, order placement, vendor controls, admin controls, and page setup. That made the code hard to follow and risky to change because one edit could affect unrelated features. Now the code is organized by responsibility. That makes testing easier, debugging easier, teamwork easier, and future extensions easier. The old giant script is proof of why the split was necessary, because it had all of those concerns side by side.

12. Final principle

The best way to work in this project from now on is:

put reusable logic in the correct feature/shared module
put page-startup logic in a page initializer
let main.js decide which page initializer to run
keep HTML mostly for structure, not logic

That is the big picture. Once you understand that, the whole split stops feeling random and starts feeling like a map.
