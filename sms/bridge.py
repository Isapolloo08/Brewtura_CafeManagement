#!/usr/bin/env python3
"""Brewtura SMS bridge - sends and receives SMS through a GSM modem via AT commands.

The bridge exposes a tiny HTTP API so the Node server can send SMS, drain newly
received SMS, and check modem status. Run it on the machine the modem is plugged
into (usually the same PC as the app):

    python sms/bridge.py

Environment variables (defaults in brackets):
    SMS_MODEM_PORT        serial port of the modem        [COM4]
    SMS_MODEM_BAUD        baud rate                       [9600]
    SMS_BRIDGE_PORT       HTTP port this bridge listens on [8008]
    SMS_BRIDGE_TOKEN      shared secret; empty disables auth []
    SMS_POLL_INTERVAL     seconds between SIM scans       [3]
    SMS_DELETE_READ       delete SMS from SIM after handoff [1]

HTTP API:
    GET  /health              -> { ok: true }
    GET  /api/sms/status      -> modem/SIM state
    GET  /api/sms/receive     -> list of newly received messages (drained)
    POST /api/sms/send        -> { to, body } sends a text

Dependencies: pyserial (pip install pyserial). Everything else is stdlib.
"""

import json
import os
import re
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

try:
    import serial
except ImportError:
    serial = None
    print("ERROR: pyserial is required. Run: pip install pyserial")
    raise SystemExit(1)

SERIAL_PORT = os.environ.get("SMS_MODEM_PORT", "COM4")
BAUD_RATE = int(os.environ.get("SMS_MODEM_BAUD", "9600"))
BRIDGE_PORT = int(os.environ.get("SMS_BRIDGE_PORT", "8008"))
BRIDGE_TOKEN = os.environ.get("SMS_BRIDGE_TOKEN", "")
POLL_INTERVAL = int(os.environ.get("SMS_POLL_INTERVAL", "3"))
DELETE_READ = os.environ.get("SMS_DELETE_READ", "1") == "1"

MAX_SMS_CHARS = 160
CMGF_PATTERN = re.compile(r'\+CMGL:\s*(\d+),"([^"]*)","([^"]*)"(?:,"[^"]*")?,"?([^"]*)"?')


class ModemError(Exception):
    pass


class GSMModem:
    def __init__(self, port, baud):
        self.port = port
        self.baud = baud
        self.ser = None
        self.lock = threading.Lock()
        self.last_error = None

    def open(self):
        self.close()
        self.ser = serial.Serial(self.port, self.baud, timeout=2, write_timeout=2)
        self.ser.reset_input_buffer()
        self.ser.reset_output_buffer()
        self._at("ATE0", timeout=3)
        self._at("AT+CMGF=1", timeout=3)
        self._at('AT+CSCS="GSM"', timeout=3)

    def close(self):
        if self.ser:
            try:
                self.ser.close()
            except Exception:
                pass
            self.ser = None

    def _read_until(self, marker, timeout):
        buf = b""
        deadline = time.time() + timeout
        while time.time() < deadline:
            chunk = self.ser.read(1)
            if not chunk:
                if buf.endswith(b"OK\r\n") or b"\nERROR" in buf:
                    break
                continue
            buf += chunk
            if marker in buf:
                break
            if buf.endswith(b"ERROR\r\n") or buf.endswith(b"NO CARRIER\r\n"):
                break
        return buf

    def _at(self, command, timeout=5):
        self.ser.reset_input_buffer()
        self.ser.write((command + "\r").encode("ascii"))
        buf = self._read_until(b"OK", timeout)
        text = buf.decode("utf-8", errors="replace")
        if b"ERROR" in buf and b"OK" not in buf:
            raise ModemError(f"AT command failed: {command} -> {text.strip()}")
        return text

    def ping(self):
        with self.lock:
            self.ser.reset_input_buffer()
            self.ser.write(b"AT\r")
            buf = self._read_until(b"OK", 3)
            return b"OK" in buf

    def status(self):
        with self.lock:
            info = {"port": self.port, "baud": self.baud, "connected": False}
            try:
                if not self.ser:
                    self.open()
                self.ping()
                manufacturer = self._at("AT+CGMI", timeout=3).strip()
                model = self._at("AT+CGMM", timeout=3).strip()
                cpin = self._at("AT+CPIN?", timeout=3).strip()
                csq = self._at("AT+CSQ", timeout=3).strip()
                info.update({
                    "connected": True,
                    "manufacturer": _strip_lines(manufacturer),
                    "model": _strip_lines(model),
                    "sim_state": _strip_lines(cpin),
                    "signal": _strip_lines(csq),
                })
            except ModemError as err:
                info["error"] = str(err)
                self.last_error = str(err)
            except serial.SerialException as err:
                info["error"] = f"Serial error: {err}"
                self.last_error = str(err)
            return info

    def send(self, number, body):
        number = _normalize_number(number)
        if not re.match(r"^\+?\d{7,15}$", number):
            raise ModemError(f"Invalid phone number: {number}")
        parts = [body[i:i + MAX_SMS_CHARS] for i in range(0, len(body), MAX_SMS_CHARS)]
        sent = []
        with self.lock:
            if not self.ser:
                self.open()
            self.ping()
            for part in parts:
                self.ser.reset_input_buffer()
                self.ser.write(f'AT+CMGS="{number}"\r'.encode("ascii"))
                buf = self._read_until(b">", 5)
                if b">" not in buf:
                    raise ModemError(f"No SMS prompt received for {number}: {buf!r}")
                self.ser.write(part.encode("utf-8"))
                self.ser.write(b"\x1a")
                buf = self._read_until(b"OK", 10)
                text = buf.decode("utf-8", errors="replace")
                if b"ERROR" in buf:
                    raise ModemError(f"SMS send failed for {number}: {text.strip()}")
                m = re.search(r'\+CMGS:\s*(\d+)', text)
                sent.append(m.group(1) if m else None)
        return {"number": number, "parts": len(parts), "refs": sent}

    def receive(self):
        with self.lock:
            try:
                if not self.ser:
                    self.open()
                self.ping()
                raw = self._at('AT+CMGL="REC UNREAD"', timeout=8)
            except (ModemError, serial.SerialException) as err:
                self.last_error = str(err)
                return []
            if "+CMGL:" not in raw:
                return []
            messages = _parse_cmgl(raw)
            for msg in messages:
                try:
                    self.ser.write(f"AT+CMGD={msg['index']}\r".encode("ascii"))
                    self._read_until(b"OK", 5)
                except Exception:
                    pass
            return messages

    def delete(self, index):
        with self.lock:
            try:
                self._at(f"AT+CMGD={index}", timeout=5)
                return True
            except ModemError:
                return False


