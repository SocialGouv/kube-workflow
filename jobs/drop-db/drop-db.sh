#!/bin/bash

# check mandatory environment variables
MANDATORY_VARS="PGPASSWORD PGHOST PGUSER DATABASE"
for VAR in $MANDATORY_VARS; do
  if [[ -z "${!VAR}" ]]; then
    echo "${VAR} environment variable is empty"
    exit 1
  fi
done

PGPORT=${PGPORT:-5432}

PG_URL_ADMIN="postgresql://${PGUSER/@/%40}:${PGPASSWORD}@${PGHOST}:${PGPORT}/postgres"

echo "disconnect activities on database ${DATABASE} on ${PGHOST}"
psql -abe "$PG_URL_ADMIN" -c "
  SET SESSION CHARACTERISTICS AS TRANSACTION READ WRITE;
  -- Disconnect users from database
  SELECT pg_terminate_backend (pg_stat_activity.pid)
  FROM pg_stat_activity
  WHERE pg_stat_activity.datname = '${DATABASE}';
"

dropdb "$DATABASE" || true