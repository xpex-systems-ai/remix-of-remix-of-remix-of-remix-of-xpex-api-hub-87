#!/usr/bin/env python3
"""High-confidence source secret scan for the XPeX API Fabric lineage."""

from __future__ import annotations
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", "node_modules", "dist", "build", ".venv", "venv"}
TEXT_SUFFIXES = {
    ".md", ".txt", ".json", ".yml", ".yaml", ".py", ".js", ".ts", ".tsx",
    ".jsx", ".toml", ".ini", ".cfg", ".xml", ".html", ".css", ".sh", ".ps1"
}
PATTERNS = [
    ("private-key", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("github-pat", re.compile(r"\bghp_[A-Za-z0-9]{36}\b")),
    ("github-fine-grained-pat", re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b")),
    ("aws-access-key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("stripe-live-secret", re.compile(r"\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b")),
    ("openai-project-key", re.compile(r"\bsk-proj-[A-Za-z0-9_-]{24,}\b")),
    ("supabase-service-role-jwt", re.compile(r"\beyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\b")),
]

findings: list[str] = []
for path in ROOT.rglob("*"):
    if not path.is_file():
        continue
    if any(part in SKIP_DIRS for part in path.parts):
        continue
    if path.suffix.lower() not in TEXT_SUFFIXES and path.name not in {"Dockerfile", "Makefile"}:
        continue
    try:
        content = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    for label, pattern in PATTERNS:
        if pattern.search(content):
            findings.append(f"{path.relative_to(ROOT)}: matched {label}")

if findings:
    print("Secret Pattern Scan FAILED")
    for finding in findings:
        print(f"- {finding}")
    sys.exit(1)

print("Secret Pattern Scan OK")
