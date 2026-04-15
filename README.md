# ✂️ SuratSalon Hub API 

[![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![MySQL](https://img.shields.io/badge/mysql-%2300f.svg?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Swagger](https://img.shields.io/badge/-Swagger-%23Clojure?style=for-the-badge&logo=swagger&logoColor=white)](http://localhost:3000/api/docs)

SuratSalon Hub is a comprehensive Backend API designed for modern salon and spa management. Built with **NestJS** and powered by raw **MySQL** performance, this system handles everything from appointment scheduling and stylist management to automated billing and detailed reporting.

---

## 🚀 Key Features

- 🔐 **Secure Authentication**: JWT-based auth with Access & Refresh tokens, secure HTTP-only cookies, and Role-Based Access Control (RBAC).
- 📅 **Smart Appointments**: Advance booking system with real-time availability checks and conflict resolution.
- 🕒 **Dynamic Time Slots**: Automated generation of stylist availability slots with support for breaks and leaves.
- 👥 **Customer Management**: Detailed profiles, service history, and preferences tracking.
- 💇 **Stylist Portal**: Manage stylist schedules, availability, and leave requests.
- 💰 **Automated Billing**: Instant bill generation for completed services with tax and discount support.
- 📊 **Rich Reporting**: Daily and monthly business insights including revenue, service popularity, and stylist performance.
- ⏰ **Cron Operations**: Automated system maintenance and daily slot generation for seamless operations.

---

## 🛠️ Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (Node.js)
- **Database**: MySQL (using `mysql2` for high-performance raw SQL queries)
- **Documentation**: [Swagger / OpenAPI](https://swagger.io/)
- **Security**: 
  - JWT (JSON Web Tokens)
  - Bcrypt for password hashing
  - RBAC (Role-Based Access Control)
- **Validation**: [class-validator](https://github.com/typestack/class-validator) & [class-transformer](https://github.com/typestack/class-transformer)

---

## 📁 Project Structure

```text
src/
├── appointment/      # Appointment booking and management logic
├── auth/             # Authentication & Authorization (JWT, Middleware, Guards)
├── bill/             # Billing and invoice generation
├── common/           # Shared filters, interceptors, and decorators
├── cron/             # Automated background tasks
├── customer/         # Customer profile management
├── database/         # Global Database service for raw SQL queries
├── report/           # Business analytics and performance reports
├── service/          # Salon services and pricing management
├── stylist/          # Stylist profiles and portfolio
├── stylist-leave/    # Leave management system for staff
├── time-slot/        # Availability slot engine
└── user/             # User and staff account management
```

---

## ⚙️ Project Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MySQL](https://www.mysql.com/) (v8.0+ recommended)

### 2. Installation
```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory and configure the following variables:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_NAME=surat_salon

JWT_ACCESS_SECRET=your_access_secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRATION=7d

PORT=3000
```

### 4. Database Setup
Import the provided SQL schema to initialize your database structure:
```bash
mysql -u source_user -p surat_salon < salon.sql
```

---

## 🏃 Running the Project

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

---

## 📖 API Documentation

The API comes with built-in Swagger documentation. Once the server is running, you can access the interactive UI at:

🔗 [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---

## 🛠️ Performance & Scalability
This project utilizes a **Raw SQL** approach instead of a heavy ORM for maximum performance in high-concurrency scenarios like slot availability lookups and report generation. All queries are pre-optimized and handled through a global `DatabaseService`.

---

## 📄 License
This project is [UNLICENSED](LICENSE).
