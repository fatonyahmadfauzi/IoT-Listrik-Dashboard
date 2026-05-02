import sys

file_path = r'e:\Application\laragon\www\IoT Listrik Dashboard\public\css\style.css'
with open(file_path, 'a', encoding='utf-8') as f:
    f.write("""\n/* =============================================================
   Lenis Smooth Scroll Global Styles
============================================================= */
html.lenis, html.lenis body {
  height: auto;
}
.lenis.lenis-smooth {
  scroll-behavior: auto !important;
}
.lenis.lenis-smooth [data-lenis-prevent] {
  overscroll-behavior: contain;
}
.lenis.lenis-stopped {
  overflow: hidden;
}
.lenis.lenis-scrolling iframe {
  pointer-events: none;
}\n""")
print("Appended lenis styles")
