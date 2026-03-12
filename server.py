#!/usr/bin/env python3
"""
ListingFlow API Server
Serves the ListingFlow HTML app AND handles form generation requests.

Endpoints:
  GET  /              → ListingFlow.html
  GET  /static/<file> → static files in same directory
  POST /api/form      → JSON {form_key, listing, cfg} → PDF bytes
  POST /api/form/html → JSON {form_key, listing, cfg} → HTML (editable form)
  GET  /api/health    → {"ok":true}
"""

import sys, os, json, traceback
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# ── Locate project directory ──────────────────────────────────────────────────
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

PORT = int(os.environ.get('LISTINGFLOW_PORT', 8767))


class Handler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        # Suppress default access log noise (favicon etc)
        path = args[0] if args else ''
        if 'favicon' not in str(path):
            super().log_message(fmt, *args)

    # ── CORS preflight ────────────────────────────────────────────────────────
    def do_OPTIONS(self):
        self._cors()
        self.send_response(204)
        self.end_headers()

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin',  '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    # ── GET ───────────────────────────────────────────────────────────────────
    def do_GET(self):
        path = urlparse(self.path).path.lstrip('/')

        if path in ('', 'index.html'):
            self._serve_file('ListingFlow.html', 'text/html; charset=utf-8')
        elif path == 'api/health':
            self._json({'ok': True, 'port': PORT})
        elif path == 'api/push-manifest':
            import base64
            try:
                manifest = {}
                push_files = ['ListingFlow.html', 'server.py', 'forms_html.py', 'ListingFlow.command']
                for rel in push_files:
                    fp = os.path.join(HERE, rel)
                    if os.path.isfile(fp):
                        with open(fp, 'rb') as fh:
                            manifest[rel] = base64.b64encode(fh.read()).decode()
                forms_dir = os.path.join(HERE, 'forms')
                for fname in sorted(os.listdir(forms_dir)):
                    if fname.endswith('.html'):
                        fp = os.path.join(forms_dir, fname)
                        with open(fp, 'rb') as fh:
                            manifest['forms/' + fname] = base64.b64encode(fh.read()).decode()
                self._json({'ok': True, 'files': manifest})
            except Exception as e:
                self._send(500, json.dumps({'error': str(e)}).encode(), 'application/json')
        elif path in ('gen_forms.py', 'gen_dorts.py', 'server.py'):
            # Block source code access
            self._send(403, b'Forbidden', 'text/plain')
        else:
            # Try to serve static file from HERE
            fpath = os.path.join(HERE, path)
            if os.path.isfile(fpath):
                mime = self._mime(path)
                self._serve_file(path, mime)
            else:
                self._send(404, b'Not Found', 'text/plain')

    # ── POST ──────────────────────────────────────────────────────────────────
    def do_POST(self):
        path = urlparse(self.path).path

        if path == '/api/save-files':
            # ── Receive batch of GitHub files and write them to disk ───────────
            import base64
            length = int(self.headers.get('Content-Length', 0))
            body   = self.rfile.read(length)
            try:
                payload = json.loads(body)
                files   = payload.get('files', [])
                dest    = os.path.join(HERE, 'realtorai')
                saved, skipped = 0, 0
                for f in files:
                    rel  = f.get('path', '')
                    enc  = f.get('content_b64', '')
                    if not rel or not enc:
                        skipped += 1; continue
                    full = os.path.join(dest, rel)
                    os.makedirs(os.path.dirname(full), exist_ok=True)
                    try:
                        with open(full, 'wb') as fh:
                            fh.write(base64.b64decode(enc))
                        saved += 1
                    except Exception as fe:
                        print(f'[SAVE] skip {rel}: {fe}')
                        skipped += 1
                print(f'[SAVE-FILES] saved={saved} skipped={skipped} → {dest}')
                self._json({'ok': True, 'saved': saved, 'skipped': skipped})
            except Exception as e:
                tb = traceback.format_exc()
                print(f'[ERROR] /api/save-files: {e}\n{tb}')
                self._send(500, json.dumps({'error': str(e)}).encode(), 'application/json')

        elif path == '/api/upload-zip':
            # ── Receive ZIP from browser and save it ───────────────────────────
            length = int(self.headers.get('Content-Length', 0))
            body   = self.rfile.read(length)
            try:
                save_path = os.path.join(HERE, '_github_repo.zip')
                with open(save_path, 'wb') as f:
                    f.write(body)
                print(f'[UPLOAD] Saved {len(body):,} bytes → {save_path}')
                self._json({'ok': True, 'bytes': len(body), 'path': save_path})
            except Exception as e:
                self._send(500, json.dumps({'error': str(e)}).encode(), 'application/json')

        elif path == '/api/push-manifest':
            # ── Return all ListingFlow files as base64 JSON for GitHub push ──────
            import base64, glob as _glob
            try:
                manifest = {}
                push_files = [
                    'ListingFlow.html', 'server.py', 'forms_html.py', 'ListingFlow.command',
                ]
                for rel in push_files:
                    fp = os.path.join(HERE, rel)
                    if os.path.isfile(fp):
                        with open(fp, 'rb') as fh:
                            manifest[rel] = base64.b64encode(fh.read()).decode()
                # Add forms/
                forms_dir = os.path.join(HERE, 'forms')
                for fname in sorted(os.listdir(forms_dir)):
                    if fname.endswith('.html'):
                        fp = os.path.join(forms_dir, fname)
                        with open(fp, 'rb') as fh:
                            manifest['forms/' + fname] = base64.b64encode(fh.read()).decode()
                self._json({'ok': True, 'files': manifest})
            except Exception as e:
                self._send(500, json.dumps({'error': str(e)}).encode(), 'application/json')

        elif path == '/api/form/html':
            # ── Editable HTML form (primary path) ─────────────────────────────
            length = int(self.headers.get('Content-Length', 0))
            body   = self.rfile.read(length)
            try:
                payload  = json.loads(body)
                form_key = payload.get('form_key', '')
                data     = {
                    'listing': payload.get('listing', {}),
                    'cfg':     payload.get('cfg', {}),
                }
                from forms_html import generate_html_form
                html = generate_html_form(form_key, data)
                html_bytes = html.encode('utf-8')
                self.send_response(200)
                self._cors()
                self.send_header('Content-Type',   'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(html_bytes)))
                self.end_headers()
                self.wfile.write(html_bytes)
            except Exception as e:
                tb = traceback.format_exc()
                print(f'[ERROR] /api/form/html: {e}\n{tb}')
                self._send(500, json.dumps({'error': str(e)}).encode(), 'application/json')

        elif path == '/api/form':
            # ── PDF form (legacy / kept for compatibility) ────────────────────
            length = int(self.headers.get('Content-Length', 0))
            body   = self.rfile.read(length)
            try:
                payload  = json.loads(body)
                form_key = payload.get('form_key', '')
                data     = {
                    'listing': payload.get('listing', {}),
                    'cfg':     payload.get('cfg', {}),
                }
                from gen_forms import generate_form
                pdf = generate_form(form_key, data)
                self.send_response(200)
                self._cors()
                self.send_header('Content-Type',        'application/pdf')
                self.send_header('Content-Disposition', f'inline; filename="{form_key.upper()}_Form.pdf"')
                self.send_header('Content-Length',      str(len(pdf)))
                self.end_headers()
                self.wfile.write(pdf)
            except Exception as e:
                tb = traceback.format_exc()
                print(f'[ERROR] /api/form: {e}\n{tb}')
                self._send(500, json.dumps({'error': str(e)}).encode(), 'application/json')
        else:
            self._send(404, b'Not Found', 'text/plain')

    # ── Helpers ───────────────────────────────────────────────────────────────
    def _serve_file(self, filename, mime):
        fpath = os.path.join(HERE, filename)
        try:
            with open(fpath, 'rb') as f:
                data = f.read()
            self._send(200, data, mime)
        except FileNotFoundError:
            self._send(404, b'File not found', 'text/plain')

    def _json(self, obj):
        body = json.dumps(obj).encode()
        self._send(200, body, 'application/json')

    def _send(self, code, body, mime):
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type',   mime)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    @staticmethod
    def _mime(path):
        ext = os.path.splitext(path)[1].lower()
        return {
            '.html': 'text/html; charset=utf-8',
            '.js':   'application/javascript',
            '.css':  'text/css',
            '.pdf':  'application/pdf',
            '.json': 'application/json',
            '.png':  'image/png',
            '.jpg':  'image/jpeg',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }.get(ext, 'application/octet-stream')


def main():
    os.chdir(HERE)
    httpd = HTTPServer(('127.0.0.1', PORT), Handler)
    print(f'✅  ListingFlow server running → http://127.0.0.1:{PORT}', flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    print('Server stopped.')


if __name__ == '__main__':
    main()
