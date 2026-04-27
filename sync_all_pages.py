import sys
import os

pages = ['dashboard.html', 'history.html', 'telegram.html', 'discord.html', 'users.html']

replacements = [
    ('href="/app/dashboard"', 'href="/dashboard"'),
    ('href="/app/history"', 'href="/history"'),
    ('href="/app/settings"', 'href="/settings"'),
    ('href="/app/telegram"', 'href="/telegram"'),
    ('href="/app/discord"', 'href="/discord"'),
    ('href="/app/users"', 'href="/users"'),
]

sidebar_search = '''          <a href="/history" class="nav-item">
            <span class="material-symbols-rounded nav-icon">history</span>
            Riwayat Log
          </a>
          <div class="nav-divider"></div>'''

sidebar_replace = '''          <a href="/history" class="nav-item">
            <span class="material-symbols-rounded nav-icon">history</span>
            Riwayat Log
          </a>
          <a href="/downloads" class="nav-item">
            <span class="material-symbols-rounded nav-icon">download</span>
            Download App
          </a>
          <div class="nav-divider"></div>'''

dashboard_sidebar_search = '''          <a href="/history" class="nav-item">
            <span class="material-symbols-rounded nav-icon">history</span>
            Riwayat Log
          </a>
          <div class="nav-divider"></div>'''

# Sometimes dashboard or history might have active class on history, so we need a regex or more generic approach.
import re

# Generic regex to inject the Download App link right before the nav-divider, 
# because different pages have active classes on different nav items.
# Let's search for <div class="nav-divider"></div> and prepend the download link.
generic_sidebar_search = r'(\s*)<div class="nav-divider"></div>'
generic_sidebar_replace = r'''\1<a href="/downloads" class="nav-item">
\1  <span class="material-symbols-rounded nav-icon">download</span>
\1  Download App
\1</a>
\1<div class="nav-divider"></div>'''

for page in pages:
    app_path = f'e:/Application/laragon/www/IoT Listrik Dashboard/public/app/{page}'
    root_path = f'e:/Application/laragon/www/IoT Listrik Dashboard/public/{page}'
    
    if not os.path.exists(app_path):
        print(f'Skipping {page}, source not found.')
        continue
        
    with open(app_path, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Replace nav links
    for old, new in replacements:
        html = html.replace(old, new)
        
    # 2. Inject Download App
    # Ensure we don't inject multiple times if it's already there
    if 'href="/downloads"' not in html:
        html = re.sub(generic_sidebar_search, generic_sidebar_replace, html, count=1)
        
    with open(root_path, 'w', encoding='utf-8') as f:
        f.write(html)
        
    print(f'Successfully synced {page}')
