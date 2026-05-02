import sys

file_path = r'e:\Application\laragon\www\IoT Listrik Dashboard\public\index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    ('class="clean-feature-item"', 'class="clean-feature-item" data-parallax-y="-30"'),
    ('class="logic-explainer-card glass"', 'class="logic-explainer-card glass" data-parallax-y="-20"')
]

for target, replacement in replacements:
    if target in content and replacement not in content:
        content = content.replace(target, replacement)
        print(f"Replaced: {target}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
