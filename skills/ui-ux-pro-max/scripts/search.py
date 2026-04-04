#!/usr/bin/env python3
"""
UI/UX Pro Max — Search CLI
Searches design system data (palettes, fonts, styles, UX rules, charts, etc.)
and generates complete design system recommendations for the project.

Usage:
  python3 skills/ui-ux-pro-max/scripts/search.py "<query>" [flags]

Flags:
  --domain <domain>    Search specific domain
  --design-system      Generate full design system recommendation
  --stack <stack>      Stack-specific guidelines (react|tailwind|shadcn|web)
  --persist            Save design system to design-system/MASTER.md
  --page <name>        Also save page-specific override
  -p "Name"            Project name for output
  -f markdown|ascii    Output format (default: ascii)
  -n <int>             Max results per domain (default: 5)
"""

import csv
import sys
import os
import argparse
import textwrap
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "data"
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent

# ── Domain → CSV file mapping ─────────────────────────────────────────────
DOMAIN_FILES = {
    "color":       "palettes.csv",
    "palette":     "palettes.csv",
    "typography":  "fonts.csv",
    "font":        "fonts.csv",
    "fonts":       "fonts.csv",
    "product":     "products.csv",
    "products":    "products.csv",
    "style":       "styles.csv",
    "styles":      "styles.csv",
    "ux":          "ux.csv",
    "chart":       "charts.csv",
    "charts":      "charts.csv",
    "landing":     "landing.csv",
    "prompt":      "prompt.csv",
    "prompts":     "prompt.csv",
    "react":       "stacks.csv",
    "tailwind":    "stacks.csv",
    "shadcn":      "stacks.csv",
    "web":         "stacks.csv",
    "stack":       "stacks.csv",
    "stacks":      "stacks.csv",
    "reasoning":   "ui-reasoning.csv",
    "ui-reasoning":"ui-reasoning.csv",
}


# ── CSV Loader ────────────────────────────────────────────────────────────────
def load_csv(domain: str) -> list[dict]:
    filename = DOMAIN_FILES.get(domain.lower())
    if not filename:
        print(f"[ERROR] Unknown domain '{domain}'. Available: {', '.join(set(DOMAIN_FILES.keys()))}")
        sys.exit(1)
    filepath = DATA_DIR / filename
    if not filepath.exists():
        print(f"[ERROR] Data file not found: {filepath}")
        sys.exit(1)
    with open(filepath, encoding="utf-8") as f:
        return list(csv.DictReader(f))


# ── Scoring ───────────────────────────────────────────────────────────────────
def score_row(row: dict, keywords: list[str]) -> int:
    """Score a CSV row by keyword matches across all fields."""
    text = " ".join(str(v).lower() for v in row.values())
    score = 0
    for kw in keywords:
        kw = kw.lower()
        # Exact word match in tags = 3 pts, elsewhere = 1 pt
        tags = row.get("tags", "").lower()
        if kw in tags.split():
            score += 3
        elif kw in tags:
            score += 2
        elif kw in text:
            score += 1
    return score


def search(query: str, domain: str, n: int = 5, stack_filter: str = None) -> list[dict]:
    """Search a domain CSV and return top-n results."""
    rows = load_csv(domain)
    keywords = query.lower().split()

    # Filter by stack column if applicable
    if stack_filter and domain.lower() in ("react", "tailwind", "shadcn", "web", "stack", "stacks"):
        rows = [r for r in rows if stack_filter.lower() in r.get("stack", "").lower()]

    scored = [(score_row(r, keywords), r) for r in rows]
    scored.sort(key=lambda x: x[0], reverse=True)
    # Return only results with at least 1 match
    return [r for s, r in scored if s > 0][:n]


# ── Formatters ────────────────────────────────────────────────────────────────
def fmt_ascii_box(title: str, lines: list[str]) -> str:
    width = max(len(title), max((len(l) for l in lines), default=0)) + 4
    top = "╔" + "═" * width + "╗"
    head = f"║  {title:<{width-2}}║"
    sep = "╠" + "═" * width + "╣"
    body = "\n".join(f"║  {l:<{width-2}}║" for l in lines)
    bot = "╚" + "═" * width + "╝"
    return "\n".join([top, head, sep, body, bot])


