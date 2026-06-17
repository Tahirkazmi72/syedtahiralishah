#!/usr/bin/env python3
"""Sync journal publications from a public Ciencia Vitae CV into site-data.json.

The script updates only the publications items array. Existing manual entries are
preserved unless they match a Ciencia Vitae DOI/title, in which case status,
year, DOI link, and source metadata are refreshed from the CV data.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import ssl
import sys
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path


DEFAULT_CV_URL = "https://www.cienciavitae.pt//F712-C83E-0EFB"
DEFAULT_DATA_PATH = Path("assets/data/site-data.json")
SOURCE = "cienciavitae"


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"br", "p", "div", "li", "tr", "h1", "h2", "h3", "h4"}:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"p", "div", "li", "tr", "h1", "h2", "h3", "h4"}:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if data.strip():
            self.parts.append(data)

    def text(self) -> str:
        text = html.unescape(" ".join(self.parts))
        text = re.sub(r"[ \t\r\f\v]+", " ", text)
        text = re.sub(r"\n\s+", "\n", text)
        return text


def fetch_html(url: str) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 publication-sync/1.0",
        "Accept": "text/html,application/xhtml+xml",
    }

    try:
        response = urllib.request.urlopen(
            urllib.request.Request(url, headers=headers),
            timeout=40,
        )
    except urllib.error.URLError as exc:
        if not isinstance(exc.reason, ssl.SSLCertVerificationError):
            raise
        print(
            "Warning: certificate verification failed, retrying with an unverified SSL context.",
            file=sys.stderr,
        )
        response = urllib.request.urlopen(
            urllib.request.Request(url, headers=headers),
            timeout=40,
            context=ssl._create_unverified_context(),
        )

    with response:
        content = response.read()
        charset = response.headers.get_content_charset() or "utf-8"

    return content.decode(charset, errors="replace")


def fragment_text(fragment: str) -> str:
    parser = TextExtractor()
    parser.feed(fragment)
    return parser.text()


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip(" .\n\t")


def extract_year(text: str) -> int:
    years = [int(value) for value in re.findall(r"\b(19\d{2}|20\d{2})\b", text)]
    return max(years) if years else 0


def doi_url(doi: str | None) -> str | None:
    if not doi:
        return None
    return f"https://doi.org/{doi}"


def normalize_key(value: str) -> str:
    value = re.sub(r"https?://(?:dx\.)?doi\.org/", "", value, flags=re.I)
    value = re.sub(r"https?://zenodo\.org/doi/", "", value, flags=re.I)
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def publication_keys(item: dict, *, include_title: bool = True) -> list[str]:
    keys: list[str] = []
    url = item.get("url") or ""
    doi_match = re.search(r"(10\.\d{4,9}/\S+)", url, flags=re.I)
    if doi_match:
        keys.append(normalize_key(doi_match.group(1)))

    title = item.get("title") or ""
    if include_title and title:
        keys.append(normalize_key(title))

    return [key for key in keys if key]


def section_items(page_html: str, label: str) -> list[str]:
    pattern = re.compile(
        rf"<td>\s*{re.escape(label)}\s*</td>\s*<td[^>]*>(?P<section>.*?)</td>\s*</tr>",
        flags=re.I | re.S,
    )
    match = pattern.search(page_html)
    if not match:
        return []
    return re.findall(r"<li[^>]*>(.*?)</li>", match.group("section"), flags=re.I | re.S)


def div_texts(fragment: str) -> list[str]:
    return [
        clean(fragment_text(value))
        for value in re.findall(r"<div[^>]*>(.*?)</div>", fragment, flags=re.I | re.S)
    ]


def extract_doi(fragment: str) -> str | None:
    hrefs = re.findall(r'href=["\']([^"\']+)["\']', fragment, flags=re.I)
    for href in hrefs:
        match = re.search(r"(10\.\d{4,9}/[^\s\"'<>]+)", href, flags=re.I)
        if match:
            return clean(match.group(1).rstrip(" ."))

    for value in div_texts(fragment) + [fragment_text(fragment)]:
        match = re.search(r"(10\.\d{4,9}/[^\s\"'<>]+)", value, flags=re.I)
        if match:
            return clean(match.group(1).rstrip(" ."))

    return None


def status_from_text(value: str, year: int) -> tuple[str, str]:
    lowered = value.lower()
    if "submetido" in lowered:
        prefix = "Submitted - Open Access" if "acesso aberto" in lowered else "Submitted"
        return f"{prefix} ({year})" if year else prefix, "submitted"
    if "aceite" in lowered:
        return f"Accepted ({year})" if year else "Accepted", "accepted"
    return f"Published ({year})" if year else "Published", "published"


def parse_publications(page_html: str) -> list[dict]:
    publications: list[dict] = []

    for fragment in section_items(page_html, "Artigo em revista"):
        entry = clean(fragment_text(fragment))
        first_quote = entry.find('"')
        title_end = entry.rfind('".')
        if first_quote == -1 or title_end <= first_quote:
            continue

        authors = clean(entry[:first_quote].replace(";", ","))
        title = clean(entry[first_quote + 1 : title_end])
        nested_title = re.search(r'"([^"]+)"$', title)
        if nested_title:
            title = clean(nested_title.group(1))

        tail = entry[title_end + 2 :]
        doi = extract_doi(fragment)
        status_values = [
            value
            for value in div_texts(fragment)
            if re.search(r"submetido|aceite|publicado|acesso", value, flags=re.I)
        ]
        status_text = status_values[-1] if status_values else ""

        venue = tail
        for value in div_texts(fragment):
            venue = venue.replace(value, " ")
        venue = re.sub(r"https?://\S+", " ", venue)
        venue = re.sub(r"10\.\d{4,9}/\S+", " ", venue, flags=re.I)
        venue = clean(venue).strip(":")
        year = extract_year(venue) or extract_year(entry)
        status, status_type = status_from_text(status_text, year)

        publication = {
            "category": "journal",
            "year": year,
            "status": status,
            "statusType": status_type,
            "title": title,
            "venue": venue,
            "authors": authors,
            "url": doi_url(doi),
        }
        if publication["url"]:
            publication["linkLabel"] = "Read Article"
        publication["source"] = SOURCE
        publications.append(publication)

    return dedupe_publications(publications)


def dedupe_publications(items: list[dict]) -> list[dict]:
    deduped: list[dict] = []
    seen: set[str] = set()

    for item in items:
        key = normalize_key(item.get("title", ""))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)

    return deduped


def merge_item(existing: dict, synced: dict) -> dict:
    merged = existing.copy()
    for field in ("category", "year", "status", "statusType", "url", "linkLabel", "source"):
        value = synced.get(field)
        if value not in (None, ""):
            merged[field] = value

    for field in ("title", "venue", "authors"):
        if not merged.get(field) and synced.get(field):
            merged[field] = synced[field]

    return merged


def merge_publications(existing: list[dict], synced: list[dict]) -> list[dict]:
    synced_by_key: dict[str, dict] = {}
    for item in synced:
        for key in publication_keys(item):
            synced_by_key.setdefault(key, item)

    merged: list[dict] = []
    used_items: set[int] = set()

    for item in existing:
        include_title = item.get("category") == "journal"
        matched = next(
            (synced_by_key[key] for key in publication_keys(item, include_title=include_title) if key in synced_by_key),
            None,
        )
        if matched:
            merged.append(merge_item(item, matched))
            used_items.add(id(matched))
        else:
            merged.append(item)

    for item in [item for item in synced if id(item) not in used_items]:
        merged.insert(publication_insert_index(merged, item), item)

    return merged


def publication_insert_index(items: list[dict], new_item: dict) -> int:
    new_year = int(new_item.get("year") or 0)
    for index, item in enumerate(items):
        if item.get("category") != "journal":
            return index
        item_year = int(item.get("year") or 0)
        if item_year < new_year:
            return index
    return len(items)


def find_publications_items_span(raw: str) -> tuple[int, int]:
    publications_at = raw.find('"publications"')
    if publications_at == -1:
        raise ValueError("Could not find publications section.")
    items_at = raw.find('"items"', publications_at)
    if items_at == -1:
        raise ValueError("Could not find publications items.")
    start = raw.find("[", items_at)
    if start == -1:
        raise ValueError("Could not find publications items array.")

    depth = 0
    in_string = False
    escape = False
    for index in range(start, len(raw)):
        char = raw[index]
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
        elif char == "[":
            depth += 1
        elif char == "]":
            depth -= 1
            if depth == 0:
                return start, index + 1

    raise ValueError("Could not parse publications items array.")


def dump_items(items: list[dict]) -> str:
    lines = json.dumps(items, indent=2, ensure_ascii=True).splitlines()
    return "\n".join([lines[0], *[f"    {line}" for line in lines[1:]]])


def write_publications_items(data_path: Path, items: list[dict]) -> None:
    raw = data_path.read_text(encoding="utf-8")
    start, end = find_publications_items_span(raw)
    data_path.write_text(raw[:start] + dump_items(items) + raw[end:], encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cv-url", default=DEFAULT_CV_URL)
    parser.add_argument("--data-path", type=Path, default=DEFAULT_DATA_PATH)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    page_html = fetch_html(args.cv_url)
    synced = parse_publications(page_html)
    if not synced:
        print("No journal publications found in Ciencia Vitae CV.", file=sys.stderr)
        return 1

    data = json.loads(args.data_path.read_text(encoding="utf-8"))
    existing = data["publications"]["items"]
    data["publications"]["items"] = merge_publications(existing, synced)

    if args.dry_run:
        print(f"Found {len(synced)} Ciencia Vitae journal publications.")
        return 0

    write_publications_items(args.data_path, data["publications"]["items"])
    print(f"Synced {len(synced)} Ciencia Vitae journal publications.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
