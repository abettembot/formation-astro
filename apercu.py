# Aperçu local du site, sans cache navigateur.
# Chaque rechargement relit TOUS les fichiers (page, commun/schema.js, charte.css) :
# une page neuve ne tourne jamais avec un ancien schema.js resté en cache.
# Usage : python apercu.py   (puis http://localhost:8000/)
import functools
import http.server
import os

PORT = 8000
RACINE = os.path.dirname(os.path.abspath(__file__))


class SansCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    handler = functools.partial(SansCache, directory=RACINE)
    with http.server.ThreadingHTTPServer(("", PORT), handler) as serveur:
        print(f"Apercu local : http://localhost:{PORT}/  (Ctrl+C pour arreter)")
        serveur.serve_forever()
