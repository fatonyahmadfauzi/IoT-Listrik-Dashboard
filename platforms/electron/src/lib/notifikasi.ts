// notifikasi.ts
// Utilitas notifikasi dan alarm untuk aplikasi Electron (renderer)

export function showNotification(title: string, body: string) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    });
  }
}

function resolveAsset(filename: string): string {
  // Path absolut "/alarm.wav" salah untuk Electron (file://): mengarah ke root drive.
  // Relatif ke halaman (index.html) agar sama di dev (Vite) dan produksi.
  if (typeof document !== 'undefined') {
    return new URL(filename, document.baseURI).href;
  }
  return filename;
}

export function stopAlarm() {
  const audio = (window as any).__iotAlarmAudio;
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    (window as any).__iotAlarmAudio = null;
  }
}

export function playAlarm(soundUrl?: string) {
  // Pastikan tidak ada alarm lama yang masih bermain sebelum memulai yang baru
  stopAlarm();

  const audioPath = soundUrl ?? resolveAsset('alarm.wav');
  const audio = new Audio(audioPath);
  audio.loop = true;
  audio.volume = 1.0;

  // Penting: set global SEBELUM memanggil play() agar stopAlarm()
  // bisa menghentikan instance yang sedang mulai (menghindari race condition).
  (window as any).__iotAlarmAudio = audio;

  audio.play().catch(() => {
    // Kalau wav gagal diputar, pindah ke fallback mp3.
    audio.pause();
    audio.currentTime = 0;

    const fallback = new Audio(resolveAsset('alarm.mp3'));
    fallback.loop = true;
    fallback.volume = 1.0;
    (window as any).__iotAlarmAudio = fallback;

    fallback.play().catch(() => {
      (window as any).__iotAlarmAudio = null;
    });
  });
}
