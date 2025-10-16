#!/bin/bash

# Check if database name is provided
if [ -z "$1" ]; then
    echo "Please provide a database name"
    echo "Usage: ./export.sh <database_name>"
    exit 1
fi

DB_NAME=$1
OUTPUT_DIR="output"

# Export totals
sqlite3 "db/${DB_NAME}.db" < "db/queries/totals.sql" > "${OUTPUT_DIR}/${DB_NAME}-totals.csv"

# Export monthly data
sqlite3 "db/${DB_NAME}.db" < "db/queries/monthly.sql" > "${OUTPUT_DIR}/${DB_NAME}-monthly.csv"

# Export weekly data
sqlite3 "db/${DB_NAME}.db" < "db/queries/weekly.sql" > "${OUTPUT_DIR}/${DB_NAME}-weekly.csv"

echo "Export completed successfully!"
echo "Files created:"
echo "- ${DB_NAME}-totals.csv"
echo "- ${DB_NAME}-monthly.csv"
echo "- ${DB_NAME}-weekly.csv"
