#!/bin/bash
# Runs once, only when the postgres_data volume is first created (Postgres
# only executes /docker-entrypoint-initdb.d scripts against a fresh data
# directory). Creates any extra databases listed in POSTGRES_MULTIPLE_DATABASES
# alongside the POSTGRES_DB the official image already creates — used here so
# the Node/Prisma backend and the FastAPI/Alembic backend each own a separate
# database on the same Postgres container rather than fighting over one
# schema with two different migration tools.
set -e

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
  for db in $(echo "$POSTGRES_MULTIPLE_DATABASES" | tr ',' ' '); do
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
      SELECT 'CREATE DATABASE $db'
      WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\gexec
EOSQL
  done
fi
