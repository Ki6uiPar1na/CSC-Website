<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Database Management Rules
- **Mandatory Script Usage**: ALL database schema changes MUST be implemented via `migrate.js`. Do not run raw SQL commands against the database directly to modify schema.
- **Data Preservation Mandate**: NEVER use `DROP TABLE`, `TRUNCATE`, or any operation that deletes user data during migrations unless explicitly requested by the user. Only the schema should be updated; the data must remain intact.
- **Idempotency**: All migration steps must be idempotent. Use `IF NOT EXISTS` for adding columns/tables and handle potential duplicate errors gracefully in the migration script.
- **Standard Migration Workflow**:
    1. Update `schema.sql` to reflect the ideal state of the database (for new setups).
    2. Update the `migrations` array in `migrate.js` with the specific `ALTER TABLE` statements needed to transition existing databases to the new schema.
    3. Run `node migrate.js` to apply changes.
- **Request Specific Change Mandate**: Do NOT perform broad refactors, environment-wide builds (like `npm run build`), or configuration changes unless specifically asked by the user for a targeted reason.
- **Changing the Migration Process**:
    If the logic of `migrate.js` itself needs to be changed (e.g., adding a logging table, changing error handling):
    1. Document the change in the commit message and update the `README.md` if the workflow changes.
    2. Ensure the script remains backwards compatible with existing databases.

## Blueprint References
- **Primary Blueprint**: `DESIGN.md` defines the ultimate architectural goal and schema requirements.
- **Implementation Log**: `CURRENT.md` documents what has been built so far and the current technical stack. Always check this before starting new work to avoid redundancy.
- **Iterative Development**: Continuously align implementation with `CURRENT.md` knowledge. Update `DESIGN.md` ONLY if necessary to accommodate critical architectural shifts, ensuring no existing database structures are damaged and no data is lost.

## Design Alignment & Production Safety
- **Design Fidelity**: Always use `DESIGN.md` as the primary blueprint for implementation. All new features, database tables, and relationships should align with the architecture defined there.
- **Production Integrity**: When implementing designs from `DESIGN.md`, ensure that no changes break existing functionality or production stability.
- **Zero Data Loss**: Implementation of new design patterns must NEVER result in the loss of existing data. Always use additive migrations (adding columns/tables) and avoid destructive operations on populated tables.
- **Database Synchronization**: All schema changes must be reflected in `schema.sql` (for new setups) and appended to the `migrations` array in `migrate.js` (for existing environments).
- **Periodic System Validation**: After significant changes or every few sub-tasks that impact the core system, execute a full build (`npm run build`) and verify the program runs correctly to catch integration errors early.
<!-- END:nextjs-agent-rules -->
