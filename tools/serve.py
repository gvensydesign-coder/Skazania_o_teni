#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8000);parser.add_argument('--host',default='127.0.0.1');args=parser.parse_args()
root=Path(__file__).resolve().parents[1]/'dist'
class Handler(SimpleHTTPRequestHandler):
 extensions_map={**SimpleHTTPRequestHandler.extensions_map,'.glb':'model/gltf-binary','.gltf':'model/gltf+json','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.otf':'font/otf','.ttf':'font/ttf','.ogg':'audio/ogg','.mp3':'audio/mpeg'}
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(root),**kw)
 def end_headers(self):self.send_header('Cache-Control','no-cache');super().end_headers()
print(f'Game: http://{args.host}:{args.port} (Ctrl+C to stop)',flush=True)
try:ThreadingHTTPServer((args.host,args.port),Handler).serve_forever()
except KeyboardInterrupt:pass
