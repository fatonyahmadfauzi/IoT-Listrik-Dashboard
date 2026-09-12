import os
import sys
import json
import time
import base64
from threading import Timer
import threading

try:
    import msvcrt
except ImportError:
    msvcrt = None

import questionary
from rich.console import Console
import pyrebase

console = Console()
SESSION_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".session.json")

custom_style = questionary.Style([
    ('qmark', 'fg:#00ffff bold'),
    ('question', 'bold'),
    ('pointer', 'fg:#00ffff bold'),
    ('highlighted', 'fg:#00ffff bold'),
    ('answer', 'fg:#00ffff bold'),
    ('instruction', 'fg:#888888')
])

# Config Identik dengan versi JS
firebaseConfig = {
    "apiKey": "AIzaSyBLr8oo64-ARn2TUuR6yj68Zi3MUR3qsRU",
    "authDomain": "iot-listrik-dashboard.firebaseapp.com",
    "databaseURL": "https://iot-listrik-dashboard-default-rtdb.asia-southeast1.firebasedatabase.app",
    "projectId": "iot-listrik-dashboard",
    "storageBucket": "iot-listrik-dashboard.firebasestorage.app",
    "messagingSenderId": "690684049171",
    "appId": "1:690684049171:web:b8953844f7512e69488ce6",
}

firebase = pyrebase.initialize_app(firebaseConfig)
auth = firebase.auth()
db = firebase.database()

current_user = None
path_prefix = ""
session_timeout_timer = None
is_temp_session = False
temp_expires_at = None
current_role = "user"
DEVICE_STALE_MS = 15000
last_device_heartbeat_at = 0
last_updated_marker = None
last_sensor_signature = ""
watch_started_at = int(time.time() * 1000)
latest_listrik_snapshot = None
last_admin_reset_marker = None
header_ticker_stop = None
header_ticker_thread = None

def is_likely_epoch_ms(value):
    return isinstance(value, (int, float)) and value > 1_000_000_000_000

def build_sensor_signature(data):
    d = data or {}
    return "|".join([
        f"{float(d.get('arus', 0) or 0):.3f}",
        f"{float(d.get('tegangan', 0) or 0):.1f}",
        f"{float(d.get('daya', d.get('apparent_power', 0)) or 0):.1f}",
        f"{float(d.get('energi_kwh', 0) or 0):.4f}",
        f"{float(d.get('frekuensi', 0) or 0):.2f}",
        f"{float(d.get('power_factor', 0) or 0):.3f}",
        str(d.get('status', 'NORMAL'))
    ])

def register_device_heartbeat(data):
    global last_device_heartbeat_at, last_updated_marker, last_sensor_signature

    updated_at_raw = None if data is None else data.get("updated_at")
    try:
        updated_at = int(float(updated_at_raw)) if updated_at_raw is not None else None
    except Exception:
        updated_at = None

    sensor_signature = build_sensor_signature(data)
    heartbeat_detected = False

    if updated_at and updated_at > 0:
        if last_updated_marker is None:
            if is_likely_epoch_ms(updated_at) and (int(time.time() * 1000) - updated_at) <= DEVICE_STALE_MS:
                heartbeat_detected = True
        elif updated_at != last_updated_marker:
            heartbeat_detected = True
        last_updated_marker = updated_at
    elif last_sensor_signature and last_sensor_signature != sensor_signature:
        heartbeat_detected = True

    last_sensor_signature = sensor_signature

    if heartbeat_detected:
        last_device_heartbeat_at = int(time.time() * 1000)

def current_connection_label():
    now = int(time.time() * 1000)
    if not last_device_heartbeat_at:
        return "Device Offline" if (now - watch_started_at) > DEVICE_STALE_MS else "Memeriksa perangkat..."
    return "Device Offline" if (now - last_device_heartbeat_at) > DEVICE_STALE_MS else "Connected"

def relay_blocked_reason():
    label = current_connection_label()
    if label == "Device Offline":
        return "Perangkat offline. Relay fisik tidak menerima perintah."
    if label == "Memeriksa perangkat...":
        return "Sistem masih menunggu heartbeat perangkat."
    return "Perangkat belum siap menerima perintah."

