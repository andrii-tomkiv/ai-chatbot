# MySQL & Prisma Setup Guide

This guide explains how to set up a MySQL database using Docker Compose and initialize Prisma for use with this project.

---

## 1. MySQL Container Setup

The project uses a MySQL 8.0 database running in a Docker container. The configuration is defined in `docker-compose.yml`.

### Start MySQL with Docker Compose

```bash
docker-compose up -d mysql
```

- **Image:** `mysql:8.0`
- **Port:** 3306 (default MySQL port)
- **Credentials:**
  - Database: `chatbot_db`
  - User: `chatbot_user`
  - Password: `chatbot_password`
  - Root Password: `rootpassword`

You can change these values in `docker-compose.yml` if needed.

### Optional: Custom Initialization

If you want to customize the initial database/user setup, see `mysql/init/01-init.sql`.

---

## 2. Prisma Initialization

Prisma is used as the ORM for database access.

### Prisma Schema

The schema is located at `prisma/schema.prisma`. Example:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

model UserRequests {
  id        Int      @id @default(autoincrement())
  userIP    String
  message   String   @db.Text
  response  String   @db.LongText
  date      DateTime @default(now())
}
```

### Set the DATABASE_URL

In your `.env` or `.env.local` file, add:

```env
DATABASE_URL="mysql://chatbot_user:chatbot_password@localhost:3306/chatbot_db"
```

- If running inside Docker, use `mysql` as the host (the service name):
  ```env
  DATABASE_URL="mysql://chatbot_user:chatbot_password@mysql:3306/chatbot_db"
  ```

---

## 3. Run Prisma Migrations & Generate Client

After starting the MySQL container and setting the `DATABASE_URL`, run:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

- This will create the necessary tables and generate the Prisma client in `src/generated/prisma`.

---

## Optional: Quick Local Sync with `db push`

For local development or prototyping, you can quickly sync your schema to the database without creating migration files using `db push`:

```bash
npx prisma db push
npx prisma generate
```

- This updates the database to match your schema instantly, but does **not** create a migration history.
- Use this for rapid iteration or testing. For production or team workflows, prefer migrations.

---

## 4. Verify the Connection

You can test the connection with:

```bash
npx prisma db pull
```

If successful, your Prisma schema will sync with the database.

---

## 5. Troubleshooting

- **Connection Refused:** Ensure MySQL is running and accessible on port 3306.
- **Authentication Errors:** Double-check credentials in `docker-compose.yml` and `.env`.
- **Prisma Client Errors:** Re-run `npx prisma generate` after any schema changes.
- **Docker Compose Issues:** Try `docker-compose down -v` to reset containers and volumes.

---

## 6. Next Steps

- See the [main README](../README.md) for how to run the application.
- For Docker deployment, see [DOCKER_README.md](./DOCKER_README.md).

---

If you have any issues, check the logs for both the MySQL and application containers:

```bash
docker logs chatbot-mysql
docker logs <your-app-container>
``` 