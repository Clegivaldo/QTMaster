#!/bin/sh
set -e

mkdir -p /tmp/parsed_outputs /tmp/import_results
rm -f /tmp/parser_summaries.jsonl /tmp/import_summaries.jsonl

for f in /tmp/uploads/*; do
  # skip non-regular files (directories, symlinks, etc.)
  if [ ! -f "$f" ]; then
    echo "Skipping non-file $f" >&2
    continue
  fi
  base=$(basename "$f")
  echo "Processing $base" >&2
  # write parser NDJSON to file (don't stream huge output to terminal)
  python3 /app/python/fallback_parser.py "$f" > "/tmp/parsed_outputs/parsed_${base}.ndjson" 2> "/tmp/parsed_outputs/${base}.stderr"
  total=$(wc -l < "/tmp/parsed_outputs/parsed_${base}.ndjson" 2>/dev/null || echo 0)
  total=$(echo "$total" | tr -d '[:space:]')
  [ -z "$total" ] && total=0
  nulls=$(grep -c "\"timestamp\": null" "/tmp/parsed_outputs/parsed_${base}.ndjson" 2>/dev/null || echo 0)
  nulls=$(echo "$nulls" | tr -d '[:space:]')
  [ -z "$nulls" ] && nulls=0
  parsed=$((total - nulls))
  if [ "$parsed" -lt 0 ]; then
    parsed=0
  fi
  printf '%s\n' "{\"file\":\"$base\",\"total\":$total,\"parsed\":$parsed,\"nulls\":$nulls}" >> /tmp/parser_summaries.jsonl
  node /app/import-file.mjs "$base" 2>>/tmp/import_results/${base}.stderr | tee /tmp/import_results/${base}.out
  echo >> /tmp/import_results/${base}.out
  tail -n 1 /tmp/import_results/${base}.out >> /tmp/import_summaries.jsonl
done

echo '--- PARSER SUMMARIES ---'
cat /tmp/parser_summaries.jsonl
echo '--- IMPORT SUMMARIES ---'
cat /tmp/import_summaries.jsonl
