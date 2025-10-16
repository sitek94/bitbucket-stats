# Bitbucket Stats

A CLI tool that crawls your Bitbucket repository's pull requests, comments, and review data, storing everything in a local SQLite database for statistical analysis. Supports multiple repositories in a single database.

## Quick Start

Make sure you have [Bun](https://bun.sh/) installed.

Then run the following commands:

```bash
# Create .env file and fill in Bitbucket credentials
cp .env.example .env

# Install dependencies
bun install

# Initialize the database
bun db:push

# Run the CLI tool
bun cli
```

The CLI offers two main functions:

### 1. Seed Database
Fetch and store pull request data from Bitbucket:
- Select repository name
- Choose date range
- Fetches all pull requests with comments, reviewers, and participants
- Stores data in local SQLite database

### 2. Export Statistics
Generate CSV reports from stored data:
- Select repository to analyze
- Choose export types (totals, monthly, weekly breakdowns)
- Exports to `output/` directory

All repositories are stored in a single database, making it easy to compare metrics across projects.

```bash
# Open the database in a GUI
bun db:studio
```

## Resources

- [Bun - A fast all-in-one JavaScript runtime](https://bun.sh/)
- [Drizzle ORM - SQLite Getting Started Guide](https://orm.drizzle.team/docs/get-started/sqlite-new)
- [Bitbucket REST API - Pull Requests Documentation](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-group-pullrequests)
