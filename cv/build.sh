#!/usr/bin/env bash
# Compile a CV with pdflatex, copy the PDF next to its source, and check the
# countable rules of the CV system in CLAUDE.md. Judgment rules (verb synonym
# families, copied JD phrasing, bold word counts) are still reviewed by hand.
#
#   cv/build.sh cv/variants/2026-09-acme-senior-backend.tex
#
# Exit: 0 clean or warnings only · 1 build failed · 2 hard rule broken
set -euo pipefail

MAX_PAGES=2

[[ $# -eq 1 && -f "${1:-}" ]] || { echo "Usage: cv/build.sh <file.tex>" >&2; exit 1; }
src="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
name="$(basename "$src" .tex)"
cv_dir="$(cd "$(dirname "$0")" && pwd)"
root="$(dirname "$cv_dir")"
build="$cv_dir/build"
failed=0

fail() { echo "FAIL: $1" >&2; failed=1; }
warn() { echo "WARN: $1" >&2; }
indent() { sed 's/^/  /' >&2; }

# Source checks run on the .tex with comments blanked, so line numbers still match.
code="$(sed -E 's/(^|[^\\])%.*$/\1/' "$src")"
if hits="$(printf '%s\n' "$code" | grep -n -- '--')"; then
  fail "'--' (use \\textendash{} for ranges):"
  printf '%s\n' "$hits" | indent
fi
if hits="$(printf '%s\n' "$code" | grep -n ' - ')"; then
  warn "spaced hyphen (use \\textendash{} or reword):"
  printf '%s\n' "$hits" | indent
fi
if hits="$(printf '%s\n' "$code" | grep -n 'TODO')"; then
  warn "placeholders that will render:"
  printf '%s\n' "$hits" | indent
fi

# Experience bullets: one \item per line inside rbullets.
bullets="$(printf '%s\n' "$code" | awk '
    index($0, "\\begin{rbullets}") { on = 1; next }
    index($0, "\\end{rbullets}")   { on = 0 }
    on && /^[ \t]*\\item/' \
  | sed -E 's/^[[:space:]]*\\item[[:space:]]*//; s/[[:space:]]+$//' || true)"
if [[ -n "$bullets" ]]; then
  total="$(printf '%s\n' "$bullets" | wc -l | tr -d ' ')"
  bolded="$(printf '%s\n' "$bullets" | grep -c 'textbf' || true)"
  echo "Bullets: $total (target 14 to 20), $bolded with bold ($((bolded * 100 / total))%, target 30 to 40%)"
  if hits="$(printf '%s\n' "$bullets" | grep -vE '[0-9]')"; then
    warn "bullets without a number (optional deviation; each must be concrete and cite its evidence):"
    printf '%s\n' "$hits" | indent
  fi
  if hits="$(printf '%s\n' "$bullets" | grep -E '^(\\textbf\{)?([0-9]|€|\\texteuro|\\\$)')"; then
    warn "bullets starting with a number:"
    printf '%s\n' "$hits" | indent
  fi
  if hits="$(printf '%s\n' "$bullets" | awk '{print tolower($1)}' | sort | uniq -c \
    | awk '$1 > 2 {print $2 " (" $1 " times)"}' | grep .)"; then
    warn "opening verbs used more than twice (synonym families still need a manual check):"
    printf '%s\n' "$hits" | indent
  fi
fi

# Compile
if ! command -v pdflatex >/dev/null; then
  echo "pdflatex not found. Install BasicTeX or MacTeX, or compile the .tex in Overleaf with the pdfLaTeX compiler." >&2
  exit 1
fi

mkdir -p "$build"
cd "$cv_dir"
log="$build/$name.log"
for _ in 1 2; do # second pass settles hyperref's bookmarks
  if ! pdflatex -interaction=nonstopmode -halt-on-error -output-directory="$build" "$src" >/dev/null; then
    echo "Build failed:" >&2
    grep -A3 '^!' "$log" >&2 || tail -20 "$log" >&2
    exit 1
  fi
done

if hits="$(grep -E 'Warning|Overfull|Underfull' "$log")"; then
  warn "LaTeX warnings (the CV system requires none):"
  printf '%s\n' "$hits" | indent
fi

pdf="$(dirname "$src")/$name.pdf"
cp "$build/$name.pdf" "$pdf"

if command -v pdfinfo >/dev/null; then
  pages="$(pdfinfo "$pdf" | awk '/^Pages:/ {print $2}')"
else
  # TeX hard-wraps log lines at 79 characters; join them before matching.
  pages="$(tr -d '\n' <"$log" | grep -oE 'Output written on [^(]*\([0-9]+ pages?' \
    | grep -oE '[0-9]+ page' | grep -oE '[0-9]+' | tail -1 || true)"
fi

echo "${pdf#"$root"/}: ${pages:-?} page(s)"
if [[ -z "$pages" ]]; then
  warn "couldn't read the page count; open the PDF and check."
elif (( pages > MAX_PAGES )); then
  fail "$pages pages; the maximum is $MAX_PAGES. Cut content, never formatting."
fi

# Text extraction: pypdf merges words wherever the PDF lacks real spaces, as weaker
# ATS parsers do. Any extracted word that isn't in the source is merged or broken.
if python3 -c 'import pypdf' 2>/dev/null; then
  if ! hits="$(python3 - "$pdf" "$src" <<'PY'
import logging, re, sys
from pypdf import PdfReader
logging.disable(logging.WARNING)
pdf, tex = sys.argv[1:3]
src = re.sub(r"(?<!\\)%.*", "", open(tex, encoding="utf-8").read())
src = re.sub(r"\\(?:Name)?Cap\{(.*?)\}", r"\1", src)  # \Cap{P}rofessional -> Professional
src = re.sub(r"\\[A-Za-z]+", " ", src)
known = set(re.findall(r"[a-z0-9]+", src.lower()))
text = "\n".join(page.extract_text() or "" for page in PdfReader(pdf).pages)
print("\n".join(sorted({w for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in known})))
PY
  )"; then
    warn "text extraction check failed to run (error above)."
  elif [[ -n "$hits" ]]; then
    warn "extracted text has words not in the source (merged words or unmapped glyphs; check \\pdfinterwordspaceon):"
    printf '%s\n' "$hits" | indent
  fi
else
  warn "text extraction check skipped; install it with: python3 -m pip install --user pypdf"
fi

exit $((failed * 2))
