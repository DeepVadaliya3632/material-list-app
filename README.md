# Material List

A simple CRUD web app for tracking a materials inventory list.  
Built with **Node.js**, **Express**, **EJS**, and **PostgreSQL**.

---

## Local Setup

### Prerequisites

- [Node.js 20.x](https://nodejs.org/) installed
- [PostgreSQL](https://www.postgresql.org/) running locally

### Steps

1. **Clone the repo**

   ```bash
   git clone <your-repo-url>
   cd material-list
   ```

2. **Create the database**

   ```bash
   createdb material_list
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set your local `DATABASE_URL`:

   ```
   DATABASE_URL=postgres://your_user:your_password@localhost:5432/material_list
   ```

4. **Install dependencies**

   ```bash
   npm install
   ```

5. **Seed sample data** (optional)

   ```bash
   npm run seed
   ```

6. **Start the server**

   ```bash
   npm start
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deploy to Render (Free Tier)

### Option A: Blueprint (Automatic)

1. Push this repo to GitHub.
2. Go to [Render Dashboard → Blueprints](https://dashboard.render.com/blueprints).
3. Click **New Blueprint Instance**, connect your repo.
4. Render reads `render.yaml` and creates the database + web service automatically.
5. Wait for the deploy to finish. Your app is live!

### Option B: Manual Setup

1. **Create a PostgreSQL database**
   - Go to [Render Dashboard](https://dashboard.render.com/) → **New → PostgreSQL**.
   - Name: `material-list-db`, Plan: **Free**.
   - Once created, copy the **Internal Database URL**.

2. **Create a Web Service**
   - Go to **New → Web Service**, connect your GitHub repo.
   - Name: `material-list`, Runtime: **Node**, Plan: **Free**.
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

3. **Set environment variables**  
   In the web service settings, add:

   | Key            | Value                                       |
   | -------------- | ------------------------------------------- |
   | `DATABASE_URL` | *(paste the Internal Database URL from step 1)* |
   | `NODE_ENV`     | `production`                                |

4. **Deploy**  
   Click **Manual Deploy → Deploy latest commit**. The `CREATE TABLE` migration runs automatically on first start.

5. **Seed data** (optional)  
   In Render's **Shell** tab for the web service, run:

   ```bash
   npm run seed
   ```

---

## Routes

| Method | Path                      | Description              |
| ------ | ------------------------- | ------------------------ |
| GET    | `/`                       | List materials (+ search)|
| GET    | `/new`                    | New material form        |
| POST   | `/materials`              | Create material          |
| GET    | `/materials/:id/edit`     | Edit material form       |
| POST   | `/materials/:id`          | Update material          |
| POST   | `/materials/:id/delete`   | Delete material          |
| GET    | `/health`                 | Health check             |

---

## License

MIT
