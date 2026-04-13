"""Local dev server with UTF-8 charset for JS/CSS/HTML files."""
import http.server
import os
import sys
import functools

class UTF8Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.html': 'text/html; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
    }

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    directory = sys.argv[2] if len(sys.argv) > 2 else 'public'
    # Resolve relative to script location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    serve_dir = os.path.join(script_dir, directory)
    Handler = functools.partial(UTF8Handler, directory=serve_dir)
    with http.server.HTTPServer(('', port), Handler) as srv:
        print(f'Server auf http://localhost:{port} (serving {serve_dir})')
        srv.serve_forever()