def _strip_lines(text):
    lines = [ln.strip() for ln in text.splitlines() if ln.strip() and ln.strip() != "OK"]
    return " | ".join(lines) if lines else text.strip()


def _normalize_number(number):
    number = str(number or "").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not number.startswith("+"):
        number = "+" + number
    return number


def _parse_cmgl(raw):
    lines = raw.splitlines()
    messages = []
    current = None
    for line in lines:
        stripped = line.strip()
        if stripped == "OK":
            break
        m = CMGF_PATTERN.match(stripped)
        if m:
            if current:
                messages.append(current)
            current = {
                "index": int(m.group(1)),
                "status": m.group(2),
                "number": m.group(3),
                "timestamp": m.group(4),
                "body": "",
            }
        elif current is not None:
            current["body"] += (stripped + "\n")
    if current:
        messages.append(current)
    for msg in messages:
        msg["body"] = msg["body"].strip()
    return messages


class BridgeHandler(BaseHTTPRequestHandler):
    server_version = "BrewturaSMSBridge/1.0"

    def _authorized(self):
        if not BRIDGE_TOKEN:
            return True
        header = self.headers.get("Authorization", "")
        return header == f"Bearer {BRIDGE_TOKEN}"

    def _send_json(self, obj, code=200):
        payload = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        if length <= 0:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return {}

    def do_GET(self):
        if not self._authorized():
            return self._send_json({"error": "Unauthorized"}, 401)
        path = urlparse(self.path).path
        if path == "/health":
            return self._send_json({"ok": True})
        if path == "/api/sms/status":
            return self._send_json(MODEM.status())
        if path == "/api/sms/receive":
            messages = MODEM.receive()
            return self._send_json({"messages": messages})
        return self._send_json({"error": "Not found"}, 404)

    def do_POST(self):
        if not self._authorized():
            return self._send_json({"error": "Unauthorized"}, 401)
        path = urlparse(self.path).path
        if path == "/api/sms/send":
            body = self._read_body()
            to, text = body.get("to"), body.get("body")
            if not to or not text:
                return self._send_json({"error": "to and body are required"}, 400)
            try:
                result = MODEM.send(to, text)
                return self._send_json({"ok": True, **result})
            except (ModemError, serial.SerialException) as err:
                return self._send_json({"ok": False, "error": str(err)}, 500)
        return self._send_json({"error": "Not found"}, 404)

    def log_message(self, format, *args):
        if os.environ.get("SMS_BRIDGE_DEBUG") == "1":
            super().log_message(format, *args)


def poll_loop():
    while True:
        try:
            messages = MODEM.receive()
            if messages:
                print(f"📩 Received {len(messages)} SMS from modem")
        except Exception as err:
            MODEM.last_error = str(err)
        time.sleep(POLL_INTERVAL)


MODEM = GSMModem(SERIAL_PORT, BAUD_RATE)


def main():
    if serial is None:
        print("ERROR: pyserial is not installed. Run: pip install pyserial")
        raise SystemExit(1)
    try:
        MODEM.open()
        print(f"📡 Modem initialized on {SERIAL_PORT} @ {BAUD_RATE}")
        print(f"   Status: {MODEM.status()}")
    except (ModemError, serial.SerialException) as err:
        print(f"⚠️  Could not open modem yet ({err}). Will retry when endpoints are hit.")

    threading.Thread(target=poll_loop, daemon=True).start()
    server = ThreadingHTTPServer(("0.0.0.0", BRIDGE_PORT), BridgeHandler)
    print(f"🌐 SMS bridge listening on port {BRIDGE_PORT}")
    if BRIDGE_TOKEN:
        print("🔑 Token auth enabled")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down bridge")
        MODEM.close()


if __name__ == "__main__":
    main()