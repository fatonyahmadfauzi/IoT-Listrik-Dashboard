import sys

file_path = r'e:\Application\laragon\www\IoT Listrik Dashboard\public\index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    # Move the architecture tree up slightly as the user scrolls
    ('class="arch-tree-container"', 'class="arch-tree-container" data-parallax-y="-60"'),
    
    # Parallax the feature icons
    ('class="feat-icon glass"', 'class="feat-icon glass" data-parallax-y="-30"'),
    
    # Parallax the background graphic in the hero
    ('class="demo-clean-graphic"', 'class="demo-clean-graphic" data-parallax-y="-80"'),
    
    # Move the explainer graphic
    ('class="logic-explainer-graphic"', 'class="logic-explainer-graphic" data-parallax-y="-50"'),
    
    # Float the stats card
    ('class="logic-stats-card glass"', 'class="logic-stats-card glass" data-parallax-y="-40"')
]

for target, replacement in replacements:
    if target in content and replacement not in content:
        content = content.replace(target, replacement)
        print(f"Replaced: {target}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
