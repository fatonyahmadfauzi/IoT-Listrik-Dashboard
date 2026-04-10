const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public');
const filesToProcess = ['dashboard.html', 'history.html', 'settings.html', 'login.html'];
const jsFilesToProcess = ['app.js', 'history.js', 'settings.js', 'notifications.js'];

const map = {
    '⚡': '<iconify-icon icon="lucide:zap"></iconify-icon>',
    '📊': '<iconify-icon icon="lucide:layout-dashboard"></iconify-icon>',
    '📋': '<iconify-icon icon="lucide:clipboard-list"></iconify-icon>',
    '⚙️': '<iconify-icon icon="lucide:settings"></iconify-icon>',
    '🚪': '<iconify-icon icon="lucide:log-out"></iconify-icon>',
    '📲': '<iconify-icon icon="lucide:download"></iconify-icon>',
    '🔌': '<iconify-icon icon="lucide:plug"></iconify-icon>',
    '💡': '<iconify-icon icon="lucide:lightbulb"></iconify-icon>',
    '🛡️': '<iconify-icon icon="lucide:shield-check"></iconify-icon>',
    '🔁': '<iconify-icon icon="lucide:toggle-right"></iconify-icon>',
    '🟢': '<iconify-icon icon="lucide:power"></iconify-icon>',
    '🔴': '<iconify-icon icon="lucide:power-off"></iconify-icon>',
    '⚠️': '<iconify-icon icon="lucide:triangle-alert"></iconify-icon>',
    '📈': '<iconify-icon icon="lucide:line-chart"></iconify-icon>',
    '🔍': '<iconify-icon icon="lucide:zoom-in"></iconify-icon>',
    '📥': '<iconify-icon icon="lucide:download"></iconify-icon>',
    '🎛️': '<iconify-icon icon="lucide:sliders"></iconify-icon>',
    '🔔': '<iconify-icon icon="lucide:bell"></iconify-icon>',
    '🔬': '<iconify-icon icon="lucide:scale"></iconify-icon>',
    '📱': '<iconify-icon icon="lucide:smartphone"></iconify-icon>',
    '✅': '<iconify-icon icon="lucide:check-circle-2"></iconify-icon>',
    '👥': '<iconify-icon icon="lucide:users"></iconify-icon>',
    '🔄': '<iconify-icon icon="lucide:refresh-cw"></iconify-icon>',
    '➕': '<iconify-icon icon="lucide:plus"></iconify-icon>',
    '💾': '<iconify-icon icon="lucide:save"></iconify-icon>',
    '👁': '<iconify-icon icon="lucide:eye"></iconify-icon>',
    '🙈': '<iconify-icon icon="lucide:eye-off"></iconify-icon>',
    '✕': '<iconify-icon icon="lucide:x"></iconify-icon>',
    'ℹ️': '<iconify-icon icon="lucide:info"></iconify-icon>',
    '🔑': '<iconify-icon icon="lucide:key"></iconify-icon>'
};

const iconifyScript = '<script src="https://code.iconify.design/iconify-icon/1.0.8/iconify-icon.min.js"></script>\n</head>';

for (let file of filesToProcess) {
    let fp = path.join(dir, file);
    if (!fs.existsSync(fp)) continue;
    let text = fs.readFileSync(fp, 'utf8');
    
    // Replace emojis
    for (const [emoji, iconTag] of Object.entries(map)) {
        text = text.split(emoji).join(iconTag);
    }
    
    // Add script tag if not there
    if (!text.includes('iconify-icon.min.js')) {
        text = text.replace('</head>', iconifyScript);
    }
    
    fs.writeFileSync(fp, text, 'utf8');
    console.log(`Updated ${file}`);
}

for (let file of jsFilesToProcess) {
    let fp = path.join(dir, file);
    if (!fs.existsSync(fp)) continue;
    let text = fs.readFileSync(fp, 'utf8');
    
    for (const [emoji, iconTag] of Object.entries(map)) {
        text = text.split(emoji).join(iconTag);
    }
    
    fs.writeFileSync(fp, text, 'utf8');
    console.log(`Updated ${file}`);
}
