// Redirect PWA standalone mode directly to login
const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
if (isStandaloneMode) {
  window.location.replace('/simulator/login');
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("simForm");
  const emailInput = document.getElementById("email");
  const generateBtn = document.getElementById("generateBtn");
  
  const inputState = document.getElementById("inputState");
  const successState = document.getElementById("successState");
  const sentEmailAddress = document.getElementById("sentEmailAddress");

  // Show toast notification
  const showToast = (msg, type = "success") => {
    import('./notifications.js').then(module => {
      if (module.showToast) module.showToast(msg, type);
    }).catch(() => {
      alert(msg); // Fallback
    });
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    if (!email) return;

    // Set loading state
    generateBtn.disabled = true;
    generateBtn.classList.add("loading");

    try {
      // Panggil Vercel Serverless Function
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 25000);
      let response;
      try {
        response = await fetch("/api/create-temp-account", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ realEmail: email }),
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeoutId);
      }

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = { error: `Server mengembalikan respons tidak valid (HTTP ${response.status}).` };
      }

      if (!response.ok) {
        throw new Error(data.error || "Terjadi kesalahan server");
      }

      if (data.success) {
        // Tampilkan State Sukses
        inputState.classList.add("hidden");
        successState.classList.add("active");
        sentEmailAddress.textContent = email;
        
        if (!data.emailSent) {
           showToast("Akun dibuat, tetapi email gagal dikirim (Cek Console / Fallback mode).", "warning");
           console.warn("Kredensial Demo (Simpan ini):", data.tempEmail, data.password);
        }
      }

    } catch (error) {
      console.error(error);
      const message = error?.name === "AbortError"
        ? "Server terlalu lama merespons. Periksa konfigurasi Firebase Admin di Vercel lalu coba lagi."
        : (error?.message || "Gagal membuat akun demo.");
      showToast(message, "error");
    } finally {
      generateBtn.disabled = false;
      generateBtn.classList.remove("loading");
    }
  });
});
