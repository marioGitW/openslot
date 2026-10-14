@AGENTS.md

## Claude Code

- Before a change that touches more than one module, or both `web/` and `api/`, use plan
  mode and wait for approval.
- After changing `api/prisma/schema.prisma`, run `npx prisma migrate dev` and
  `npx prisma generate`, and mention the migration name.
- Commit attribution is disabled in `.claude/settings.json`. Follow the commit rules in
  AGENTS.md exactly: one line, no body, no trailers, no co-author.
