// =============================================
//  AUTH.JS — Login & Register Logic
// =============================================

// 🔧 CONFIGURATION
// Change this if your backend runs on a different port
const API_BASE = "http://localhost:8000/api";


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
    const email    = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    // Step 3: Get UI elements we'll update
    const errorMsg = document.getElementById("errorMsg");
    const loginBtn = document.getElementById("loginBtn");

    // Step 4: Basic frontend validation
    if (!email || !password) {
      showError(errorMsg, "Please fill in all fields.");
      return;
    }

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
        // ❌ Backend returned an error (wrong password, user not found, etc.)
        showError(errorMsg, data.message); //|| "Login failed. Please try again.");
      }

    } catch (err) {
      // ❌ Network error (backend not running, wrong port, etc.)
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

    checkRule("rule-length",  val.length >= 8);
    checkRule("rule-upper",   /[A-Z]/.test(val));
    checkRule("rule-number",  /[0-9]/.test(val));
    checkRule("rule-special", /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val));
  });

  // ── Form submit ─────────────────────────────
  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Step 1: Grab all field values
    const name            = document.getElementById("name").value.trim();
    const email           = document.getElementById("email").value.trim();
    const role            = document.getElementById("role").value;
    const password        = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    const errorMsg   = document.getElementById("errorMsg");
    const successMsg = document.getElementById("successMsg");
    const registerBtn = document.getElementById("registerBtn");

    // Hide old messages
    errorMsg.style.display   = "none";
    successMsg.style.display = "none";

    // Step 2: Frontend validation
    if (!name || !email || !role || !password || !confirmPassword) {
      showError(errorMsg, "Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      showError(errorMsg, "Passwords do not match.");
      return;
    }

    // Password regex — mirrors your backend rule exactly
    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      showError(errorMsg, "Password does not meet the requirements listed below.");
      return;
    }

    // Step 3: Loading state
    registerBtn.textContent = "Creating account...";
    registerBtn.disabled    = true;

    // Step 4: Send to backend
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role })
      });

      const data = await response.json();

      if (response.ok) {

        // ✅ Success — show message, redirect to login after 3 seconds
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
        // ❌ Backend error — show exact message from your controller
        showError(errorMsg, data.message);
      }

    } catch (err) {
      showError(errorMsg, "Cannot connect to server. Is your backend running?");
      console.error("Register error:", err);
    }

    // Reset button only on failure
    if (registerBtn.disabled && !successMsg.style.display === "none") {
      registerBtn.textContent = "Create Account";
      registerBtn.disabled    = false;
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
  element.textContent = message;
  element.style.display = "block";
}

// Show a success message in the alert box
function showSuccess(element, message) {
  element.className = "alert alert-success";
  element.textContent = message;
  element.style.display = "block";
}