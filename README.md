This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Database Management

This project uses a MySQL/TiDB database. The schema is defined in `schema.sql` and managed via `migrate.js`.

### Running Migrations

Whenever the schema changes, run the following command to apply updates safely without losing data:

```bash
node migrate.js
```

### Changing the Schema

To update the database structure:
1. **Modify `schema.sql`**: Update the table definitions to reflect the new desired state. This ensures new installations have the correct schema.
2. **Execute**: Run `node migrate.js`. The script will intelligently scan `schema.sql` and add any missing columns or tables to your existing database.

### Fresh Installation

If you are setting up the project for the first time or starting with a brand new, empty database:
1. Ensure your `DATABASE_URL` is set correctly in `.env.local`.
2. Run the migration script:
   ```bash
   node migrate.js
   ```
   This will create all necessary tables and seed the initial modules and challenges.

### Safety Rule: Never include `DROP` or `TRUNCATE` commands in the migration logic that could affect user data. The `migrate.js` script is designed to be purely additive to prevent data loss.

---

## Compiling the Project

To compile the project for production, run the build script:

```bash
npm run build
# or
yarn build
# or
pnpm build
# or
bun build
```

### Compiled Output
The compiled code is generated in the `.next` directory. This directory contains the optimized production build, including:
- **Server-side code**: Optimized for the Node.js runtime.
- **Client-side assets**: Minified JavaScript, CSS, and optimized images.
- **Static pages**: Pre-rendered HTML for faster initial loads.

To start the compiled production server:

```bash
npm run start
```

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
