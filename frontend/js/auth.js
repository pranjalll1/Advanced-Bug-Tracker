// =============================================
//  AUTH.JS — Login & Register Logic
// =============================================

// 🔧 CONFIGURATION
// Change this if your backend runs on a different port
const API_BASE = "/api";


// =============================================
//  LOGIN LOGIC
// =============================================

// Grab the login form (only exists on index.html)
const loginForm = document.getElementById("loginForm");

if (loginForm) {

  loginForm.addEventListener("submit", async function (e) {

    // Step 1: Stop the form from refreshing the page
    e.preventDefault();

    // Step 2: Get input values
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    // Step 3: Get UI elements we'll update
    const errorMsg = document.getElementById("errorMsg");
    const loginBtn = document.getElementById("loginBtn");

    // Step 4: Basic frontend validation (removed to allow backend to handle it)

    // Step 5: Show loading state on button
    loginBtn.textContent = "Signing in...";
    loginBtn.disabled = true;
    errorMsg.style.display = "none";

    // Step 6: Send request to backend
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      // Step 7: Parse the JSON response
      const data = await response.json();

      // Step 8: Check if login was successful
      if (response.ok) {

        // ✅ Save token and user info to localStorage
        localStorage.setItem("token", data.token);

        // Save user info if your backend sends it
        // Adjust "data.user" to match your actual API response shape
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }

        // ✅ Redirect to dashboard
        window.location.href = "dashboard.html";

      } else {
        //  Backend returned an error (wrong password, user not found, etc.)
        const backendError = data.message || data.error || "Login failed. Please check your credentials.";
        showError(errorMsg, backendError);
      }

    } catch (err) {
      //  Network error (backend not running, wrong port, etc.)
      showError(errorMsg, "Cannot connect to server. Is your backend running?");
      console.error("Login error:", err);
    }

    // Step 9: Reset button state
    loginBtn.textContent = "Sign In";
    loginBtn.disabled = false;
  });
}
// =============================================
//  REGISTER LOGIC
// =============================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

  // ── Live password rule checker ──────────────
  // Runs every time the user types in the password field
  const passwordInput = document.getElementById("password");

  passwordInput.addEventListener("input", function () {
    const val = this.value;

    checkRule("rule-length", val.length >= 8);
    checkRule("rule-upper", /[A-Z]/.test(val));
    checkRule("rule-number", /[0-9]/.test(val));
    checkRule("rule-special", /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val));
  });

  // ── Form submit ─────────────────────────────
  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Step 1: Grab all field values
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const role = document.getElementById("role").value;
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    const errorMsg = document.getElementById("errorMsg");
    const successMsg = document.getElementById("successMsg");
    const registerBtn = document.getElementById("registerBtn");

    // Hide old messages
    errorMsg.style.display = "none";
    successMsg.style.display = "none";

    // Step 2: Frontend validation
    // Let the backend handle empty fields and regex validation.
    // We only check if passwords match, because the backend doesn't receive confirmPassword.
    if (password !== confirmPassword) {
      showError(errorMsg, "Passwords do not match.");
      return;
    }

    // Step 3: Loading state
    registerBtn.textContent = "Creating account...";
    registerBtn.disabled = true;

    // Step 4: Send to backend
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role })
      });

      const data = await response.json();

      if (response.ok) {

        //  Success — show message, redirect to login after 3 seconds
        showSuccess(
          successMsg,
          "Account created! ⏳ Waiting for admin approval. Redirecting to login..."
        );

        // Disable form so user can't resubmit
        registerBtn.disabled = true;
        registerForm.style.opacity = "0.5";
        registerForm.style.pointerEvents = "none";

        // Redirect to login after 3 seconds
        setTimeout(() => {
          window.location.href = "index.html";
        }, 3000);

      } else {
        //  Backend error — show exact message from your controller
        const backendError = data.message || data.error || "Registration failed. Please try again.";
        showError(errorMsg, backendError);
      }

    } catch (err) {
      showError(errorMsg, "Cannot connect to server. Is your backend running?");
      console.error("Register error:", err);
    }

    // Reset button only on failure
    if (registerBtn.disabled && !successMsg.style.display === "none") {
      registerBtn.textContent = "Create Account";
      registerBtn.disabled = false;
    }

    registerBtn.textContent = registerBtn.disabled ? "Creating account..." : "Create Account";
  });
}


