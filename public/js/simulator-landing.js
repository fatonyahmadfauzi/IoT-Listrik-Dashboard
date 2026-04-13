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
      const response = await fetch("/api/create-temp-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ realEmail: email })
      });

      const data = await response.json();

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
      showToast(error.message, "error");
    } finally {
      generateBtn.disabled = false;
      generateBtn.classList.remove("loading");
    }
  });
});
