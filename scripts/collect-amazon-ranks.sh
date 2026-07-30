#!/bin/bash
set -u

target_asin="B0GGTPHQZK"
output_root="${1:-/private/tmp/amazon-keyword-private-scan}"
only_indices="${2:-}"
max_pages="${3:-1}"
mkdir -p "$output_root"

keywords=(
  "rose toy"
  "rose sex toy"
  "tongue licking vibrator"
  "clitoral suction vibrator"
  "sexual wellness vibrator"
  "tongue toy for women"
  "tongue vibrator"
  "rose adult toy"
  "sucking vibrator"
  "vibrator rose"
  "tongue sex toy"
  "sex rose"
  "rose sex toys"
  "adult toy rose"
  "rose sex"
  "tongue vibrator for women"
  "tongue licking toy for women"
  "rose tongue vibrator"
  "rose tongue toy"
  "licking vibrator for women"
  "oral tongue vibrator"
  "rose vibrator for women"
  "clitoral tongue vibrator"
  "tongue massager for women"
  "rose clitoral toy"
)

user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
node_bin="/Users/fengyisong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
tsv_path="$output_root/results.tsv"
printf "index\tkeyword\trank\tcards\tpages\tstatus\tzip\n" > "$tsv_path"

for array_index in "${!keywords[@]}"; do
  item_index=$((array_index + 1))
  if [[ -n "$only_indices" && ",$only_indices," != *",$item_index,"* ]]; then
    continue
  fi
  keyword="${keywords[$array_index]}"
  item_dir="$output_root/$(printf '%02d' "$item_index")"
  mkdir -p "$item_dir"
  cookie_path="$item_dir/cookies.txt"

  home_ok=0
  zip_ok=0
  search_ok=0
  rank_value=""
  card_count=0
  pages_checked=0
  status_value="采集失败"

  if curl --silent --show-error --location --max-time 35 --compressed \
    --cookie-jar "$cookie_path" \
    --user-agent "$user_agent" \
    --header "Accept-Language: en-US,en;q=0.9" \
    --output "$item_dir/home.html" \
    "https://www.amazon.com/"; then
    home_ok=1
  fi

  if [[ "$home_ok" -eq 1 ]] && curl --silent --show-error --location --max-time 35 --compressed \
    --cookie "$cookie_path" \
    --cookie-jar "$cookie_path" \
    --user-agent "$user_agent" \
    --header "Accept-Language: en-US,en;q=0.9" \
    --header "X-Requested-With: XMLHttpRequest" \
    --header "Origin: https://www.amazon.com" \
    --header "Referer: https://www.amazon.com/" \
    --data "locationType=LOCATION_INPUT&zipCode=90001&storeContext=generic&pageType=Gateway&actionSource=glow" \
    --output "$item_dir/zip.json" \
    "https://www.amazon.com/gp/delivery/ajax/address-change.html"; then
    if rg -q '"successful":1' "$item_dir/zip.json" && rg -q '"zipCode":"90001"' "$item_dir/zip.json"; then
      zip_ok=1
    fi
  fi

  if [[ "$zip_ok" -eq 1 ]]; then
    for page_number in $(seq 1 "$max_pages"); do
      search_path="$item_dir/search-page-$page_number.html"
      if curl --silent --show-error --location --max-time 45 --retry 2 --retry-delay 2 --retry-all-errors --http1.1 --compressed \
        --cookie "$cookie_path" \
        --user-agent "$user_agent" \
        --header "Accept-Language: en-US,en;q=0.9" \
        --get \
        --data-urlencode "k=$keyword" \
        --data-urlencode "page=$page_number" \
        --data-urlencode "ref=sr_pg_$page_number" \
        --output "$search_path" \
        "https://www.amazon.com/s"; then
        search_ok=1
      else
        search_ok=0
        status_value="采集失败"
        break
      fi

      parsed="$(
        TARGET_ASIN="$target_asin" SEARCH_HTML="$search_path" "$node_bin" -e '
          const fs = require("fs");
          const html = fs.readFileSync(process.env.SEARCH_HTML, "utf8");
          const matches = [...html.matchAll(/<div\b[^>]*data-component-type="s-search-result"[^>]*>/g)];
          const rows = matches.map((match, index) => {
            const end = matches[index + 1]?.index ?? html.length;
            const chunk = html.slice(match.index, end);
            const asin = match[0].match(/data-asin="([^"]+)"/)?.[1] ?? "";
            const sponsored = /(?:Sponsored|sp-sponsored|sspa\/click|_sspa)/i.test(chunk);
            return { asin, sponsored };
          });
          const organic = rows.filter((row) => !row.sponsored);
          const rankIndex = organic.findIndex((row) => row.asin === process.env.TARGET_ASIN);
          const localRank = rankIndex >= 0 ? rankIndex + 1 : "";
          process.stdout.write([localRank, organic.length].join("\t"));
        '
      )"
      local_rank="$(printf "%s" "$parsed" | cut -f1)"
      page_cards="$(printf "%s" "$parsed" | cut -f2)"
      pages_checked="$page_number"

      if [[ -z "$page_cards" || "$page_cards" -eq 0 ]]; then
        search_ok=0
        status_value="采集失败"
        break
      fi

      if [[ -n "$local_rank" ]]; then
        rank_value=$((card_count + local_rank))
        card_count=$((card_count + page_cards))
        status_value="第${page_number}页有排名"
        break
      fi

      card_count=$((card_count + page_cards))
      if [[ "$page_number" -eq "$max_pages" ]]; then
        status_value="前${max_pages}页未找到"
      fi
    done
  fi

  printf "%s\t%s\t%s\t%s\t%s\t%s\t90001\n" \
    "$item_index" "$keyword" "$rank_value" "$card_count" "$pages_checked" "$status_value" >> "$tsv_path"
  printf "[%02d/25] %s | %s%s | pages: %s | organic cards: %s\n" \
    "$item_index" "$keyword" "$status_value" "${rank_value:+ #$rank_value}" "$pages_checked" "$card_count"
done

printf "RESULT_FILE=%s\n" "$tsv_path"