// =============================================
//  HELPER: Password Rule Checker
// =============================================
function checkRule(ruleId, passed) {
  const el = document.getElementById(ruleId);
  if (!el) return;

  if (passed) {
    el.textContent = el.textContent.replace("✗", "✓");
    el.classList.add("pass");
    el.classList.remove("fail");
  } else {
    el.textContent = el.textContent.replace("✓", "✗");
    el.classList.remove("pass");
    el.classList.add("fail");
  }
}



// =============================================
//  HELPER FUNCTIONS
// =============================================

// Show an error message in the alert box
function showError(element, message) {
  const textSpan = element.querySelector('span');
  if (textSpan) {
    textSpan.textContent = message;
    element.style.display = "flex";
  } else {
    element.textContent = message;
    element.style.display = "block";
  }
}

// Show a success message in the alert box
function showSuccess(element, message) {
  element.className = "alert alert-success";
  const textSpan = element.querySelector('span');
  if (textSpan) {
    textSpan.textContent = message;
    element.style.display = "flex";
  } else {
    element.textContent = message;
    element.style.display = "block";
  }
}
// =============================================
//  FORGOT PASSWORD LOGIC
// =============================================
const forgotPasswordForm = document.getElementById("forgotPasswordForm");

if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const errorMsg = document.getElementById("errorMsg");
    const successMsg = document.getElementById("successMsg");
    const forgotBtn = document.getElementById("forgotBtn");

    if (!email) {
      showError(errorMsg, "Please enter your email address.");
      return;
    }

    forgotBtn.textContent = "Sending...";
    forgotBtn.disabled = true;
    errorMsg.style.display = "none";
    successMsg.style.display = "none";

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        // If your backend isn't sending emails, we'll simulate the link here
        if (data.resetToken) {
          showSuccess(successMsg, "Simulated Email: ");
          const span = successMsg.querySelector("span");
          span.innerHTML = `Link: <a href="reset-password.html?token=${data.resetToken}" style="color: #16a34a; font-weight:bold; text-decoration: underline;">Click to Reset Password</a>`;
        } else {
          showSuccess(successMsg, data.message || "Reset link sent to your email!");
        }
      } else {
        const backendError = data.message || data.error || "Error processing request.";
        showError(errorMsg, backendError);
      }
    } catch (err) {
      showError(errorMsg, "Cannot connect to server. Is your backend running?");
    }

    forgotBtn.textContent = "Send Reset Link";
    forgotBtn.disabled = false;
  });
}

// =============================================
//  RESET PASSWORD LOGIC
// =============================================
const resetPasswordForm = document.getElementById("resetPasswordForm");

if (resetPasswordForm) {
  resetPasswordForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const errorMsg = document.getElementById("errorMsg");
    const successMsg = document.getElementById("successMsg");
    const resetBtn = document.getElementById("resetBtn");

    // Extract the token from the URL parameters (e.g. ?token=XYZ)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      showError(errorMsg, "Invalid or missing reset token in URL.");
      return;
    }

    if (password !== confirmPassword) {
      showError(errorMsg, "Passwords do not match!");
      return;
    }

    resetBtn.textContent = "Updating...";
    resetBtn.disabled = true;
    errorMsg.style.display = "none";

    try {
      const response = await fetch(`${API_BASE}/auth/reset-password/${token}`, {
        method: "POST", // OR "PUT" depending on your backend
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess(successMsg, "Password updated successfully!");
        resetPasswordForm.reset();
        setTimeout(() => {
          window.location.href = "login.html"; // Redirect to login
        }, 2000);
      } else {
        const backendError = data.message || data.error || "Could not reset password.";
        showError(errorMsg, backendError);
      }
    } catch (err) {
      showError(errorMsg, "Cannot connect to server.");
    }

    resetBtn.textContent = "Update Password";
    resetBtn.disabled = false;
  });
}