def fmt_markdown_section(title: str, lines: list[str]) -> str:
    return f"## {title}\n\n" + "\n".join(f"- {l}" for l in lines) + "\n"


def wrap(text: str, width: int = 70) -> list[str]:
    return textwrap.wrap(str(text), width=width)


# ── Domain Result Renderers ───────────────────────────────────────────────────
def render_palette(rows: list[dict], fmt: str) -> str:
    parts = []
    for r in rows:
        lines = [
            f"Name: {r.get('name','')}",
            f"Industry: {r.get('industry','')} | Tone: {r.get('tone','')}",
            f"Primary: {r.get('primary','')} | Secondary: {r.get('secondary','')} | Accent: {r.get('accent','')}",
            f"Background: {r.get('background','')} | Surface: {r.get('surface','')} | Text: {r.get('text','')}",
        ]
        if fmt == "markdown":
            parts.append(fmt_markdown_section(r.get("name",""), lines))
        else:
            parts.append(fmt_ascii_box(r.get("name","Palette"), lines))
    return "\n\n".join(parts)


def render_font(rows: list[dict], fmt: str) -> str:
    parts = []
    for r in rows:
        lines = [
            f"Heading: {r.get('heading','')} | Body: {r.get('body','')} | Mono: {r.get('mono','')}",
            f"Personality: {r.get('personality','')} | Heading weight: {r.get('weight_heading','')}",
            f"Use case: {r.get('use_case','')}",
        ]
        if fmt == "markdown":
            parts.append(fmt_markdown_section(f"{r.get('heading','')} + {r.get('body','')}", lines))
        else:
            parts.append(fmt_ascii_box(f"{r.get('heading','')} + {r.get('body','')}", lines))
    return "\n\n".join(parts)


def render_style(rows: list[dict], fmt: str) -> str:
    parts = []
    for r in rows:
        lines = [
            f"Description: {r.get('description','')}",
            f"Effects: {r.get('effects','')}",
            f"Radius: {r.get('radius','')} | Shadows: {r.get('shadows','')}",
            f"Use case: {r.get('use_case','')}",
            f"Avoid: {r.get('anti_patterns','')}",
        ]
        if fmt == "markdown":
            parts.append(fmt_markdown_section(r.get("name",""), lines))
        else:
            parts.append(fmt_ascii_box(r.get("name","Style"), lines))
    return "\n\n".join(parts)


def render_product(rows: list[dict], fmt: str) -> str:
    parts = []
    for r in rows:
        lines = [
            f"Category: {r.get('category','')}",
            f"Description: {r.get('description','')}",
            f"Recommended style: {r.get('recommended_style','')}",
            f"Recommended palette: {r.get('recommended_palette','')}",
        ]
        if fmt == "markdown":
            parts.append(fmt_markdown_section(r.get("name",""), lines))
        else:
            parts.append(fmt_ascii_box(r.get("name","Product"), lines))
    return "\n\n".join(parts)


def render_ux(rows: list[dict], fmt: str) -> str:
    parts = []
    for r in rows:
        lines = [
            f"Category: {r.get('category','')} | Priority: {r.get('priority','')}",
            *wrap(r.get("description",""), 68),
        ]
        if fmt == "markdown":
            parts.append(fmt_markdown_section(r.get("name",""), lines))
        else:
            parts.append(fmt_ascii_box(r.get("name","UX Rule"), lines))
    return "\n\n".join(parts)


def render_chart(rows: list[dict], fmt: str) -> str:
    parts = []
    for r in rows:
        lines = [
            f"Use case: {r.get('use_case','')}",
            f"Data type: {r.get('data_type','')} | Library: {r.get('library','')}",
            f"When to use: {r.get('when_to_use','')}",
            f"Avoid when: {r.get('when_not_to_use','')}",
        ]
        if fmt == "markdown":
            parts.append(fmt_markdown_section(r.get("name",""), lines))
        else:
            parts.append(fmt_ascii_box(r.get("name","Chart"), lines))
    return "\n\n".join(parts)


