import re
import os

input_file = "App.css"
output_file = "App_single_line.css"

if not os.path.exists(input_file):
    print(f"{input_file} not found in current directory.")
    exit(1)

with open(input_file, "r", encoding="utf-8") as f:
    css = f.read()

# Remove comments
css = re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)

# Remove unnecessary whitespace and line breaks
css = re.sub(r"\s*\{\s*", "{", css)       # space before/after {
css = re.sub(r"\s*\}\s*", "}", css)       # space before/after }
css = re.sub(r"\s*;\s*", ";", css)        # space before/after ;
css = re.sub(r"\s*:\s*", ":", css)        # space before/after :
css = re.sub(r"\s*,\s*", ",", css)        # space before/after ,
css = re.sub(r"\n+", "\n", css)           # remove multiple newlines
css = re.sub(r"\s+\n", "\n", css)         # remove spaces before newline
css = re.sub(r"\n\s+", "\n", css)         # remove spaces after newline
css = css.strip()

# Split by } to put each selector on a new line
rules = [rule.strip() + "}" for rule in css.split("}") if rule.strip()]

with open(output_file, "w", encoding="utf-8") as f:
    for rule in rules:
        f.write(rule + "\n")

print(f"Single-line CSS written to {output_file}")
