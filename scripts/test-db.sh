#!/usr/bin/env bash
# Applies the database migrations and seed to a scratch Postgres and runs db/tests/*.sql.
# Uses $DATABASE_URL when set (CI service container); otherwise starts a temporary local cluster.
set -euo pipefail
cd "$(dirname "$0")/.."

cleanup() { :; }
if [[ -z "${DATABASE_URL:-}" ]]; then
  PGBIN=$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)
  PGDATA=$(mktemp -d)
  PORT=${PGPORT_TEST:-54329}
  RUN_AS=()
  if [[ $(id -u) -eq 0 ]]; then
    chown postgres "$PGDATA"
    RUN_AS=(runuser -u postgres --)
  fi
  "${RUN_AS[@]}" "$PGBIN/initdb" -D "$PGDATA" -U postgres -A trust -E UTF8 --locale=C.UTF-8 >/dev/null
  "${RUN_AS[@]}" "$PGBIN/pg_ctl" -D "$PGDATA" -o "-p $PORT -k /tmp -c listen_addresses=localhost" -l "$PGDATA/log" -w start >/dev/null
  cleanup() { "${RUN_AS[@]}" "$PGBIN/pg_ctl" -D "$PGDATA" -m immediate stop >/dev/null || true; rm -rf "$PGDATA"; }
  DATABASE_URL="postgresql://postgres@localhost:$PORT/postgres"
fi
trap cleanup EXIT

psql "$DATABASE_URL" -qX -v ON_ERROR_STOP=1 -c "drop database if exists stepkids_test" -c "create database stepkids_test encoding 'UTF8' template template0"
TEST_URL="${DATABASE_URL%/*}/stepkids_test"
run() { psql "$TEST_URL" -qX -v ON_ERROR_STOP=1 --set=VERBOSITY=terse -o /dev/null -f "$1"; }

for migration in db/migrations/*.sql; do run "$migration"; done
run db/seed.sql
run db/tests/_shim.sql

status=0
for test in db/tests/[0-9]*.sql; do
  if run "$test"; then echo "ok   $test"; else echo "FAIL $test"; status=1; fi
done
exit $status