def render_stack(rows: list[dict], fmt: str) -> str:
    parts = []
    for r in rows:
        lines = [
            f"Stack: {r.get('stack','')} | Category: {r.get('category','')}",
            *wrap(r.get("description",""), 68),
            f"Example: {r.get('example','')}",
        ]
        if fmt == "markdown":
            parts.append(fmt_markdown_section(r.get("rule",""), lines))
        else:
            parts.append(fmt_ascii_box(r.get("rule","Rule"), lines))
    return "\n\n".join(parts)


def render_landing(rows: list[dict], fmt: str) -> str:
    parts = []
    for r in rows:
        lines = [
            f"Description: {r.get('description','')}",
            f"Sections: {r.get('sections','')}",
            f"CTA strategy: {r.get('cta_strategy','')}",
            f"Use case: {r.get('use_case','')}",
        ]
        if fmt == "markdown":
            parts.append(fmt_markdown_section(r.get("name",""), lines))
        else:
            parts.append(fmt_ascii_box(r.get("name","Landing"), lines))
    return "\n\n".join(parts)


def render_prompt(rows: list[dict], fmt: str) -> str:
    parts = []
    for r in rows:
        lines = [
            f"Style: {r.get('style','')}",
            f"CSS keywords: {r.get('css_keywords','')}",
            f"AI Prompt: {r.get('ai_prompt','')}",
            f"Tailwind: {r.get('tailwind_classes','')}",
        ]
        if fmt == "markdown":
            parts.append(fmt_markdown_section(r.get("id",""), lines))
        else:
            parts.append(fmt_ascii_box(r.get("id","Prompt"), lines))
    return "\n\n".join(parts)


def render_reasoning(rows: list[dict], fmt: str) -> str:
    parts = []
    for r in rows:
        lines = [
            f"Product type: {r.get('product_type','')}",
            f"Style: {r.get('recommended_style','')} | Palette: {r.get('recommended_palette','')}",
            f"Font: {r.get('recommended_font','')}",
            *wrap(r.get("reasoning",""), 68),
        ]
        if fmt == "markdown":
            parts.append(fmt_markdown_section(r.get("product_type",""), lines))
        else:
            parts.append(fmt_ascii_box(r.get("product_type","Reasoning"), lines))
    return "\n\n".join(parts)


DOMAIN_RENDERERS = {
    "color": render_palette, "palette": render_palette,
    "typography": render_font, "font": render_font, "fonts": render_font,
    "style": render_style, "styles": render_style,
    "product": render_product, "products": render_product,
    "ux": render_ux,
    "chart": render_chart, "charts": render_chart,
    "landing": render_landing,
    "prompt": render_prompt, "prompts": render_prompt,
    "react": render_stack, "tailwind": render_stack, "shadcn": render_stack,
    "web": render_stack, "stack": render_stack, "stacks": render_stack,
    "reasoning": render_reasoning, "ui-reasoning": render_reasoning,
}


