import re
import os
from pathlib import Path

SRC_DIR = Path(r"c:\VS CODE\CrimeMInd\frontend\src")

HTML_TAGS = {
    "div", "span", "p", "a", "button", "input", "select", "option", "textarea",
    "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "table", "thead",
    "tbody", "tr", "th", "td", "form", "label", "img", "svg", "path", "circle",
    "rect", "line", "polyline", "polygon", "ellipse", "header", "footer", "main",
    "section", "article", "nav", "aside", "figure", "figcaption", "strong", "em",
    "b", "i", "small", "code", "pre", "blockquote", "hr", "br", "iframe", "canvas",
    "audio", "video", "source", "track"
}

def check_jsx_identifiers():
    errors = []
    for root, dirs, files in os.walk(SRC_DIR):
        for file in files:
            if file.endswith(".tsx"):
                file_path = Path(root) / file
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()

                # Extract all imported identifiers
                imported_symbols = set()
                # Matches single and multi-line imports: import { ... } from '...'
                for m in re.finditer(r"import\s+(?:(\w+)|\{([^}]+)\}|\*\s+as\s+(\w+))\s+from", content, re.DOTALL):
                    if m.group(1):
                        imported_symbols.add(m.group(1).strip())
                    if m.group(2):
                        for sym in m.group(2).split(","):
                            clean = sym.strip().split(" as ")[-1].strip()
                            if clean:
                                imported_symbols.add(clean)
                    if m.group(3):
                        imported_symbols.add(m.group(3).strip())

                # Also find locally declared components/variables: const X =, function X, class X
                declared_symbols = set(re.findall(r"(?:const|function|class|type|interface)\s+([A-Z]\w+)", content))

                # Also find React.Fragment, React.FC etc.
                known_symbols = imported_symbols | declared_symbols | {"React", "Fragment"}

                # Find all JSX opening tags: <([A-Z]\w+)
                jsx_tags = set(re.findall(r"<([A-Z]\w+)", content))

                for tag in jsx_tags:
                    if tag not in known_symbols:
                        errors.append(f"MISSING IMPORT/DECLARATION: <{tag}> in {file_path.relative_to(SRC_DIR)}")

    if errors:
        print("JSX ERRORS FOUND:")
        for err in errors:
            print(f"  - {err}")
    else:
        print("ALL JSX TAGS ARE PROPERLY IMPORTED OR DEFINED!")

if __name__ == "__main__":
    check_jsx_identifiers()
