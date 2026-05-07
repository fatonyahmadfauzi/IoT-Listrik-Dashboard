#!/bin/bash
echo -e "\033[1;36m========================================================\033[0m"
echo -e "\033[1;32m      Menginstall IoT Listrik Dashboard CLI              \033[0m"
echo -e "\033[1;32m      (Termux / Linux / MacOS)                           \033[0m"
echo -e "\033[1;36m========================================================\033[0m"
echo ""

# ──────────────────────────────────────────────────────
# Fungsi: Deteksi & Install Node.js otomatis
# ──────────────────────────────────────────────────────
install_nodejs() {
    echo -e "\033[1;33m[!] Node.js belum terinstall. Mencoba menginstall otomatis...\033[0m"

    # Termux (Android)
    if [ -n "$PREFIX" ] && [ -d "$PREFIX/bin" ]; then
        echo -e "    \033[1;36m→ Terdeteksi: Termux (Android)\033[0m"
        pkg install nodejs -y
        return $?
    fi

    # macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "    \033[1;36m→ Terdeteksi: macOS\033[0m"
        if command -v brew &> /dev/null; then
            brew install node
        else
            echo -e "\033[1;31m[✗] Homebrew tidak ditemukan. Install Homebrew dulu:\033[0m"
            echo -e "    /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
        return $?
    fi

    # Linux – deteksi package manager
    if command -v apt-get &> /dev/null; then
        echo -e "    \033[1;36m→ Terdeteksi: Debian / Ubuntu / WSL\033[0m"
        # Install Node.js LTS via NodeSource agar versi tidak terlalu lama
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - 2>/dev/null || true
        sudo apt-get install -y nodejs 2>/dev/null || apt-get install -y nodejs
        return $?
    fi

    if command -v dnf &> /dev/null; then
        echo -e "    \033[1;36m→ Terdeteksi: Fedora / RHEL\033[0m"
        sudo dnf install -y nodejs || dnf install -y nodejs
        return $?
    fi

    if command -v yum &> /dev/null; then
        echo -e "    \033[1;36m→ Terdeteksi: CentOS / RHEL (yum)\033[0m"
        sudo yum install -y nodejs || yum install -y nodejs
        return $?
    fi

    if command -v pacman &> /dev/null; then
        echo -e "    \033[1;36m→ Terdeteksi: Arch Linux\033[0m"
        sudo pacman -Sy --noconfirm nodejs npm || pacman -Sy --noconfirm nodejs npm
        return $?
    fi

    if command -v apk &> /dev/null; then
        echo -e "    \033[1;36m→ Terdeteksi: Alpine Linux\033[0m"
        sudo apk add --no-cache nodejs npm || apk add --no-cache nodejs npm
        return $?
    fi

    # Tidak bisa deteksi
    echo -e "\033[1;31m[✗] Tidak dapat mendeteksi package manager.\033[0m"
    echo -e "    Install Node.js secara manual dari: https://nodejs.org"
    exit 1
}

# ──────────────────────────────────────────────────────
# Cek Node.js, install otomatis jika belum ada
# ──────────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
    install_nodejs
    # Cek ulang setelah instalasi
    if ! command -v node &> /dev/null; then
        echo -e "\033[1;31m[✗] Instalasi Node.js gagal. Coba install manual lalu jalankan script ini lagi.\033[0m"
        exit 1
    fi
    echo -e "\033[1;32m[✓] Node.js berhasil diinstall! ($(node -v))\033[0m"
else
    echo -e "\033[1;32m[✓] Node.js sudah terinstall ($(node -v))\033[0m"
fi

# Pengecekan Versi Node.js (Minimal v18)
NODE_VER=$(node -v | grep -oE '[0-9]+\.[0-9]+' | head -1 | cut -d. -f1)
if [ -z "$NODE_VER" ] || [ "$NODE_VER" -lt 18 ]; then
    echo -e "\033[1;31m[✗] Versi Node.js terlalu lama ($(node -v)). CLI ini membutuhkan Minimal Node v18.\033[0m"
    echo -e "    Jika Anda di Ubuntu/WSL, hapus versi lama dengan perintah:"
    echo -e "    \033[1;36msudo apt remove -y nodejs libnode72\033[0m"
    echo -e "    Lalu install versi terbaru (LTS) dengan perintah:"
    echo -e "    \033[1;36mcurl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt install -y nodejs\033[0m"
    echo -e "    Setelah itu, jalankan installer CLI ini lagi."
    exit 1
fi