# ── Design System Generator ───────────────────────────────────────────────────
def generate_design_system(query: str, project: str, fmt: str, n: int) -> str:
    """Generate a complete design system recommendation."""
    keywords = query.lower().split()

    # Search all relevant domains
    reasoning_rows = search(query, "reasoning", n=3)
    product_rows = search(query, "product", n=2)
    style_rows = search(query, "style", n=2)
    palette_rows = search(query, "color", n=2)
    font_rows = search(query, "typography", n=2)

    # Pick top recommendation from reasoning if available
    top_reasoning = reasoning_rows[0] if reasoning_rows else {}
    top_product = product_rows[0] if product_rows else {}
    top_style = style_rows[0] if style_rows else {}
    top_palette = palette_rows[0] if palette_rows else {}
    top_font = font_rows[0] if font_rows else {}

    # Resolve cross-references from reasoning
    if top_reasoning.get("recommended_style"):
        style_override = search(top_reasoning["recommended_style"].replace("-", " "), "style", n=1)
        if style_override:
            top_style = style_override[0]
    if top_reasoning.get("recommended_palette"):
        palette_override = search(top_reasoning["recommended_palette"].replace("-", " "), "color", n=1)
        if palette_override:
            top_palette = palette_override[0]
    if top_reasoning.get("recommended_font"):
        font_override = search(top_reasoning["recommended_font"].replace("-", " "), "typography", n=1)
        if font_override:
            top_font = font_override[0]

    separator = "─" * 72

    sections = []

    # Header
    sections.append(f"""
{'═'*72}
  UI/UX DESIGN SYSTEM — {project.upper() if project else 'PROJECT'}
  Query: "{query}"
{'═'*72}
""".strip())

    # Reasoning
    if top_reasoning:
        sections.append(f"""
{separator}
  PRODUCT MATCH & REASONING
{separator}
  Product type : {top_reasoning.get('product_type', '—')}
  Keywords     : {top_reasoning.get('industry_keywords', '—')}

  Reasoning:
{chr(10).join('  ' + l for l in wrap(top_reasoning.get('reasoning', ''), 68))}
""".strip())

    # Style
    if top_style:
        sections.append(f"""
{separator}
  RECOMMENDED STYLE: {top_style.get('name', '—').upper()}
{separator}
  Description  : {top_style.get('description', '—')}
  Effects      : {top_style.get('effects', '—')}
  Border radius: {top_style.get('radius', '—')}
  Shadows      : {top_style.get('shadows', '—')}
  Avoid        : {top_style.get('anti_patterns', '—')}
""".strip())

    # Palette
    if top_palette:
        sections.append(f"""
{separator}
  COLOR PALETTE: {top_palette.get('name', '—').upper()}
{separator}
  Industry     : {top_palette.get('industry', '—')} | Tone: {top_palette.get('tone', '—')}
  Primary      : {top_palette.get('primary', '—')}
  Secondary    : {top_palette.get('secondary', '—')}
  Accent       : {top_palette.get('accent', '—')}
  Background   : {top_palette.get('background', '—')}
  Surface      : {top_palette.get('surface', '—')}
  Text         : {top_palette.get('text', '—')}
""".strip())

    # Typography
    if top_font:
        sections.append(f"""
{separator}
  TYPOGRAPHY
{separator}
  Heading      : {top_font.get('heading', '—')} (weight: {top_font.get('weight_heading', '—')})
  Body         : {top_font.get('body', '—')}
  Monospace    : {top_font.get('mono', '—')}
  Personality  : {top_font.get('personality', '—')}
  Use case     : {top_font.get('use_case', '—')}
""".strip())

    # Project-specific context
    sections.append(f"""
{separator}
  PROJECT CONTEXT (Calendario Compliance)
{separator}
  Stack        : React 18 + Vite + TypeScript + Tailwind CSS 3.4
  Components   : shadcn/ui (47 components) + Radix UI primitives
  Icons        : Lucide React
  Brand Navy   : #003366 (hsl 210 100% 20%)
  Brand Red    : #D52B1E (hsl 4 76% 49%)
  Success      : #2B8B4F
  Warning      : #E8A800
  Heading font : Fraunces (serif) — already installed
  Body font    : DM Sans — already installed
  Mono font    : DM Mono — already installed
  Border radius: 0.625rem (10px)
  CSS vars     : --primary --secondary --accent --destructive --muted
""".strip())

    # Quick tips
    sections.append(f"""
{separator}
  IMPLEMENTATION TIPS
{separator}
  1. Use cn() from @/lib/utils for conditional className merging
  2. Prefer shadcn components over custom: Dialog Sheet Table Tabs
  3. Use toast from 'sonner' not @/components/ui/toast for notifications
  4. Semantic colors via CSS vars: className='bg-primary text-primary-foreground'
  5. Form validation: shadcn Form + react-hook-form + zod schema
  6. Loading states: <Skeleton> component for content-shaped placeholders
  7. Empty states: always include icon + message + action button
  8. Run --domain ux 'accessibility contrast loading' before delivering UI
{separator}
""".strip())

    if fmt == "markdown":
        # Convert to markdown
        output = f"# UI/UX Design System — {project or 'Project'}\n\n"
        output += f"> Query: `{query}`\n\n"
        output += "\n\n".join(sections[1:])  # skip ascii header
        return output

    return "\n\n".join(sections)


