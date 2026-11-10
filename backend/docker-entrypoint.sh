#!/bin/sh
set -e

echo "running migrations..."
alembic upgrade head

echo "seeding..."
python -m app.seed

echo "starting api..."
exec "$@"
