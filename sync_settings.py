import sys

app_settings = 'e:/Application/laragon/www/IoT Listrik Dashboard/public/app/settings.html'
root_settings = 'e:/Application/laragon/www/IoT Listrik Dashboard/public/settings.html'

with open(app_settings, 'r', encoding='utf-8') as f:
    html = f.read()

replacements = [
    ('href="/app/dashboard"', 'href="/dashboard"'),
    ('href="/app/history"', 'href="/history"'),
    ('href="/app/settings"', 'href="/settings"'),
    ('href="/app/telegram"', 'href="/telegram"'),
    ('href="/app/discord"', 'href="/discord"'),
    ('href="/app/users"', 'href="/users"'),
]

for old, new in replacements:
    html = html.replace(old, new)

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

if sidebar_search in html:
    html = html.replace(sidebar_search, sidebar_replace)
else:
    print('Could not find sidebar search string!')
    sys.exit(1)

with open(root_settings, 'w', encoding='utf-8') as f:
    f.write(html)

print('Successfully synced settings.html')
