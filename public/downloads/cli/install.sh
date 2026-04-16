#!/bin/bash
echo -e "\033[1;36m========================================================\033[0m"
echo -e "\033[1;32m      Menginstall IoT Listrik Dashboard CLI (Termux/Linux)  \033[0m"
echo -e "\033[1;36m========================================================\033[0m"

if ! command -v node &> /dev/null
then
    echo -e "\033[1;31mNode.js belum terinstall! Silakan install dulu.\033[0m"
    echo -e "   \033[1;36mTermux\033[0m : \033[1;33mpkg install nodejs\033[0m"
    echo -e "   \033[1;36mLinux\033[0m  : \033[1;33msudo apt install nodejs\033[0m"
    exit 1
fi

INSTALL_DIR="$HOME/.iot-listrik-cli"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

echo -n "[1/3] Mengunduh modul utama dari server Pusat..."
curl -sL "https://iot-listrik-dashboard.vercel.app/downloads/cli/node-source/index.js" -o index.js
curl -sL "https://iot-listrik-dashboard.vercel.app/downloads/cli/node-source/package.json" -o package.json
echo " [Selesai]"

echo -n "[2/3] Mamasang pustaka dependensi (NPM)... "
npm install --silent > /dev/null 2>&1
echo " [Selesai]"

echo -n "[3/3] Memasang Alias Terminal Tingkat Lanjut... "
BIN_DIR=""
if [ -d "$PREFIX/bin" ]; then
    # Termux Android Environment
    BIN_DIR="$PREFIX/bin"
elif [ -d "/usr/local/bin" ]; then
    # Linux / MacOS system-wide
    BIN_DIR="/usr/local/bin"
    # Fallback to local if permission denied later
elif [ -d "$HOME/.local/bin" ]; then
    BIN_DIR="$HOME/.local/bin"
else
    BIN_DIR="$HOME/bin"
    mkdir -p "$BIN_DIR"
fi

cat << 'EOF' > "$INSTALL_DIR/runner.sh"
#!/bin/bash
node "$HOME/.iot-listrik-cli/index.js" "$@"
EOF
chmod +x "$INSTALL_DIR/runner.sh"

# Try to link or copy to global bin
cp "$INSTALL_DIR/runner.sh" "$BIN_DIR/iot-listrik" 2>/dev/null || sudo cp "$INSTALL_DIR/runner.sh" "$BIN_DIR/iot-listrik" 2>/dev/null || {
    echo -e "\n\033[1;33m[PERINGATAN] Gagal menautkan ke global bin. Jalankan menggunakan: node ~/.iot-listrik-cli/index.js\033[0m"
}
chmod +x "$BIN_DIR/iot-listrik" 2>/dev/null || sudo chmod +x "$BIN_DIR/iot-listrik" 2>/dev/null

echo " [Selesai]"
echo ""
echo -e "\033[1;32mPemasangan Selesai Tanpa Cacat! 🎉\033[0m"
echo -e "Sekarang, buka terminal di mana saja dan cukup ketikkan mantranya:"
echo -e "\n   \033[1;36miot-listrik\033[0m\n"
