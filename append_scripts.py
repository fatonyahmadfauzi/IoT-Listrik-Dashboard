import sys

file_path = r'e:\Application\laragon\www\IoT Listrik Dashboard\public\index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

scripts_to_add = """
    <!-- GSAP & Lenis for Cinematic Parallax -->
    <script src="https://unpkg.com/lenis@1.1.20/dist/lenis.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
    <script src="/js/cinematic-parallax.js" defer></script>
"""

# Replace </body> with the scripts + </body>
if "</body>" in content and "cinematic-parallax.js" not in content:
    content = content.replace("</body>", scripts_to_add + "</body>")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added scripts to index.html")
else:
    print("Scripts already exist or </body> not found")
