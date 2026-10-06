#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,sys
root=Path(__file__).resolve().parents[1];manifest=json.loads((root/'MANIFEST-SHA256.json').read_text());errors=[]
for record in manifest['files']:
 path=root/record['path']
 if not path.is_file():errors.append('missing: '+record['path']);continue
 h=hashlib.sha256()
 with path.open('rb') as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 if path.stat().st_size!=record['bytes'] or h.hexdigest()!=record['sha256']:errors.append('changed: '+record['path'])
print('\n'.join(errors) if errors else f"PASS {len(manifest['files'])} files, sizes and SHA-256 match")
sys.exit(bool(errors))
