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
    global path_prefix, session_timeout_timer
    
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
        console.print("\n[bold cyan]IoT Listrik Dashboard CLI[/bold cyan]")
        console.print("[dim]Pengembang: Fatony Ahmad Fauzi[/dim]\n")
        console.print(f"[bold green][+] Terhubung sebagai: {current_user['email']}[/bold green]\n")
        console.print("[yellow]Memulai Live Stream Data Firebase...[/yellow]")
        console.print("[dim]Tekan 'q' atau 'Ctrl+C' kapan saja untuk kembali ke Menu Utama.\n[/dim]")

        console.print("[bold cyan]=== Data Realtime ===[/bold cyan]")
        console.print(f"[blue]Waktu      :[/blue] {full_data.get('timestamp', '-')}")
        console.print(f"[blue]Arus (A)   :[/blue] [white]{full_data.get('arus', '0')}[/white]")
        console.print(f"[blue]Tegangan(V):[/blue] [white]{full_data.get('tegangan', '0')}[/white]")
        console.print(f"[blue]Daya (VA)  :[/blue] [white]{full_data.get('apparent_power', '0')}[/white]")
        
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
    print_header()
    console.print("[yellow]Memulai Live Stream Data Firebase...[/yellow]")
    console.print("[dim]Tekan sembarang tombol dari keyboard untuk kembali ke Menu Utama.\n[/dim]")

    try:
        # Start the stream in background
        my_stream = db.child(f"{path_prefix}listrik").stream(stream_handler, token=current_user['token'])
        
        # Windows Keyboard listener wait
        if msvcrt:
            while True:
                if msvcrt.kbhit():
                    msvcrt.getch() # baca tombol
                    break
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
