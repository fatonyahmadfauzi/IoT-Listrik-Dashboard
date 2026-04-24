import os
import sys
import json
import time
import base64
from threading import Timer

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
    "apiKey": "AIzaSyD99N-FQdkTPNnNGY-fof6ijskxg0bzARc",
    "authDomain": "monitoring-listrik-719b1.firebaseapp.com",
    "databaseURL": "https://monitoring-listrik-719b1-default-rtdb.asia-southeast1.firebasedatabase.app",
    "projectId": "monitoring-listrik-719b1",
    "storageBucket": "monitoring-listrik-719b1.firebasestorage.app",
    "messagingSenderId": "115654600721",
    "appId": "1:115654600721:web:6b971ee1c19be7e045a9b0",
}

firebase = pyrebase.initialize_app(firebaseConfig)
auth = firebase.auth()
db = firebase.database()

current_user = None
path_prefix = ""
session_timeout_timer = None
DEVICE_STALE_MS = 15000
last_device_heartbeat_at = 0
last_updated_marker = None
last_sensor_signature = ""
watch_started_at = int(time.time() * 1000)
latest_listrik_snapshot = None

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

def fetch_listrik_snapshot():
    global latest_listrik_snapshot
    snapshot = db.child(f"{path_prefix}listrik").get(current_user['token']).val()
    if snapshot:
        latest_listrik_snapshot = snapshot
        register_device_heartbeat(snapshot)
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
    global path_prefix, session_timeout_timer, watch_started_at, last_device_heartbeat_at, last_updated_marker, last_sensor_signature, latest_listrik_snapshot
    
    token = user_data.get('idToken', '')
    local_id = user_data.get('localId', '')
    claims = decode_jwt(token)
    
    is_temp = claims.get('isTempAccount', False)
    expires_at = claims.get('expiresAt')

    if is_temp and local_id:
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
        if session_timeout_timer:
            session_timeout_timer.cancel()
            session_timeout_timer = None

    watch_started_at = int(time.time() * 1000)
    last_device_heartbeat_at = 0
    last_updated_marker = None
    last_sensor_signature = ""
    latest_listrik_snapshot = None

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    clear_screen()
    console.print("\n[bold cyan]IoT Listrik Dashboard CLI[/bold cyan]")
    console.print("[dim]Pengembang: Fatony Ahmad Fauzi[/dim]\n")
    if current_user:
        console.print(f"[bold green][+] Terhubung sebagai: {current_user['email']}[/bold green]\n")

def hold_for_enter():
    questionary.text("Tekan Enter untuk kembali ke Menu Utama...", default="", style=custom_style).ask()

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
            console.print(f"\n[bold red]Login gagal:[/bold red] {e}\n[dim]Pastikan kredensial & koneksi internet Anda benar.[/dim]\n")
            time.sleep(1)

def handle_logout():
    global current_user
    confirm = questionary.confirm("Anda yakin ingin Keluar (Log out)?", default=False, style=custom_style).ask()
    if confirm:
        if os.path.exists(SESSION_FILE):
            os.remove(SESSION_FILE)
        current_user = None
        console.print("\n[bold green]Berhasil Log out. Aplikasi akan ditutup.[/bold green]")
        sys.exit(0)

