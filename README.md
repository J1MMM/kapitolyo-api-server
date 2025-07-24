# 🚀 Tricycle Franchising and Renewal System – Backend

This repository contains the **backend API** for the Tricycle Franchising and Renewal System, developed using **Node.js**, **Express**, and **MongoDB**.

The backend handles all business logic, authentication, and data management related to tricycle franchises, MTOP issuance, and system users.

---

## 📌 Features

- 🔐 **Authentication & Authorization**
  - JWT-based secure login and route protection
- 👥 **Role-Based Access Control**
  - Admin, Staff, Encoder support
- 📝 **Franchise & Permit Handling**
  - Create, update, renew, archive tricycle franchises
- 🧾 **MTOP Management**
  - Availability tracking and issuance
- 🧹 **Soft Deletes & Archiving**
  - For audit trail and data recovery
- 📄 **Email Notifications**
  - Via Nodemailer for status updates (if enabled)
- 🔍 **Advanced Filtering (Server-Side)**
  - Operators: `contains`, `equals`, `startsWith`, `endsWith`, etc.
- 📦 **RESTful API Design**
  - Clean structure and modular routes

---

## 🧰 Tech Stack

| Purpose          | Library / Tool                                                               |
| ---------------- | ---------------------------------------------------------------------------- |
| Server Framework | [Express](https://expressjs.com/)                                            |
| Database         | [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/) |
| Authentication   | `jsonwebtoken`, `bcrypt`                                                     |
| Environment Vars | `dotenv`                                                                     |
| Date Utilities   | `date-fns`, `dayjs`                                                          |
| Email Sending    | `nodemailer`                                                                 |
| CORS Handling    | `cors`                                                                       |
| Logging & Debug  | `nodemon` (dev)                                                              |
| UUID Generation  | `uuid`                                                                       |

---

## 📁 Project Structure

```
kapitolyo-api-server/
├── controllers/      # Logic for each route group (e.g. auth, franchise)
├── middleware/       # Auth and error middleware
├── models/           # Mongoose schemas
├── routes/           # Route definitions
├── utils/            # Reusable functions (validators, constants)
├── config/           # DB and env config
├── server.js         # Entry point
└── .env              # Environment variables
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB (local or cloud)
- npm

### Setup Instructions

1. Clone the repository:

```bash
git clone https://github.com/your-username/kapitolyo-api-server.git
cd kapitolyo-api-server
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

4. Run in development:

```bash
npm run dev
```

---

## 📄 License

This project is proprietary and developed for internal use by the City Government of San Pablo.

---

## 👨‍💻 Author

Developed by **Jimuel N. Baraero**  
Web Developer - City Government of San Pablo