def handle_admin_reset_notice(snapshot):
    global last_admin_reset_marker
    if not snapshot or not snapshot.get("reset_by_admin"):
        return

    reset_at = str(snapshot.get("reset_at") or "").strip()
    if not reset_at:
        return

    if last_admin_reset_marker is None:
        last_admin_reset_marker = reset_at
        return

    if last_admin_reset_marker == reset_at:
        return

    last_admin_reset_marker = reset_at
    note = str(snapshot.get("reset_note") or "Admin mengosongkan data realtime sensor perangkat IoT.")
    console.print(f"\n[bold cyan][INFO][/bold cyan] {note}")

def fetch_listrik_snapshot():
    global latest_listrik_snapshot
    snapshot = db.child(f"{path_prefix}listrik").get(current_user['token']).val()
    if snapshot:
        latest_listrik_snapshot = snapshot
        register_device_heartbeat(snapshot)
        handle_admin_reset_notice(snapshot)
    return snapshot

def probe_device_ready(wait_seconds=4.0):
    global watch_started_at
    watch_started_at = int(time.time() * 1000)
    fetch_listrik_snapshot()
    if current_connection_label() == "Connected":
        return True
    time.sleep(wait_seconds)
    fetch_listrik_snapshot()
    return current_connection_label() == "Connected"

def decode_jwt(token):
    try:
        parts = token.split('.')
        if len(parts) >= 2:
            payload = parts[1]
            padded = payload + '=' * (-len(payload) % 4)
            return json.loads(base64.urlsafe_b64decode(padded).decode('utf-8'))
    except Exception:
        pass
    return {}

def handle_session_expired():
    clear_screen()
    console.print("\n[bold red][!] PERINGATAN SISTEM [!][/bold red]")
    console.print("[yellow]Durasi sesi akun sementara (Demo) Anda telah habis (15 menit).[/yellow]")
    console.print("[dim]Anda akan di-logout secara otomatis.\n[/dim]")
    if os.path.exists(SESSION_FILE):
        try: os.remove(SESSION_FILE)
        except Exception: pass
    os._exit(0)

def process_user_claims(user_data):
    global path_prefix, session_timeout_timer, watch_started_at, last_device_heartbeat_at, last_updated_marker, last_sensor_signature, latest_listrik_snapshot, last_admin_reset_marker, current_role
    
    token = user_data.get('idToken', '')
    local_id = user_data.get('localId', '')
    claims = decode_jwt(token)
    
    is_temp = bool(claims.get('isTempAccount', False)) or str(user_data.get('email') or '').strip().lower().startswith('sim_')
    expires_at = claims.get('expiresAt')
    global is_temp_session, temp_expires_at
    is_temp_session = is_temp
    temp_expires_at = int(expires_at) if expires_at else None

    if is_temp and local_id:
        current_role = "demo"
        path_prefix = f"sim/{local_id}/"
        if expires_at:
            time_remaining = (expires_at - (time.time() * 1000)) / 1000.0
            if time_remaining <= 0:
                handle_session_expired()
            else:
                if session_timeout_timer: session_timeout_timer.cancel()
                session_timeout_timer = Timer(time_remaining, handle_session_expired)
                session_timeout_timer.daemon = True
                session_timeout_timer.start()
    else:
        path_prefix = ""
        try:
            role_value = db.child("users").child(local_id).child("role").get(token).val() if local_id else None
            current_role = "admin" if role_value == "admin" else "user"
        except Exception:
            current_role = "user"
            console.print("[yellow]Role akun tidak dapat diverifikasi; akses dibatasi sebagai User.[/yellow]")
        if session_timeout_timer:
            session_timeout_timer.cancel()
            session_timeout_timer = None

    watch_started_at = int(time.time() * 1000)
    last_device_heartbeat_at = 0
    last_updated_marker = None
    last_sensor_signature = ""
    latest_listrik_snapshot = None
    last_admin_reset_marker = None

def clear_screen():
    # Hapus viewport dan scrollback supaya hasil refresh tidak tampil ganda.
    if sys.stdout.isatty():
        sys.stdout.write('\033[2J\033[3J\033[H')
        sys.stdout.flush()
    else:
        os.system('cls' if os.name == 'nt' else 'clear')

