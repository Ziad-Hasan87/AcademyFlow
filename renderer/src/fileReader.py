import os
import pyperclip

def copy_jsx_to_text(output_file="jsx_contents.txt"):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    components_dir = os.path.join(script_dir, "components")

    files_to_collect = []
    collected_text = []

    # Collect from root directory
    for f in os.listdir(script_dir):
        path = os.path.join(script_dir, f)
        if os.path.isfile(path) and (f.endswith(".jsx") or f.endswith(".css")):
            files_to_collect.append(path)

    # Collect from components directory (recursively)
    if os.path.isdir(components_dir):
        for root, _, files in os.walk(components_dir):
            for f in files:
                if f.endswith(".jsx") or f.endswith(".css"):
                    files_to_collect.append(os.path.join(root, f))

    for file_path in files_to_collect:
        relative_path = os.path.relpath(file_path, script_dir)
        collected_text.append(f"{relative_path}:\n")
        collected_text.append("///\n")

        with open(file_path, "r", encoding="utf-8") as file:
            collected_text.append(file.read())

        collected_text.append("\n///\n\n")

    final_text = "".join(collected_text)

    # Write to file
    with open(os.path.join(script_dir, output_file), "w", encoding="utf-8") as out:
        out.write(final_text)

    # Copy to clipboard
    pyperclip.copy(final_text)

    print(f"Copied {len(files_to_collect)} JSX/CSS files into {output_file}")
    print("Contents also copied to clipboard")

if __name__ == "__main__":
    copy_jsx_to_text()
