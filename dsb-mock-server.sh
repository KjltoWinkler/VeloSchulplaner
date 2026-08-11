#!/bin/sh
# DSB Mock Server - replicates the DSBmobile API for testing
# Supports pushing custom events to test notifications.
# Usage: ./dsb-mock-server.sh [port]
#   POST /push-event  - add an event
#   POST /clear-events - remove all pushed events
#   GET /events       - list all pushed events
#   GET /status       - server status

if ! command -v python3 >/dev/null 2>&1; then
    echo "Error: python3 is required but not found."
    exit 1
fi

TMPFILE=$(mktemp /tmp/dsb-mock-XXXXXX.py)
trap "rm -f $TMPFILE" EXIT

cat > "$TMPFILE" << 'PYEOF'
import http.server, json, base64, gzip, io, uuid, urllib.parse, os, sys
from datetime import datetime

PORT = int(os.environ.get("PORT", "8080"))
HOST = os.environ.get("HOST", "localhost")
CONNECTIONS = 0

pushed_events = []
push_version = 0

BASE_DEFAULT_EVENTS = [
    ("Montag", "10a", "1 - 2", "Mathematik", "Vertretung", "R101", "Lehrer krank"),
    ("Montag", "10b", "3", "Physik", "Entfall", "R102", ""),
    ("Montag", "10a", "5", "Englisch", "Raumanderung", "Turnhalle", "Wasserschaden in R105"),
    ("Montag", "10b", "4 - 5", "Geschichte", "Vertretung", "R203", ""),
    ("Montag", "Q11", "1", "Chemie", "Vertretung", "R301", "Lehrerfortbildung"),
    ("Montag", "Q12", "2 - 3", "Physik LK", "Entfall", "R104", ""),
    ("Dienstag", "10a", "1", "Chemie", "Vertretung", "R301", "Fortbildung"),
    ("Dienstag", "10b", "2", "Englisch", "Entfall", "R104", ""),
    ("Dienstag", "Q11", "3 - 4", "Mathematik", "Vertretung", "R201", ""),
    ("Dienstag", "Q12", "5", "Geschichte", "Raumanderung", "R005", "Raumvertauschung"),
]


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        global CONNECTIONS
        CONNECTIONS += 1
        client = self.client_address[0]
        ts = datetime.now().strftime("%H:%M:%S")
        method = self.command
        path = urllib.parse.urlparse(self.path).path
        label = format % args
        sys.stderr.write("\n")
        sys.stderr.write("  >>> CONN #%d from %s at %s\n" % (CONNECTIONS, client, ts))
        sys.stderr.write("  >>> %s %s  [%s]\n" % (method, path, label))
        sys.stderr.flush()

    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._send_cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path.rstrip("/")
        if path.lower().endswith("/login.aspx"):
            self._handle_login_get()
        elif path.lower().endswith(".htm") or path.lower().endswith(".html"):
            self._handle_plan_get()
        elif path.lower().endswith("/default.aspx"):
            self._handle_default()
        elif path == "/status" or path == "":
            self._handle_status()
        elif path == "/events":
            self._handle_list_events()
        else:
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"DSB Mock Server - use POST /push-event or GET /status")

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path.rstrip("/")
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        if path.lower().endswith("/login.aspx"):
            self._handle_login_post(body)
        elif "ashx/getdata" in path.lower():
            self._handle_api_call(body)
        elif path == "/push-event":
            self._handle_push_event(body)
        elif path == "/clear-events":
            self._handle_clear_events()
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

    def _handle_login_get(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Set-Cookie", "ASP.NET_SessionId=mock-" + uuid.uuid4().hex + "; path=/")
        self._send_cors()
        self.end_headers()
        self.wfile.write(b"""<html><body><form name="form1" method="post">
<input type="hidden" name="__VIEWSTATE" value="/wEPDwUKLTUwNzUxNDUzNQ9kFgJmD2QWAgIBD2QWAgIBD2QWBgIEPZBYEAgEPZBYCZg9kFgICDQ9kFgICAQ9kFgICAQ9kFgJmD2QWAmYPZBYCAgEPZBYEAgsPZBYGAgEPZBYCAgMPZBYCZg9kFgICAQ9kFgYCAQ9kFgICAQ9kFgICAQ9kFgJmD2QWBmYPZBYCZg9kFgJmDxYCHgRocmVmBQx+L1N0YXJ0LmFzcHhkFCsDBWdkZAIHD2QWBGYPZBYCAgMPZBYCZg9kFgICAQ9kFgJmD2QWAgIBD2QWBGYPZBYCZg9kFgJmD2QWAmYPZBYCAgEPZBYCAgEPZBYEAgcPZBYCZg9kFgICAQ9kFgJmD2QWAmYPZBYCAgEPZBYCAgEPZBYCAgEPZBYCAgMPZBYCZg9kFgJmDxYCHgRocmVmBQx+L1N0YXJ0LmFzcHhkFCsDBWdkZAIJD2QWBGYPZBYCAgMPZBYCZg9kFgICAQ9kFgJmD2QWAgIBD2QWBGYPZBYCZg9kFgJmD2QWAmYPZBYCAgEPZBYCAgEPZBYEAgcPZBYCZg9kFgICAQ9kFgJmD2QWAmYPZBYCAgEPZBYCAgEPZBYCAgEPZBYCAgMPZBYCZg9kFgJmDxYCHgRocmVmBQx+L1N0YXJ0LmFzcHhkFCsDBWdkZAIOD2QWAmYPZBYCAgMPZBYCZg9kFgICAQ9kFgJmD2QWAmYPZBYCAgUPZBYCAgEPZBYCZg9kFgICAw9kFgZmD2QWBGYPZBYCAgEPZBYEAgsPZBYCZg9kFgICAQ8UKwACZGRkAgEPZBYCZg9kFgICAQ9kFgJmD2QWAgIBDxYCHgdWaXNpYmxlaGQYAQUKTmF2aWdhdGlvbg8PZAIU" />
<input type="hidden" name="__VIEWSTATEGENERATOR" value="CA1850E6" />
<input type="hidden" name="__EVENTVALIDATION" value="/wEdAATIQk3Gz4TLYnP3qv5qHqL6KNJHNSXHJ3yB7KMURBn+YwVoM8rTqs8cFjFGkNsp4TV1R+r2GvSJ9MhXPnRGCNCQTPP8V7GZ4IJV/1ME/mOmAOCD/ku68hACrWSc4ALiyJ80h4aKVJTrKjJt" />
</form></body></html>""")
        sys.stderr.write("  ~~~~~ Returning login page (with ASP.NET form tokens)\n")
        sys.stderr.flush()

    def _handle_login_post(self, body):
        try:
            params = urllib.parse.parse_qs(body.decode("utf-8"))
        except Exception:
            params = {}
        username = params.get("txtUser", [""])[0]
        sys.stderr.write("  ~~~~~ Login credentials: user=\"%s\" pwd=\"%s\"\n" % (username, params.get("txtPass", [""])[0]))
        sys.stderr.write("  ~~~~-> Accepting any credentials (mock mode)\n")
        sys.stderr.flush()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Set-Cookie", "ASP.NET_SessionId=mock-" + uuid.uuid4().hex + "; path=/")
        self._send_cors()
        self.end_headers()
        self.wfile.write(b"<html><head><title>DSBmobile</title></head><body>OK</body></html>")
        sys.stderr.write("  ~~~~~ Login SUCCESS - session cookie issued\n")
        sys.stderr.flush()

    def _handle_default(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self._send_cors()
        self.end_headers()
        self.wfile.write(b"<html><head><title>DSBmobile</title></head><body>Welcome</body></html>")

    def _handle_api_call(self, body):
        host_hdr = self.headers.get("Host", "")
        base_url = "http://" + host_hdr if ":" in host_hdr else "http://%s:%d" % (host_hdr or HOST, PORT)
        username = "?"
        try:
            req = json.loads(body.decode("utf-8"))
            data_b64 = req.get("req", {}).get("Data", "")
            if data_b64:
                try:
                    raw = base64.b64decode(data_b64)
                    dec = gzip.decompress(raw).decode("utf-8")
                    inner = json.loads(dec)
                    username = inner.get("UserId", "?")
                except Exception:
                    pass
        except Exception:
            pass

        sys.stderr.write("  ~~~~~ Web API call from user=\"%s\"\n" % username)
        sys.stderr.write("  ~~~~-> Returning mock plan menu\n")
        sys.stderr.flush()

        date_str = datetime.now().strftime("%d.%m.%Y")
        menu = {
            "Resultcode": 0,
            "ResultStatusInfo": "",
            "ResultMenuItems": [{
                "Childs": [{
                    "Root": {
                        "Childs": [{
                            "Title": "Vertretungsplan (v%s)" % push_version,
                            "Date": date_str,
                            "Childs": [{
                                "Title": "Vertretungsplan",
                                "Detail": base_url + "/plan.htm"
                            }]
                        }]
                    }
                }]
            }]
        }
        resp_json = json.dumps(menu)
        compressed = gzip.compress(resp_json.encode())
        encoded = base64.b64encode(compressed).decode()
        final = json.dumps({"d": encoded})

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._send_cors()
        self.end_headers()
        self.wfile.write(final.encode())
        sys.stderr.write("  ~~~~~ Plan menu sent (push_version=%s, plan URL: %s/plan.htm)\n" % (push_version, base_url))
        sys.stderr.flush()

    def _handle_plan_get(self):
        date_str = datetime.now().strftime("%d.%m.%Y")
        all_events = BASE_DEFAULT_EVENTS + pushed_events
        days_html = ""
        for day_name in ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"]:
            day_events = [e for e in all_events if e[0] == day_name]
            if day_events:
                rows = "\n".join(
                    "<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>" % e[1:]
                    for e in day_events
                )
                days_html += '<div class="mon_title">%s, %s</div>\n<table>\n%s</table>\n' % (day_name, date_str, rows)

        html = "<html><body>\n%s</body></html>" % days_html
        total_rows = html.count("<tr>")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Set-Cookie", "ASP.NET_SessionId=mock-" + uuid.uuid4().hex + "; path=/")
        self._send_cors()
        self.end_headers()
        self.wfile.write(html.encode("utf-8"))
        day_count = len([d for d in ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag"] if any(e[0]==d for e in all_events)])
        sys.stderr.write("  ~~~~~ Returning plan HTML: %d entries across %d days (%d pushed)\n" % (total_rows, day_count, len(pushed_events)))
        sys.stderr.flush()

    def _handle_status(self):
        total = len(BASE_DEFAULT_EVENTS) + len(pushed_events)
        self._send_json({
            "status": "running",
            "port": PORT,
            "push_version": push_version,
            "default_events": len(BASE_DEFAULT_EVENTS),
            "pushed_events": len(pushed_events),
            "total_events": total,
            "uptime": str(datetime.now() - start_time).split(".")[0] if start_time else "?",
        })
        sys.stderr.write("  ~~~~~ Status requested\n")
        sys.stderr.flush()

    def _handle_list_events(self):
        events = []
        for ev in pushed_events:
            events.append({
                "day": ev[0], "className": ev[1], "lesson": ev[2],
                "subject": ev[3], "type": ev[4], "room": ev[5], "text": ev[6]
            })
        self._send_json({"pushed_events": events, "count": len(events)})
        sys.stderr.write("  ~~~~~ Listed %d pushed events\n" % len(events))
        sys.stderr.flush()

    def _handle_push_event(self, body):
        global pushed_events, push_version
        try:
            data = json.loads(body.decode("utf-8"))
            day = data.get("day", "Montag")
            cls = data.get("className", "10a")
            lesson = data.get("lesson", "1")
            subject = data.get("subject", "Unbekannt")
            typ = data.get("type", "Vertretung")
            room = data.get("room", "")
            text = data.get("text", "")
            pushed_events.append((day, cls, lesson, subject, typ, room, text))
            push_version += 1
            self._send_json({"status": "ok", "pushed_event_count": len(pushed_events), "push_version": push_version})
            sys.stderr.write("  ~~~~~ PUSHED event: %s %s %s %s %s %s %s\n" % (day, cls, lesson, subject, typ, room, text))
            sys.stderr.write("  ~~~~~ Total pushed: %d, version: %d\n" % (len(pushed_events), push_version))
            sys.stderr.flush()
        except Exception as e:
            self._send_json({"status": "error", "error": str(e)}, 400)

    def _handle_clear_events(self):
        global pushed_events, push_version
        count = len(pushed_events)
        pushed_events = []
        push_version += 1
        self._send_json({"status": "ok", "cleared": count, "push_version": push_version})
        sys.stderr.write("  ~~~~~ Cleared %d pushed events (version=%d)\n" % (count, push_version))
        sys.stderr.flush()


start_time = datetime.now()

try:
    import subprocess, re
    out = subprocess.check_output(["ip", "route", "get", "1"], text=True)
    m = re.search(r"src (\S+)", out)
    ip = m.group(1) if m else "127.0.0.1"
except Exception:
    ip = "127.0.0.1"

server = http.server.HTTPServer(("", PORT), Handler)
print()
print("=" * 60)
print("  DSB Mock Server")
print("  Listening on  http://%s:%d" % (HOST, PORT))
print("  Your IP:       http://%s:%d" % (ip, PORT))
print("  Default events: %d" % len(BASE_DEFAULT_EVENTS))
print()
print("  Push events to test notifications:")
print("    curl -X POST http://%s:%d/push-event \\" % (ip, PORT))
print('      -H "Content-Type: application/json" \\')
print("      -d '{\"day\":\"Montag\",\"className\":\"10a\",\"lesson\":\"3\",")
print('           "subject":"Mathe","type":"Vertretung",')
print("           \"room\":\"R101\",\"text\":\"Test notification\"}'")
print()
print("  Other endpoints:")
print("    GET  /status       - server status")
print("    GET  /events       - list pushed events")
print("    POST /clear-events - clear all pushed events")
print()
print("  Use http://%s:%d in the app (tap Connect to custom server)" % (ip, PORT))
print("=" * 60)
print()
sys.stdout.flush()
server.serve_forever()
PYEOF

PORT="${1:-8080}"
HOST="${2:-localhost}"
export PORT HOST
exec python3 "$TMPFILE" "$@"
