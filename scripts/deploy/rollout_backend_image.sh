#!/usr/bin/env bash

set -euo pipefail

IMAGE_TAG="${1:-darrellv14/pulsewise-backend:prod-fcm-priority-20260702}"
COMPOSE_FILE="${COMPOSE_FILE:-/home/pulsewise/docker-compose.prod.yml}"
SERVICE_NAME="${SERVICE_NAME:-pulsewise-backend}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1:5000/health}"
BACKUP_FILE="${COMPOSE_FILE}.bak.$(date +%Y%m%d-%H%M%S)"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

cp "$COMPOSE_FILE" "$BACKUP_FILE"
echo "Backup created: $BACKUP_FILE"

python3 - "$COMPOSE_FILE" "$SERVICE_NAME" "$IMAGE_TAG" <<'PY'
from pathlib import Path
import re
import sys

compose_path = Path(sys.argv[1])
service_name = sys.argv[2]
image_tag = sys.argv[3]

text = compose_path.read_text()
pattern = re.compile(
    rf"(^\s{{2}}{re.escape(service_name)}:\n)(.*?)(?=^\s{{2}}[A-Za-z0-9_-]+:\n|^volumes:\n|\Z)",
    re.MULTILINE | re.DOTALL,
)
match = pattern.search(text)
if not match:
    print(f"Service block not found: {service_name}", file=sys.stderr)
    sys.exit(1)

block = match.group(2)
image_pattern = re.compile(r"^(\s{4}image:\s*)(.+?)\s*$", re.MULTILINE)
image_match = image_pattern.search(block)
if not image_match:
    print(
        f"No image reference found inside service '{service_name}'. "
        "This compose may still be using build mode.",
        file=sys.stderr,
    )
    sys.exit(2)

updated_block = image_pattern.sub(rf"\1{image_tag}", block, count=1)
updated_text = text[: match.start(2)] + updated_block + text[match.end(2) :]
compose_path.write_text(updated_text)
print(f"Updated {service_name} image to {image_tag}")
PY

docker compose -f "$COMPOSE_FILE" pull "$SERVICE_NAME"
docker compose -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"

echo "Running image:"
docker inspect "$SERVICE_NAME" --format '{{.Config.Image}}'

echo "Healthcheck:"
curl -fsS "$HEALTHCHECK_URL"
echo