def session_countdown_label():
    if not is_temp_session:
        return ""
    remaining = max(0, int((temp_expires_at - time.time() * 1000) / 1000)) if temp_expires_at else 0
    return f"DEMO {remaining // 60:02d}:{remaining % 60:02d} Â· SIM"


class DynamicSessionMessage:
    def __init__(self, message):
        self.message = message

    def __format__(self, _format_spec):
        label = session_countdown_label()
        return f"{self.message} [{label}]" if label else self.message

    def __str__(self):
        return self.__format__("")


def live_prompt_kwargs():
    # prompt_toolkit memanggil ulang token prompt setiap refresh sehingga
    # DynamicSessionMessage menampilkan hitung mundur terbaru tanpa merusak input.
    return {"refresh_interval": 1.0} if is_temp_session else {}


def _header_line_rich(live_countdown=False):
    if not current_user:
        return ""
    if is_temp_session:
        badge_text = session_countdown_label().replace(" · SIM", "") if live_countdown else "DEMO"
        badge = f"[black on yellow] {badge_text} [/black on yellow]"
    elif current_role == "admin":
        badge = "[black on yellow] ADMIN [/black on yellow]"
    else:
        badge = "[dim] USER [/dim]"
    return f"{badge} [bold green][+] Terhubung sebagai: {current_user['email']}[/bold green]"


def start_header_ticker():
    # Prompt aktif menangani refresh countdown melalui prompt_toolkit.
    pass


def stop_header_ticker():
    # Dipertahankan untuk kompatibilitas alur logout.
    pass


def print_header(live_countdown=False):
    clear_screen()
    console.print("\n[bold cyan]IoT Listrik Dashboard CLI[/bold cyan]")
    console.print("[dim]Pengembang: Fatony Ahmad Fauzi[/dim]\n")
    if current_user:
        console.print(_header_line_rich(live_countdown))
        console.print()


def hold_for_enter():
    questionary.text(
        DynamicSessionMessage("Tekan Enter untuk kembali ke Menu Utama..."),
        default="",
        style=custom_style,
        **live_prompt_kwargs(),
    ).ask()


def friendly_login_error(error):
    text = str(error or "").lower()
    if any(code in text for code in (
        "invalid_login_credentials", "invalid-credential", "wrong-password",
        "wrong_password", "email_not_found", "user-not-found"
    )):
        return "Email atau password salah. Periksa kembali akun Anda."
    if "invalid_email" in text or "invalid-email" in text:
        return "Format email tidak valid."
    if "too_many_attempts" in text or "too-many-requests" in text:
        return "Terlalu banyak percobaan login. Tunggu beberapa saat lalu coba lagi."
    if "user_disabled" in text or "user-disabled" in text:
        return "Akun ini telah dinonaktifkan."
    if any(code in text for code in (
        "connection", "network", "timeout", "timed out", "name resolution",
        "max retries", "connection refused"
    )):
        return "Tidak dapat terhubung ke Firebase. Periksa koneksi internet Anda."
    return "Login tidak berhasil. Periksa kredensial dan koneksi internet Anda."


def enforce_login():
    global current_user
    clear_screen()
    console.print("\n[bold cyan]IoT Listrik Dashboard CLI[/bold cyan]")
    console.print("[dim]Otentikasi Diperlukan[/dim]\n")

    if os.path.exists(SESSION_FILE):
        try:
            with open(SESSION_FILE, "r") as f:
                session = json.load(f)
            # Verifikasi auto-login via API
            user = auth.sign_in_with_email_and_password(session["email"], session["password"])
            process_user_claims(user)
            current_user = {"email": session["email"], "token": user['idToken']}
            console.print(f"[bold green]Meresume sesi login untuk: {session['email']}...\n[/bold green]")
            time.sleep(1)
            return
        except Exception as e:
            console.print("[bold red]Sesi login otomatis tidak valid. Silakan login manual.\n[/bold red]")
            os.remove(SESSION_FILE)

    while not current_user:
        try:
            email = questionary.text("Email:", style=custom_style).ask()
            if email is None: sys.exit(0)
            password = questionary.password("Password:", style=custom_style).ask()
            if password is None: sys.exit(0)

            user = auth.sign_in_with_email_and_password(email.strip(), password.strip())
            process_user_claims(user)
            console.print("\n[bold green]Login berhasil![/bold green]\n")
            
            with open(SESSION_FILE, "w") as f:
                json.dump({"email": email.strip(), "password": password.strip()}, f)
                
            current_user = {"email": email.strip(), "token": user['idToken']}
            time.sleep(1)
        except EOFError:
            sys.exit(0)
        except Exception as e:
            console.print(f"\n[bold red]Login gagal:[/bold red] {friendly_login_error(e)}\n")
            time.sleep(1)

