from pathlib import Path
import re
import subprocess
import sys

# Scan tracked text files for private credentials. Firebase web config values
# (apiKey, authDomain, projectId, appId, Google OAuth client ID) are intentionally
# public client identifiers and are not treated as secrets by this check.
patterns = [
    ("private key block", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("service-account private key", re.compile(r'"private_key"\s*:\s*"-----BEGIN')),
    ("Google OAuth client secret", re.compile(r'GOCSPX-[A-Za-z0-9_-]{15,}')),
    ("GitHub personal access token", re.compile(r'\bgh[pousr]_[A-Za-z0-9_]{30,}\b')),
    ("GitHub fine-grained token", re.compile(r'\bgithub_pat_[A-Za-z0-9_]{30,}\b')),
    ("AWS access key ID", re.compile(r'\bAKIA[0-9A-Z]{16}\b')),
    ("Firebase Admin private key marker", re.compile(r'"type"\s*:\s*"service_account"')),
]
result = subprocess.run(
    ["git", "ls-files", "-z"],
    check=True, stdout=subprocess.PIPE
)
bad = []
for raw in result.stdout.split(b"\0"):
    if not raw:
        continue
    path = Path(raw.decode("utf-8", "replace"))
    if not path.is_file() or path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".ico", ".woff", ".woff2"}:
        continue
    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        continue
    for label, pattern in patterns:
        if pattern.search(content):
            bad.append((str(path), label))
if bad:
    for path, label in bad:
        print(f"Potential secret detected: {label} in {path}")
    sys.exit(1)
print("Secret scan passed: no recognized private credentials found in tracked text files.")
