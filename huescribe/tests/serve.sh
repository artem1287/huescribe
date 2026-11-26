#!/bin/sh
# Start the two fixture servers (site on :8001, "CDN" on :8002) if they are not running.
cd "$(dirname "$0")/fixtures" || exit 1
curl -s -o /dev/null http://127.0.0.1:8001/ || (cd site && setsid nohup python3 -m http.server 8001 >/tmp/pl-site.log 2>&1 &)
curl -s -o /dev/null http://127.0.0.1:8002/theme.css || (cd cdn && setsid nohup python3 -m http.server 8002 >/tmp/pl-cdn.log 2>&1 &)
sleep 1
curl -s -o /dev/null -w "fixtures: %{http_code}\n" http://127.0.0.1:8001/