def handle_logout():
    global current_user
    confirm = questionary.confirm(
        DynamicSessionMessage("Anda yakin ingin Keluar (Log out)?"),
        default=False,
        style=custom_style,
        **live_prompt_kwargs(),
    ).ask()
    if confirm:
        if os.path.exists(SESSION_FILE):
            os.remove(SESSION_FILE)
        stop_header_ticker()
        current_user = None
        console.print("\n[bold green]Berhasil Log out. Aplikasi akan ditutup.[/bold green]")
        sys.exit(0)

def view_logs():
    print_header()
    console.print("[cyan]Memuat 20 log riwayat terakhir...[/cyan]\n")
    try:
        from datetime import datetime
        from rich.table import Table
        from rich import box

        logs_data = db.child(f"{path_prefix}logs").order_by_key().limit_to_last(20).get(current_user['token'])

        if logs_data.val():
            logs = logs_data.val()
            entries = list(logs.items())
            entries.reverse()  # terbaru di atas

            table = Table(
                show_header=True,
                header_style="bold cyan",
                border_style="dim",
                show_lines=False,
                box=box.SIMPLE,
                show_edge=False,
                pad_edge=False,
                collapse_padding=False,
                padding=(0, 1),
                expand=False,
            )
            table.add_column("Waktu",        width=21, no_wrap=True, overflow="ellipsis")
            table.add_column("Beban (A / V / W)", width=22, no_wrap=True, overflow="ellipsis")
            table.add_column("Status",       width=13, no_wrap=True, overflow="ellipsis")
            table.add_column("Relay",        width=5,  no_wrap=True)
            table.add_column("Sumber Meter", width=14, no_wrap=True, overflow="ellipsis")
            table.add_column("Uptime",       width=10, no_wrap=True, overflow="ellipsis")

            for key, item in entries:
                # Timestamp
                raw_waktu = item.get("waktu") or item.get("timestamp")
                waktu_str = "-"
                if raw_waktu:
                    try:
                        ms = float(raw_waktu)
                        if ms > 1_000_000_000_000:
                            waktu_str = datetime.fromtimestamp(ms / 1000).strftime("%d/%m/%Y %H:%M:%S")
                        else:
                            waktu_str = str(raw_waktu)
                    except (ValueError, TypeError):
                        try:
                            waktu_str = datetime.fromisoformat(str(raw_waktu).replace('Z', '+00:00')).astimezone().strftime("%d/%m/%Y %H:%M:%S")
                        except Exception:
                            waktu_str = str(raw_waktu)

                # Nilai sensor
                arus   = float(item.get("arus",    0) or 0)
                teg    = float(item.get("tegangan", 0) or 0)
                pf     = float(item.get("power_factor", 0.85) or 0.85)
                appar  = float(item.get("apparent_power") or item.get("daya") or arus * teg)
                daya_w = float(item.get("daya_w") or appar * pf)
                load_str = f"{arus:.2f}A / {teg:.1f}V / {daya_w:.0f}W"

                # Status dengan warna
                status = str(item.get("status", "NORMAL")).upper()
                if status == "DANGER":
                    status_rich = f"[bold red]{status}[/bold red]"
                elif status == "WARNING":
                    status_rich = f"[yellow]{status}[/yellow]"
                elif status == "LEAKAGE":
                    status_rich = "[red]DANGER[/red]"  # status legacy
                else:
                    status_rich = f"[green]{status}[/green]"

                # Relay
                relay_raw = item.get("relay", False)
                relay_on  = relay_raw is True or str(relay_raw) == "1"
                relay_str = "[bold green]ON[/bold green]" if relay_on else "[bold red]OFF[/bold red]"

                # Sumber Meter
                meter_source = str(item.get("sensor_source") or item.get("sensorSource") or "PZEM-004T").strip() or "PZEM-004T"

                # Uptime
                raw_uptime = item.get("uptime_s") or item.get("uptimeSeconds") or item.get("uptime")
                try:
                    uptime_num = float(raw_uptime) if raw_uptime is not None else None
                    uptime_str = f"{int(uptime_num)} s" if uptime_num is not None and uptime_num >= 0 else "â€”"
                except (ValueError, TypeError):
                    uptime_str = "â€”"

                table.add_row(waktu_str, load_str, status_rich, relay_str, meter_source, uptime_str)

            console.print(table)
            console.print(f"\n[dim]{len(entries)} entri ditampilkan.[/dim]")
        else:
            console.print("[dim]Belum ada catatan aktivitas.[/dim]")
    except Exception as e:
        console.print(f"[bold red]Kesalahan saat mengambil data: {str(e)}[/bold red]")

    hold_for_enter()