# ── Persist to design-system/ ─────────────────────────────────────────────────
def persist_design_system(content: str, project: str, page: str = None):
    ds_dir = PROJECT_ROOT / "design-system"
    ds_dir.mkdir(exist_ok=True)

    master = ds_dir / "MASTER.md"
    master.write_text(f"# Design System Master — {project or 'Project'}\n\n{content}\n", encoding="utf-8")
    print(f"\n✓ Saved to design-system/MASTER.md")

    if page:
        pages_dir = ds_dir / "pages"
        pages_dir.mkdir(exist_ok=True)
        page_file = pages_dir / f"{page.lower().replace(' ', '-')}.md"
        page_file.write_text(
            f"# Page Override: {page}\n\n> Inherits from MASTER.md — add page-specific deviations below.\n\n",
            encoding="utf-8"
        )
        print(f"✓ Created page override at design-system/pages/{page_file.name}")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="UI/UX Pro Max Search")
    parser.add_argument("query", nargs="?", default="", help="Search query")
    parser.add_argument("--domain", "-d", help="Search domain (color|typography|style|product|ux|chart|landing|prompt|react|tailwind|shadcn|web|reasoning)")
    parser.add_argument("--design-system", action="store_true", help="Generate full design system")
    parser.add_argument("--stack", help="Filter by stack (react|tailwind|shadcn|web)")
    parser.add_argument("--persist", action="store_true", help="Save to design-system/MASTER.md")
    parser.add_argument("--page", help="Page name for override file")
    parser.add_argument("-p", "--project", default="", help="Project name")
    parser.add_argument("-f", "--format", default="ascii", choices=["ascii", "markdown"], help="Output format")
    parser.add_argument("-n", "--max-results", type=int, default=5, help="Max results per domain")

    args = parser.parse_args()

    if not args.query and not args.design_system:
        parser.print_help()
        sys.exit(0)

    # ── Design system mode ────────────────────────────────────────────────────
    if args.design_system:
        output = generate_design_system(
            args.query or "saas compliance b2b",
            args.project,
            args.format,
            args.max_results,
        )
        print(output)
        if args.persist:
            persist_design_system(output, args.project, args.page)
        return

    # ── Stack mode ────────────────────────────────────────────────────────────
    if args.stack:
        rows = search(args.query, "stacks", n=args.max_results, stack_filter=args.stack)
        if not rows:
            print(f"No results for '{args.query}' in stack '{args.stack}'")
            return
        renderer = DOMAIN_RENDERERS.get("stacks", render_stack)
        print(f"\n── Stack: {args.stack.upper()} ── Query: '{args.query}' ── {len(rows)} results ──\n")
        print(renderer(rows, args.format))
        return

    # ── Domain search mode ────────────────────────────────────────────────────
    if args.domain:
        domain = args.domain.lower()
        rows = search(args.query, domain, n=args.max_results)
        if not rows:
            print(f"No results for '{args.query}' in domain '{domain}'")
            return
        renderer = DOMAIN_RENDERERS.get(domain, render_ux)
        print(f"\n── Domain: {domain.upper()} ── Query: '{args.query}' ── {len(rows)} results ──\n")
        print(renderer(rows, args.format))
        return

    # ── General search (all domains) ─────────────────────────────────────────
    print(f"\n── General Search: '{args.query}' ──\n")
    for domain_key in ["product", "style", "color", "typography", "ux"]:
        rows = search(args.query, domain_key, n=3)
        if rows:
            renderer = DOMAIN_RENDERERS[domain_key]
            print(f"\n{'─'*60}")
            print(f"  {domain_key.upper()}")
            print(f"{'─'*60}")
            print(renderer(rows[:3], args.format))


if __name__ == "__main__":
    main()
