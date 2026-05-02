import sys

file_path = r'e:\Application\laragon\www\IoT Listrik Dashboard\public\css\style.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """  #exportBtn .material-symbols-rounded {
    font-size: 15px;
    margin-top: 10px;
    font-size: 11.5px;
    color: #64748b;
    line-height: 1.55;
  }"""

replacement = """  #exportBtn .material-symbols-rounded {
    font-size: 15px;
  }

  /* ── H. section helper-text hierarchy ────────────────────── */
  /* "15 entri terakhir" style secondary labels in section headers */
  .section-header .text-xs.text-muted,
  .section-header > span.text-muted {
    font-size: 12px;
    color: #64748b;
    letter-spacing: 0.01em;
  }
  /* Chart hint text */
  .section-card > .text-xs.text-muted,
  .section-card > p.text-xs.text-muted {
    margin-top: 10px;
    font-size: 11.5px;
    color: #64748b;
    line-height: 1.55;
  }"""

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed target 1")
else:
    print("Target 1 not found")

target2 = """.landing-main {
  width: 100%;
  max-width: var(--public-max-width);
  padding: 20px var(--public-gutter) 0;
  overflow-x: hidden;
}"""

replacement2 = """.landing-main {
  width: 100%;
  max-width: var(--public-max-width);
  padding: 20px var(--public-gutter) 0;
}"""

if target2 in content:
    content = content.replace(target2, replacement2)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed target 2")
else:
    print("Target 2 not found")