# Cek npm
if ! command -v npm &> /dev/null; then
    echo -e "\033[1;31m[✗] npm tidak ditemukan. Pastikan npm ikut terinstall bersama Node.js.\033[0m"
    echo -e "    Di lingkungan Debian/Ubuntu, kadang Anda harus menjalankan 'sudo apt install -y npm'."
    exit 1
fi

echo ""

# ──────────────────────────────────────────────────────
# Instalasi CLI
# ──────────────────────────────────────────────────────
INSTALL_DIR="$HOME/.iot-listrik-cli"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

echo -n "[1/3] Mengunduh modul utama dari server pusat..."
curl -sL "https://iot-listrik-dashboard.vercel.app/downloads/cli/node-source/index.js" -o index.js
curl -sL "https://iot-listrik-dashboard.vercel.app/downloads/cli/node-source/package.json" -o package.json
echo -e " \033[1;32m[Selesai]\033[0m"

echo -n "[2/3] Memasang pustaka dependensi (npm)..."
npm install --silent > /dev/null 2>&1
echo -e " \033[1;32m[Selesai]\033[0m"

echo -n "[3/3] Memasang alias terminal..."

# Tentukan direktori bin yang sesuai
BIN_DIR=""
if [ -n "$PREFIX" ] && [ -d "$PREFIX/bin" ]; then
    # Termux Android
    BIN_DIR="$PREFIX/bin"
elif [ -d "$HOME/.local/bin" ]; then
    BIN_DIR="$HOME/.local/bin"
elif [ -d "/usr/local/bin" ]; then
    BIN_DIR="/usr/local/bin"
else
    BIN_DIR="$HOME/bin"
    mkdir -p "$BIN_DIR"
fi

cat << 'EOF' > "$INSTALL_DIR/runner.sh"
#!/bin/bash
node "$HOME/.iot-listrik-cli/index.js" "$@"
EOF
chmod +x "$INSTALL_DIR/runner.sh"

# Coba copy tanpa sudo dulu, lalu dengan sudo jika gagal
if cp "$INSTALL_DIR/runner.sh" "$BIN_DIR/iot-listrik" 2>/dev/null; then
    chmod +x "$BIN_DIR/iot-listrik" 2>/dev/null
elif sudo cp "$INSTALL_DIR/runner.sh" "$BIN_DIR/iot-listrik" 2>/dev/null; then
    sudo chmod +x "$BIN_DIR/iot-listrik" 2>/dev/null
else
    # Fallback ke ~/.local/bin atau ~/bin
    FALLBACK_DIR="$HOME/.local/bin"
    mkdir -p "$FALLBACK_DIR"
    cp "$INSTALL_DIR/runner.sh" "$FALLBACK_DIR/iot-listrik"
    chmod +x "$FALLBACK_DIR/iot-listrik"
    BIN_DIR="$FALLBACK_DIR"
fi

# Tambahkan PATH ke shell config jika bin dir belum ada di PATH
add_to_path() {
    local dir="$1"
    local profile_file=""
    if [[ "$SHELL" == *"zsh"* ]]; then
        profile_file="$HOME/.zshrc"
    else
        profile_file="$HOME/.bashrc"
    fi
    if ! echo "$PATH" | grep -q "$dir"; then
        echo "" >> "$profile_file"
        echo "# IoT Listrik CLI" >> "$profile_file"
        echo "export PATH=\"$dir:\$PATH\"" >> "$profile_file"
        echo -e "\n\033[1;33m[!] Direktori $dir ditambahkan ke PATH di $profile_file\033[0m"
        echo -e "    Jalankan: \033[1;36msource $profile_file\033[0m  agar alias aktif sekarang."
        SOURCE_NEEDED=true
    fi
}

SOURCE_NEEDED=false
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    add_to_path "$BIN_DIR"
fi

echo -e " \033[1;32m[Selesai]\033[0m"
echo ""
echo -e "\033[1;32m╔════════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;32m║   Pemasangan Selesai Tanpa Cacat! 🎉           ║\033[0m"
echo -e "\033[1;32m╚════════════════════════════════════════════════╝\033[0m"
echo ""
if [ "$SOURCE_NEEDED" = true ]; then
    echo -e "Reload shell terlebih dahulu agar perintah aktif:"
    echo -e "   \033[1;36msource ~/.bashrc\033[0m  atau  \033[1;36msource ~/.zshrc\033[0m"
    echo ""
fi
echo -e "Setelah itu, buka terminal di mana saja dan ketikkan:"
echo -e "\n   \033[1;36miot-listrik\033[0m\n"
