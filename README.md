# salesdig

Salesdig is a company research and sales intelligence project. The documents below capture the discussion that started from a read-only review of the Cloud Catalyst codebase.

The existing frontend and backend code implements the current Cloud Catalyst flow. PostgreSQL with pgvector is a proposed replacement for MongoDB and Pinecone; it has not been implemented by these notes.

## Context

- [Product framing](docs/PRODUCT_CONTEXT.md): company OSINT for a sales team, intended users, outputs, and reliability limits.
- [Current system](docs/CURRENT_SYSTEM.md): how the reviewed application works today.
- [Requirements](docs/REQUIREMENTS.md): capabilities, dependencies, and configuration names found in the code.
- [PostgreSQL and pgvector option](docs/POSTGRES_PGVECTOR.md): feasibility, data mapping, and migration scope.

These are planning and orientation notes. They do not certify AWS funding eligibility or verify any AI-generated company finding.
