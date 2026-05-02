import sys

file_path = r'e:\Application\laragon\www\IoT Listrik Dashboard\public\css\style.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target1 = """.clean-features-wrap {
  width: 100%;
  max-width: var(--public-max-width);
  padding: 56px 0 68px;
  overflow-x: hidden;
}"""

replacement1 = """.clean-features-wrap {
  width: 100%;
  max-width: var(--public-max-width);
  padding: 56px 0 68px;
}"""

target2 = """.logic-explainer-section {
  width: 100%;
  max-width: var(--public-max-width);
  padding: 56px 0 68px;
  overflow-x: hidden;
}"""

replacement2 = """.logic-explainer-section {
  width: 100%;
  max-width: var(--public-max-width);
  padding: 56px 0 68px;
}"""

if target1 in content:
    content = content.replace(target1, replacement1)
    print("Fixed target 1")
else:
    print("Target 1 not found")

if target2 in content:
    content = content.replace(target2, replacement2)
    print("Fixed target 2")
else:
    print("Target 2 not found")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
