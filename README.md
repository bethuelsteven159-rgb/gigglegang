# gigglegang

# 🍔 Campus Food – Multi-Vendor Food Ordering System

A complete web-based food ordering platform where students can order from multiple vendors, vendors manage their menus and orders, and administrators control the entire system.

## 📋 Table of Contents

---

## Overview

**Campus Food** is a full-stack web application that connects students with local food vendors on campus. Students can browse menus, place orders, and track their order history. Vendors can manage their menu items, update availability, and process incoming orders. Administrators have oversight of all vendors and orders.

The application uses **Supabase** for authentication, database, and security policies, and is deployed on **GitHub Pages**.

---

## Live Demo

🔗 [https://k4n3k1-dev.github.io/sd/](https://k4n3k1-dev.github.io/sd/)

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin123@campusfood.com` | `admin123` |
| Vendor | Create your own via signup | – |
| Student | Create your own via signup | – |

> **Note:** Vendors require admin approval after signup before they can log in.

---

## Features

### For Students
- 📝 Create account with email + password
- 🍽️ Browse menu from all approved vendors
- 🛒 Add items to cart (single vendor only)
- 📦 Place orders
- 🕐 View order history with status tracking

### For Vendors
- 📝 Self-registration (requires admin approval)
- ➕ Add, edit, and delete menu items
- 🔄 Mark items as "Available" or "Sold Out"
- 📋 View incoming orders
- ✅ Update order status (Pending → Confirmed → Completed → Cancelled)

### For Admin
- 🔐 Dedicated admin login
- 👥 Approve, suspend, or remove vendors
- 📊 View all orders across all vendors
- 🏪 Full vendor lifecycle management

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | HTML5, CSS3, JavaScript (Vanilla) |
| Backend | Supabase (PostgreSQL + Auth) |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |
| Fonts | Google Fonts (Inter) |

---

## User Roles

| Role | Capabilities |
|------|-------------|
| **Student** | Browse menu, place orders, view history |
| **Vendor** | Manage menu, process orders, update status |
| **Admin** | Approve vendors, suspend vendors, view all orders |

---

## Project Structure
