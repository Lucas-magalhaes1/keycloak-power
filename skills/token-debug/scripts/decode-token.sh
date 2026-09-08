#!/usr/bin/env bash
# Decode JWT header and payload locally. This script does NOT verify a signature.
set -euo pipefail

if [[ $# -ne 1 || -z "${1}" ]]; then
  echo "Usage: $0 <compact-jwt>" >&2
  exit 64
fi

IFS='.' read -r header payload signature extra <<< "$1"
if [[ -z "${header:-}" || -z "${payload:-}" || -z "${signature:-}" || -n "${extra:-}" ]]; then
  echo "Error: expected a compact JWT with three dot-separated segments." >&2
  exit 65
fi

decode_base64url() {
  local value="$1"
  local remainder=$(( ${#value} % 4 ))
  case "$remainder" in
    0) ;;
    2) value+="==" ;;
    3) value+="=" ;;
    *) echo "Error: invalid base64url segment length." >&2; return 1 ;;
  esac
  value="${value//-/+}"
  value="${value//_/\/}"
  if printf '%s' "$value" | base64 --decode 2>/dev/null; then
    return 0
  fi
  printf '%s' "$value" | base64 -D
}

pretty_json() {
  if command -v jq >/dev/null 2>&1; then
    jq .
  else
    cat
  fi
}

echo "Header (decoded; signature is NOT validated):"
decode_base64url "$header" | pretty_json
echo
echo "Payload:"
decode_base64url "$payload" | pretty_json
echo
echo "Signature segment: present (${#signature} characters)"