def view_logs():
    print_header()
    console.print("[cyan]Memuat 5 log riwayat terakhir...\\n[/cyan]")
    try:
        logs_data = db.child(f"{path_prefix}logs").order_by_key().limit_to_last(5).get(current_user['token'])
        
        if logs_data.val():
            logs = logs_data.val()

            # Header tabel
            console.print(f"[bold cyan]{'Waktu':<22} {'Arus(A)':<10} {'Teg.(V)':<10} Status[/bold cyan]")
            console.print("[dim]" + "-" * 58 + "[/dim]")

            from datetime import datetime, timezone
            for key, item in logs.items():
                # Gunakan field 'waktu' (ISO string atau timestamp ms)
                raw_waktu = item.get("waktu", "-")
                waktu_str = "-"
                if raw_waktu and raw_waktu != "-":
                    try:
                        if isinstance(raw_waktu, (int, float)):
                            # timestamp milidetik
                            waktu_str = datetime.fromtimestamp(raw_waktu / 1000).strftime("%d/%m/%Y %H:%M:%S")
                        else:
                            waktu_str = datetime.fromisoformat(str(raw_waktu).replace('Z', '+00:00')).astimezone().strftime("%d/%m/%Y %H:%M:%S")
                    except Exception:
                        waktu_str = str(raw_waktu)

                arus    = str(item.get("arus",     "-"))
                teg     = str(item.get("tegangan", "-"))
                status  = item.get("status", "-")

                if status == "DANGER":
                    status_str = f"[bold red]{status}[/bold red]"
                elif status == "WARNING":
                    status_str = f"[yellow]{status}[/yellow]"
                else:
                    status_str = f"[green]{status}[/green]"

                console.print(
                    f"[white]{waktu_str:<22}[/white] "
                    f"[yellow]{arus:<10}[/yellow] "
                    f"[blue]{teg:<10}[/blue] "
                    f"{status_str}"
                )
        else:
            console.print("[dim]Belum ada catatan aktivitas.[/dim]")
    except Exception as e:
        console.print(f"[bold red]Kesalahan saat mengambil data: {str(e)}[/bold red]")
    
    hold_for_enter()

def toggle_relay():
    if not probe_device_ready():
        console.print(f"\n[bold yellow]Perintah relay diblokir:[/bold yellow] {relay_blocked_reason()}")
        hold_for_enter()
        return

    answer = questionary.select(
        "Kontrol Relay Jarak Jauh:",
        choices=[
            questionary.Choice("Nyalakan Relay (Paksakan ON)", True),
            questionary.Choice("Matikan Relay (Paksakan OFF)", False),
            questionary.Choice("Batal", None),
        ],
        style=custom_style
    ).ask()

    if answer is not None:
        try:
            db.child(f"{path_prefix}listrik").child("relay").set(answer, current_user['token'])
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
        console.print(f"[bold green][+] Terhubung sebagai: {current_user['email']}[/bold green]\n")
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
        console.print(f"[blue]Koneksi    :[/blue] {conn_str}")
        console.print(f"[blue]Waktu      :[/blue] {full_data.get('timestamp', '-')}")
        console.print(f"[blue]Arus (A)   :[/blue] [white]{full_data.get('arus', '0')}[/white]")
        console.print(f"[blue]Tegangan(V):[/blue] [white]{full_data.get('tegangan', '0')}[/white]")
        console.print(f"[blue]Daya (VA)  :[/blue] [white]{full_data.get('apparent_power', full_data.get('daya', '0'))}[/white]")
        
        status = full_data.get('status', 'NORMAL')
        color = "green"
        if status == "WARNING": color = "yellow"
        elif status == "DANGER": color = "bold red"
        
        console.print(f"[blue]Status     :[/blue] [{color}]{status}[/{color}]")
        
        relay_val = full_data.get('relay', False)
        relay_str = "[bold green]ON[/bold green]" if relay_val else "[bold red]OFF[/bold red]"
        console.print(f"[blue]Relay      :[/blue] {relay_str}\n")
    except Exception as e:
        pass


def run_live_monitoring():
    global watch_started_at
    print_header()
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
                if now - last_render >= 2.5 and latest_listrik_snapshot:
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

        action = questionary.select(
            "Pilih opsi:",
            choices=[
                questionary.Choice("[1] Mengakses Live Monitoring", "live"),
                questionary.Choice("[2] Catatan Log Terakhir", "log"),
                questionary.Choice("[3] Kontrol Relay Power", "relay"),
                questionary.Choice("[4] Keluar Sesi (Logout)", "logout"),
                questionary.Choice("[0] Matikan Aplikasi (Exit)", "exit")
            ],
            style=custom_style
        ).ask()

        if action == "live":
            run_live_monitoring()
        elif action == "log":
            view_logs()
        elif action == "relay":
            toggle_relay()
        elif action == "logout":
            handle_logout()
        elif action == "exit" or action is None:
            console.print("\n[dim]Menutup CLI dan menghentikan proses... Sampai jumpa!\n[/dim]")
            is_running = False
            sys.exit(0)

if __name__ == "__main__":
    try:
        main_menu()
    except Exception as e:
        console.print(f"\n[bold red]Terminated:[/bold red] {e}")
        time.sleep(3)
        sys.exit(1)