def _number(value, fallback=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _firmware_version(value):
    text = str(value or "Belum dilaporkan").strip()
    if text == "Belum dilaporkan":
        return text
    return text if text.lower().startswith("v") else f"v{text}"


def _wifi_quality(value):
    rssi = _number(value, 999)
    if rssi > 0:
        return "Belum dilaporkan"
    quality = "Sangat baik" if rssi >= -60 else "Baik" if rssi >= -70 else "Lemah" if rssi >= -80 else "Sangat lemah"
    return f"{int(rssi)} dBm - {quality}"


def _diagnostic_timestamp(data):
    for key in ("updated_at", "timestamp", "waktu"):
        value = data.get(key) if data else None
        try:
            number = float(value)
            if number > 1_000_000_000_000:
                return int(number)
        except (TypeError, ValueError):
            pass
    return 0



def _diagnostic_row(label, value):
    console.print(f"[blue]{label:<18}[/blue] : {value}")

def _github_release():
    import urllib.request
    try:
        request = urllib.request.Request(
            "https://api.github.com/repos/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/latest",
            headers={"Accept": "application/vnd.github+json", "User-Agent": "iot-listrik-cli"},
        )
        with urllib.request.urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
        assets = [str(item.get("name")) for item in payload.get("assets", []) if item.get("name")]
        binary = next((name for name in assets if name.lower().endswith(".bin")), "")
        return {"tag": payload.get("tag_name") or "Belum diperiksa", "bin": binary, "assets": assets, "error": ""}
    except Exception as error:
        return {"tag": "Gagal diperiksa", "bin": "", "assets": [], "error": str(error)}


def view_diagnostics():
    if is_temp_session:
        console.print("\n[yellow]Diagnostik perangkat fisik tidak tersedia untuk akun Demo/Simulator.[/yellow]")
        hold_for_enter()
        return
    while True:
        print_header(live_countdown=True)
        data = {}
        firebase_connected = False
        try:
            data = fetch_listrik_snapshot() or latest_listrik_snapshot or {}
            firebase_connected = True
        except Exception as error:
            console.print(f"[bold red]Gagal membaca data diagnostik:[/bold red] {error}")
            data = latest_listrik_snapshot or {}

        updated = _diagnostic_timestamp(data)
        age_ms = max(0, int(time.time() * 1000) - updated) if updated else 10**18
        online = firebase_connected and age_ms <= DEVICE_STALE_MS
        raw_status = str(data.get("status") or "UNKNOWN").upper()
        meter_reported = isinstance(data.get("meter_ok"), bool)
        meter_ok = data.get("meter_ok") if meter_reported else raw_status != "SENSOR_ERROR" and _number(data.get("tegangan")) > 1
        lcd_reported = isinstance(data.get("lcd_ok"), bool)
        lcd_ok = data.get("lcd_ok") is True
        firmware = _github_release()
        overall_error = (not firebase_connected or not online or not meter_ok or (not is_temp_session and lcd_reported and not lcd_ok))
        overall_warn = not overall_error and not is_temp_session and not lcd_reported

        console.print("[bold cyan]DIAGNOSTIK SISTEM IoT LISTRIK[/bold cyan]")
        console.print("[dim]Pemeriksaan bersifat read-only; tidak mengubah konfigurasi atau menyalakan beban.[/dim]\n")
        _diagnostic_row("Koneksi cloud", "[bold green]TERHUBUNG[/bold green]" if firebase_connected else "[bold red]TERPUTUS[/bold red]")
        _diagnostic_row("Perangkat", "[bold green]ONLINE[/bold green]" if online else "[bold red]OFFLINE[/bold red]")
        _diagnostic_row("Heartbeat", "AKTIF" if online else "TIDAK AKTIF")
        if updated:
            from datetime import datetime
            update_text = f"{datetime.fromtimestamp(updated / 1000).strftime('%d/%m/%Y %H:%M:%S')} ({round(age_ms / 1000)} detik lalu)"
        else:
            update_text = "Belum ada timestamp"
        _diagnostic_row("Update terakhir", update_text); console.print()

        console.print("[bold cyan]Sensor dan perangkat[/bold cyan]")
        _diagnostic_row("PZEM-004T", "[bold green]BERFUNGSI[/bold green]" if meter_ok and online else "[bold red]ERROR[/bold red]")
        status_color = "green" if raw_status == "NORMAL" else "yellow" if raw_status == "WARNING" else "red"
        _diagnostic_row("Status baca", f"[bold {status_color}]{raw_status}[/bold {status_color}]")
        _diagnostic_row("Arus / tegangan", f"{_number(data.get('arus')):.2f} A / {_number(data.get('tegangan')):.1f} V")
        _diagnostic_row("ESP32 dan Wi-Fi", "[bold green]ONLINE[/bold green]" if online else "[bold red]OFFLINE[/bold red]")
        _diagnostic_row("RSSI / kualitas", _wifi_quality(data.get("wifi_rssi")))
        heap = _number(data.get("free_heap"))
        _diagnostic_row("Heap bebas", f"{round(heap / 1024)} KB" if heap > 0 else "Belum dilaporkan")
        if is_temp_session:
            lcd_label, lcd_color, lcd_address = "SIMULATOR", "green", "Simulator"
        elif lcd_reported:
            lcd_label, lcd_color = ("I2C MERESPONS", "green") if lcd_ok else ("ERROR", "red")
            address = int(_number(data.get("lcd_address")))
            lcd_address = f"0x{address:02X}" if lcd_ok and address > 0 else "Tidak ditemukan"
        else:
            lcd_label, lcd_color, lcd_address = "MENUNGGU DATA", "yellow", "Tidak ditemukan"
        _diagnostic_row("LCD I2C", f"[bold {lcd_color}]{lcd_label}[/bold {lcd_color}]")
        _diagnostic_row("LCD alamat", lcd_address)
        _diagnostic_row("Relay", ("ON" if int(_number(data.get("relay"))) == 1 else "OFF") if online else "Tidak diketahui")
        _diagnostic_row("Buzzer", "TERKONFIGURASI" if online else "Tidak diketahui"); console.print()

        console.print("[bold cyan]Pemetaan Hardware[/bold cyan]")
        console.print("  PZEM UART2   : RX GPIO16 <- PZEM TX; TX GPIO17 -> PZEM RX")
        console.print("  LCD I2C      : SDA GPIO21; SCL GPIO22")
        console.print("  Relay        : GPIO26")
        console.print("  Buzzer       : GPIO25\n")

        console.print("[bold cyan]Firmware Release[/bold cyan]")
        _diagnostic_row("Versi terpasang", _firmware_version(data.get("firmware_version") or "1.0.0"))
        _diagnostic_row("Release terbaru", firmware["tag"])
        _diagnostic_row("Asset .bin", firmware["bin"] or "BELUM TERSEDIA")
        _diagnostic_row("Board", data.get("firmware_board") or "esp32-dev-module")
        _diagnostic_row("OTA", "AKTIF" if data.get("firmware_ota_capable") is True else "BELUM AKTIF")
        if firmware["error"]:
            console.print(f"[yellow]Catatan firmware: {firmware['error']}[/yellow]")
        console.print("[dim]Pembaruan firmware dilakukan melalui desktop/PC menggunakan USB.[/dim]\n")

        conclusion = "PERLU DIPERIKSA" if overall_error else "DATA BELUM LENGKAP" if overall_warn else "SEMUA NORMAL"
        conclusion_color = "red" if overall_error else "yellow" if overall_warn else "green"
        _diagnostic_row("Kesimpulan", f"[bold {conclusion_color}]{conclusion}[/bold {conclusion_color}]"); console.print()

        action = questionary.select(
            DynamicSessionMessage("Diagnostik Sistem:"),
            choices=[questionary.Choice("[r] Refresh", "refresh"), questionary.Choice("[b] Kembali", "back")],
            style=custom_style,
            **live_prompt_kwargs(),
        ).ask()
        if action != "refresh":
            return


def toggle_relay():
    if is_temp_session or current_role != "admin":
        console.print("\n[bold red]Akses ditolak: kontrol relay hanya tersedia untuk Admin.[/bold red]")
        hold_for_enter()
        return

    if not probe_device_ready():
        console.print(f"\n[bold yellow]Perintah relay diblokir:[/bold yellow] {relay_blocked_reason()}")
        hold_for_enter()
        return

    answer = questionary.select(
        DynamicSessionMessage("Kontrol Relay Jarak Jauh:"),
        choices=[
            questionary.Choice("Nyalakan Relay (Paksakan ON)", True),
            questionary.Choice("Matikan Relay (Paksakan OFF)", False),
            questionary.Choice("Batal", None),
        ],
        style=custom_style,
        **live_prompt_kwargs(),
    ).ask()

    if answer is not None:
        try:
            db.child(f"{path_prefix}commands").child("relay").set(1 if answer else 0, current_user['token'])
            state_str = "ON" if answer else "OFF"
            console.print(f"\n[bold green]Berhasil mengirim perintah \\[{state_str}] ke alat![/bold green]")
        except Exception as e:
            console.print(f"\n[bold red]Gagal mengirim perintah:[/bold red] {str(e)}")
    
    hold_for_enter()

def stream_handler(message):
    try:
        global latest_listrik_snapshot
        data = message["data"]
        # Ini terjadi kalau data terubah (misal yang diubah hanya 'arus')
        # Di Pyrebase, kalau path `/listrik` dipantau, message["data"] adalah state utuh awalnya,
        # perubahan berikutnya ("put" event) memberikan dictionary kecil atau bahkan state penuh.
        # Kita fetch manual saja untuk memastikan render penuh.
        full_data = db.child(f"{path_prefix}listrik").get(current_user['token']).val()
        if not full_data: return

        # Gunakan ansi escape logic kaya di node JS (clear part of screen)
        # Di Windows msvcrt, untuk simplifikasi di Python, kita posisikan ulang kursor
        # secara kasar ke baris 5 atau kita print dengan cls
        # Karena pyrebase menjalankan ini di thread background
        # kita clear saja dan redraw (bisa layar kedip sedikit)
        clear_screen()
        latest_listrik_snapshot = full_data
        register_device_heartbeat(full_data)
        console.print("\n[bold cyan]IoT Listrik Dashboard CLI[/bold cyan]")
        console.print("[dim]Pengembang: Fatony Ahmad Fauzi[/dim]\n")
        console.print(_header_line_rich(live_countdown=True))
        console.print()
        start_header_ticker()
        console.print("[yellow]Memulai Live Stream Data Firebase...[/yellow]")
        console.print("[dim]Tekan 'q' atau 'Ctrl+C' kapan saja untuk kembali ke Menu Utama.\n[/dim]")

        console.print("[bold cyan]=== Data Realtime ===[/bold cyan]")
        connection = current_connection_label()
        if connection == "Connected":
            conn_str = f"[green]{connection}[/green]"
        elif connection == "Memeriksa perangkat...":
            conn_str = f"[yellow]{connection}[/yellow]"
        else:
            conn_str = f"[bold red]{connection}[/bold red]"
        source_label = "SIM" if is_temp_session else "CLOUD"
        console.print(f"[blue]Sumber     :[/blue] {source_label}")
        console.print(f"[blue]Koneksi    :[/blue] {conn_str}")
        offline = connection in ("Device Offline", "Offline")
        # Saat heartbeat stale, live summary mengikuti web/Windows: nilai
        # realtime dikosongkan menjadi 0 dan status menjadi OFFLINE. Snapshot
        # lama tetap disimpan untuk histori, bukan ditampilkan sebagai realtime.
        raw_updated_at = full_data.get("updated_at") or full_data.get("timestamp") or full_data.get("waktu")
        try:
            upd_ms = float(raw_updated_at) if raw_updated_at is not None else None
            from datetime import datetime as _dt
            if not offline and upd_ms and upd_ms > 1_000_000_000_000:
                waktu_live = _dt.fromtimestamp(upd_ms / 1000).strftime("%d/%m/%Y %H:%M:%S")
            else:
                waktu_live = "-"
        except (ValueError, TypeError):
            waktu_live = "-"
        live_data = {} if offline else full_data
        console.print(f"[blue]Waktu      :[/blue] {waktu_live}")
        console.print(f"[blue]Arus (A)   :[/blue] [white]{live_data.get('arus', 0)}[/white]")
        console.print(f"[blue]Tegangan(V):[/blue] [white]{live_data.get('tegangan', 0)}[/white]")
        console.print(f"[blue]Daya (VA)  :[/blue] [white]{live_data.get('apparent_power', live_data.get('daya', 0))}[/white]")
        
        status = 'OFFLINE' if offline else full_data.get('status', 'NORMAL')
        color = "green"
        if status == "WARNING": color = "yellow"
        elif status == "DANGER": color = "bold red"
        
        console.print(f"[blue]Status     :[/blue] [{color}]{status}[/{color}]")
        
        relay_val = False if offline else full_data.get('relay', False)
        relay_str = "[bold green]ON[/bold green]" if relay_val else "[bold red]OFF[/bold red]"
        console.print(f"[blue]Relay      :[/blue] {relay_str}\n")
    except Exception as e:
        pass


def run_live_monitoring():
    global watch_started_at
    print_header(live_countdown=True)
    console.print("[yellow]Memulai Live Stream Data Firebase...[/yellow]")
    console.print("[dim]Tekan sembarang tombol dari keyboard untuk kembali ke Menu Utama.\n[/dim]")

    try:
        watch_started_at = int(time.time() * 1000)
        fetch_listrik_snapshot()
        # Start the stream in background
        my_stream = db.child(f"{path_prefix}listrik").stream(stream_handler, token=current_user['token'])
        
        # Windows Keyboard listener wait
        if msvcrt:
            last_render = 0.0
            while True:
                if msvcrt.kbhit():
                    msvcrt.getch() # baca tombol
                    break
                now = time.time()
                if now - last_render >= 1.0 and latest_listrik_snapshot:
                    stream_handler({"data": latest_listrik_snapshot})
                    last_render = now
                time.sleep(0.1)
        else:
            # Fallback for linux/mac if needed (use raw input wrapper)
            console.print("[dim]Ketik enter untuk kembali[/dim]")
            input()

    except KeyboardInterrupt:
        pass
    finally:
        # Close the stream
        my_stream.close()


def main_menu():
    enforce_login()

    is_running = True
    while is_running:
        print_header()

        choices = [
            questionary.Choice("[1] Mengakses Live Monitoring", "live"),
            questionary.Choice("[2] Riwayat Log (20 entri)", "log"),
        ]
        if not is_temp_session:
            choices.append(questionary.Choice("[3] Diagnostik Sistem", "diagnostics"))
        if current_role == "admin" and not is_temp_session:
            choices.append(questionary.Choice("[4] Kontrol Relay Power", "relay"))
        logout_number = 5 if current_role == "admin" and not is_temp_session else (3 if is_temp_session else 4)
        choices.extend([
            questionary.Choice(f"[{logout_number}] Keluar Sesi (Logout)", "logout"),
            questionary.Choice("[0] Matikan Aplikasi (Exit)", "exit")
        ])

        action = questionary.select(
            DynamicSessionMessage("Pilih opsi:"),
            choices=choices,
            style=custom_style,
            **live_prompt_kwargs(),
        ).ask()

        if action == "live":
            run_live_monitoring()
        elif action == "log":
            view_logs()
        elif action == "diagnostics":
            view_diagnostics()
        elif action == "relay":
            toggle_relay()
        elif action == "logout":
            handle_logout()
        elif action == "exit" or action is None:
            console.print("\n[dim]Menutup CLI dan menghentikan proses... Sampai jumpa!\n[/dim]")
            stop_header_ticker()
            is_running = False
            sys.exit(0)

if __name__ == "__main__":
    try:
        main_menu()
    except Exception as e:
        console.print(f"\n[bold red]Terminated:[/bold red] {e}")
        time.sleep(3)
        sys.exit(1)
