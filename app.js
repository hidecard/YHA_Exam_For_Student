let currentExamId = "";
let currentQuestionIndex = 0;
let totalQuestions = 0;
let examStartTime = null;
let currentTheme = "light";
let examTimer = null;
let timeRemaining = 3600; // 1 hour in seconds
let isOnline = navigator.onLine;
let isExamActive = false;
let tabSwitchCount = 0;
let lastVisibilityChange = Date.now();
const API_URL =
  "https://script.google.com/macros/s/AKfycbwP2m20Mb3Jkmp351o-l4NV9j7B8bDytq229agCj53j3OZV0jX-ONCkv7ES03zARvtsWg/exec";

// Initialize app
document.addEventListener("DOMContentLoaded", function () {
  initializeTheme();
  hideLoading();
  setupInputValidation();
  setupOfflineMode();
  setupTabSwitchingDetection();

  // Register service worker for offline support
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(console.error);
  }
});

// Theme functions
function initializeTheme() {
  const savedTheme = localStorage.getItem("examTheme") || "light";
  currentTheme = savedTheme;
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon();
}

function toggleTheme() {
  currentTheme = currentTheme === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", currentTheme);
  localStorage.setItem("examTheme", currentTheme);
  updateThemeIcon();

  // Smooth transition effect
  document.body.style.transition = "all 0.3s ease";
  setTimeout(() => {
    document.body.style.transition = "";
  }, 300);
}

function updateThemeIcon() {
  const themeIcon = document.querySelector("#themeToggle i");
  if (themeIcon) {
    themeIcon.className =
      currentTheme === "light" ? "fas fa-moon" : "fas fa-sun";
  }
}

// Loading functions
function showLoading() {
  document.getElementById("loadingOverlay").style.display = "flex";
}

function hideLoading() {
  document.getElementById("loadingOverlay").style.display = "none";
}

// Input validation
function setupInputValidation() {
  const examIdInput = document.getElementById("examId");
  examIdInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      startExam();
    }
  });

  examIdInput.addEventListener("input", function (e) {
    const value = e.target.value.trim();
    const startButton = document.querySelector(".btn-modern.btn-primary");

    if (value.length > 0) {
      startButton.style.opacity = "1";
      startButton.style.pointerEvents = "auto";
    } else {
      startButton.style.opacity = "0.6";
      startButton.style.pointerEvents = "none";
    }
  });
}

// Enhanced start exam function
async function startExam() {
  currentExamId = document.getElementById("examId").value.trim();

  if (!currentExamId) {
    showNotification("Please enter an Exam ID", "warning");
    return;
  }

  // Validate exam ID format (basic validation)
  if (currentExamId.length < 2) {
    showNotification("Please enter a valid Exam ID", "error");
    return;
  }

  showLoading();
  examStartTime = new Date();
  currentQuestionIndex = 0;

  // Initialize timer (1 hour default)
  timeRemaining = 3600;
  startTimer();

  try {
    await loadQuestion();
    showExamSection();
    isExamActive = true; // Enable tab switching detection
    hideLoading();
    showNotification(
      "Exam started successfully! Tab switching is being monitored.",
      "success",
    );
  } catch (error) {
    hideLoading();
    if (!isOnline) {
      showNotification("Starting in offline mode", "warning");
      showExamSection();
      isExamActive = true;
    } else {
      showNotification("Failed to start exam. Please try again.", "error");
    }
    console.error("Start exam error:", error);
  }
}

// Show exam section
function showExamSection() {
  document.getElementById("welcomeSection").style.display = "none";
  document.getElementById("examSection").style.display = "block";
  document.getElementById("currentExamId").textContent = currentExamId;
  updateProgress();
}

// Timer functions
function startTimer() {
  if (examTimer) clearInterval(examTimer);

  examTimer = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    updateTimerBar();

    if (timeRemaining <= 0) {
      clearInterval(examTimer);
      autoSubmitExam();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timerText = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const timerElement = document.getElementById("timerText");
  const timerDisplay = document.getElementById("examTimer");

  if (timerElement) {
    timerElement.textContent = timerText;
  }

  // Change timer color based on remaining time
  if (timerDisplay) {
    timerDisplay.className = "timer-display";
    if (timeRemaining <= 600) {
      // 10 minutes
      timerDisplay.classList.add("danger");
    } else if (timeRemaining <= 1200) {
      // 20 minutes
      timerDisplay.classList.add("warning");
    }
  }
}

function updateTimerBar() {
  const timerBar = document.getElementById("timerBar");
  if (timerBar) {
    const percentage = (timeRemaining / 3600) * 100;
    timerBar.style.width = `${percentage}%`;

    timerBar.className = "timer-bar";
    if (timeRemaining <= 600) {
      // 10 minutes
      timerBar.classList.add("danger");
    } else if (timeRemaining <= 1200) {
      // 20 minutes
      timerBar.classList.add("warning");
    }
  }
}

function autoSubmitExam() {
  showNotification("Time is up! Exam submitted automatically.", "warning");
  finishExam();
}

// Offline Mode functions
function setupOfflineMode() {
  // Listen for online/offline events
  window.addEventListener("online", () => {
    isOnline = true;
    updateConnectionStatus();
    hideOfflineBanner();
  });

  window.addEventListener("offline", () => {
    isOnline = false;
    updateConnectionStatus();
    showOfflineBanner();
  });

  updateConnectionStatus();
}

function updateConnectionStatus() {
  const statusElement = document.getElementById("connectionStatus");
  const iconElement = document.getElementById("connectionIcon");
  const textElement = document.getElementById("connectionText");

  if (statusElement && iconElement && textElement) {
    if (isOnline) {
      statusElement.className = "connection-status online";
      iconElement.className = "fas fa-wifi";
      textElement.textContent = "Online";
    } else {
      statusElement.className = "connection-status offline";
      iconElement.className = "fas fa-wifi-slash";
      textElement.textContent = "Offline";
    }
  }
}

function showOfflineBanner() {
  document.getElementById("offlineBanner").style.display = "block";
  document.body.style.paddingTop = "60px";
}

function hideOfflineBanner() {
  document.getElementById("offlineBanner").style.display = "none";
  document.body.style.paddingTop = "0";
}

function syncWhenOnline() {
  if (isOnline) {
    showNotification("Connection restored!", "success");
  } else {
    showNotification("Still offline. Please check your connection.", "warning");
  }
}

// Enhanced load question function
async function loadQuestion() {
  try {
    showLoading();

    const response = await fetch(
      `${API_URL}?action=getExam&examId=${currentExamId}&questionIndex=${currentQuestionIndex}`,
    );
    const data = await response.json();

    if (data.error) {
      document.getElementById("questionContainer").innerHTML = `
        <div class="alert alert-danger d-flex align-items-center">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <span>${data.error}</span>
        </div>
      `;
      return;
    }

    totalQuestions = data.totalQuestions;
    document.getElementById("totalQuestionsNum").textContent = totalQuestions;

    // Update question content
    document.getElementById("questionTitle").textContent =
      `Question ${currentQuestionIndex + 1}`;
    document.getElementById("questionContainer").innerHTML = `
      <h3>Question ${currentQuestionIndex + 1}</h3>
      <p>${data.question}</p>
    `;

    // Handle PDF loading
    try {
      await loadPDF(data.pdf_link);
    } catch (pdfError) {
      console.error('PDF loading error:', pdfError);
      showNotification('PDF loading failed, but exam can continue', 'warning');
    }

    // Handle resource links
    handleResources(data.resource_link);

    // Update navigation
    updateNavigation();
    updateProgress();

    hideLoading();
  } catch (error) {
    hideLoading();
    console.error("Error loading question:", error);
    document.getElementById("questionContainer").innerHTML = `
      <div class="alert alert-danger d-flex align-items-center">
        <i class="fas fa-exclamation-triangle me-2"></i>
        <span>Error loading question: ${error.message}</span>
      </div>
    `;
  }
}

// Simple PDF loading without canvas rendering
async function loadPDF(pdfLink) {
  const pdfCard = document.getElementById("pdfCard");
  const pdfViewer = document.getElementById("pdfViewer");

  if (
    pdfLink &&
  if (pdfLink && (pdfLink.includes('raw.githubusercontent.com') || pdfLink.includes('drive.google.com'))) {
    pdfCard.style.display = 'block';
    pdfViewer.innerHTML = '<div class="text-center"><div class="spinner"></div><p>Loading PDF...</p></div>';

    try {
      // Use iframe to display PDF directly with error handling
      const iframe = document.createElement('iframe');
      iframe.src = pdfLink;
      iframe.width = '100%';
      iframe.height = '600px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '12px';
      iframe.title = 'Exam PDF Document';

      iframe.onload = function() {
        showNotification('PDF loaded successfully', 'success');
      };

      iframe.onerror = function() {
        console.error('PDF iframe loading failed');
        pdfViewer.innerHTML = `
          <div class="alert alert-warning d-flex align-items-center">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <span>PDF could not be displayed inline. Please use the link below.</span>
          </div>
          <div class="text-center mt-3">
            <a href="${pdfLink}" target="_blank" class="btn btn-primary">
              <i class="fas fa-external-link-alt"></i> Open PDF in New Tab
            </a>
          </div>
        `;
      };

      pdfViewer.innerHTML = `
        <div class="pdf-container">
          <div class="pdf-fallback" style="margin-bottom: 16px;">
            <p class="text-muted">If the PDF doesn't display properly below:</p>
            <a href="${pdfLink}" target="_blank" class="btn btn-outline-primary">
              <i class="fas fa-external-link-alt"></i> Open PDF in New Tab
            </a>
          </div>
        </div>
      `;

      pdfViewer.querySelector('.pdf-container').appendChild(iframe);

    } catch (error) {
      console.error('PDF Error:', error);
      pdfViewer.innerHTML = `
        <div class="alert alert-warning d-flex align-items-center">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <span>Error loading PDF. Please use the direct link.</span>
        </div>
        <div class="text-center mt-3">
          <a href="${pdfLink}" target="_blank" class="btn btn-primary">
            <i class="fas fa-external-link-alt"></i> Open PDF in New Tab
          </a>
        </div>
      `;
    }
  } else {
    pdfCard.style.display = 'none';
  }
    pdfCard.style.display = "none";
  }
}

// Handle resources
function handleResources(resourceLink) {
  const resourcesSection = document.getElementById("resourcesSection");
  const downloadBtn = document.getElementById("resourceDownload");

  if (
    resourceLink &&
    (resourceLink.includes("raw.githubusercontent.com") ||
      resourceLink.includes("drive.google.com"))
  ) {
    resourcesSection.style.display = "block";
    downloadBtn.href = resourceLink;
    downloadBtn.style.display = "inline-flex";
    downloadBtn.innerHTML =
      '<i class="fas fa-file-download"></i> Download Resource';
  } else {
    resourcesSection.style.display = "none";
  }
}

// Update navigation
function updateNavigation() {
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const finishBtn = document.getElementById("finishBtn");

  prevBtn.style.display = currentQuestionIndex > 0 ? "inline-flex" : "none";

  if (currentQuestionIndex < totalQuestions - 1) {
    nextBtn.style.display = "inline-flex";
    finishBtn.style.display = "none";
  } else {
    nextBtn.style.display = "none";
    finishBtn.style.display = "inline-flex";
  }
}

// Update progress
function updateProgress() {
  const currentQuestionNum = document.getElementById("currentQuestionNum");
  const progressFill = document.getElementById("progressFill");

  currentQuestionNum.textContent = currentQuestionIndex + 1;

  const progressPercentage =
    ((currentQuestionIndex + 1) / totalQuestions) * 100;
  progressFill.style.width = `${progressPercentage}%`;
}

// Navigation functions
function nextQuestion() {
  if (currentQuestionIndex < totalQuestions - 1) {
    currentQuestionIndex++;
    loadQuestion();
    scrollToTop();
  }
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    loadQuestion();
    scrollToTop();
  }
}

// Finish exam
function finishExam() {
  isExamActive = false; // Disable tab switching detection
  clearInterval(examTimer); // Stop timer

  const modal = new bootstrap.Modal(document.getElementById("successModal"));
  document.getElementById("summaryTotal").textContent = totalQuestions;
  document.getElementById("summaryExamId").textContent = currentExamId;

  // Add tab switch summary to modal
  const tabSwitchSummary = document.createElement("div");
  tabSwitchSummary.className = "summary-item";
  tabSwitchSummary.innerHTML = `
    <span class="label">Tab Switches:</span>
    <span class="value" style="color: ${tabSwitchCount > 3 ? "var(--danger-color)" : tabSwitchCount > 0 ? "var(--warning-color)" : "var(--success-color)"}">
      ${tabSwitchCount} violations
    </span>
  `;
  document.querySelector(".exam-summary").appendChild(tabSwitchSummary);

  modal.show();
}

// Restart exam
function restartExam() {
  location.reload();
}

// Tab Switching Detection
function setupTabSwitchingDetection() {
  // Listen for visibility change events
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Listen for focus/blur events
  window.addEventListener("blur", handleWindowBlur);
  window.addEventListener("focus", handleWindowFocus);

  // Listen for beforeunload (tab closing/refreshing)
  window.addEventListener("beforeunload", handleBeforeUnload);
}

function handleVisibilityChange() {
  if (!isExamActive) return;

  const now = Date.now();
  const timeDiff = now - lastVisibilityChange;

  // Ignore rapid visibility changes (less than 1 second)
  if (timeDiff < 1000) return;

  if (document.hidden) {
    // Tab became hidden
    showTabSwitchWarning("tab_hidden");
    logTabSwitch("Tab hidden/switched");
  } else {
    // Tab became visible again
    showTabSwitchWarning("tab_visible");
    logTabSwitch("Tab visible/returned");
  }

  lastVisibilityChange = now;
}

function handleWindowBlur() {
  if (!isExamActive) return;
  showTabSwitchWarning("window_blur");
  logTabSwitch("Window lost focus");
}

function handleWindowFocus() {
  if (!isExamActive) return;
  showTabSwitchWarning("window_focus");
  logTabSwitch("Window gained focus");
}

function handleBeforeUnload(e) {
  if (!isExamActive) return;

  const message =
    "Are you sure you want to leave the exam? Your progress may be lost.";
  e.returnValue = message;
  return message;
}

function logTabSwitch(action) {
  tabSwitchCount++;
  const timestamp = new Date().toISOString();

  console.log(`Tab Switch #${tabSwitchCount}: ${action} at ${timestamp}`);

  // Store in localStorage for tracking
  const tabSwitchLog = JSON.parse(localStorage.getItem("tabSwitchLog") || "[]");
  tabSwitchLog.push({
    examId: currentExamId,
    action: action,
    timestamp: timestamp,
    questionIndex: currentQuestionIndex,
    timeRemaining: timeRemaining,
  });
  localStorage.setItem("tabSwitchLog", JSON.stringify(tabSwitchLog));

  // Show warning if too many switches
  if (tabSwitchCount >= 3) {
    showSevereTabWarning();
  }
}

function showTabSwitchWarning(type) {
  let message = "";
  let icon = "fas fa-exclamation-triangle";

  switch (type) {
    case "tab_hidden":
      message = `⚠️ Warning: Tab switching detected! (${tabSwitchCount + 1} violations)`;
      break;
    case "tab_visible":
      message = `👁️ Tab focus restored. Please stay on the exam page.`;
      icon = "fas fa-eye";
      break;
    case "window_blur":
      message = `⚠️ Warning: Window focus lost! Stay focused on the exam.`;
      break;
    case "window_focus":
      message = `✅ Window focus restored.`;
      icon = "fas fa-check-circle";
      break;
  }

  showNotification(
    message,
    type.includes("visible") || type.includes("focus") ? "info" : "warning",
  );
}

function showSevereTabWarning() {
  const modal = document.createElement("div");
  modal.className = "modal fade show";
  modal.style.display = "block";
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content modern-modal" style="border: 3px solid var(--danger-color);">
        <div class="modal-header" style="background: var(--danger-color); color: white;">
          <i class="fas fa-ban" style="font-size: 1.5rem; margin-right: 0.5rem;"></i>
          <h5 class="modal-title">Severe Security Violation</h5>
        </div>
        <div class="modal-body text-center">
          <div style="font-size: 4rem; color: var(--danger-color); margin-bottom: 1rem;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h4 style="color: var(--danger-color);">Multiple Tab Switches Detected!</h4>
          <p>You have switched tabs/windows <strong>${tabSwitchCount} times</strong>.</p>
          <p>This behavior is being logged and may result in exam disqualification.</p>
          <div class="alert alert-danger mt-3">
            <i class="fas fa-shield-alt"></i>
            <strong>Final Warning:</strong> Stay focused on this exam tab only.
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-modern btn-primary" onclick="closeSevereWarning()">
            I Understand - Continue Exam
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.id = "severeWarningModal";
}

function closeSevereWarning() {
  const modal = document.getElementById("severeWarningModal");
  if (modal) {
    modal.remove();
  }
}

// Utility functions
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showNotification(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `notification-toast notification-${type}`;

  const icon = getNotificationIcon(type);
  toast.innerHTML = `<i class="${icon}"></i> ${message}`;

  document.body.appendChild(toast);

  // Animate in
  setTimeout(() => toast.classList.add("show"), 100);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function getNotificationIcon(type) {
  const icons = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-circle",
    warning: "fas fa-exclamation-triangle",
    info: "fas fa-info-circle",
  };
  return icons[type] || icons.info;
}

// PDF fullscreen toggle
function togglePdfFullscreen() {
  const pdfViewer = document.getElementById("pdfViewer");
  if (pdfViewer.classList.contains("fullscreen")) {
    pdfViewer.classList.remove("fullscreen");
  } else {
    pdfViewer.classList.add("fullscreen");
  }
}

// Add notification styles
const notificationStyles = `
.notification-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 1rem 1.5rem;
  border-radius: var(--border-radius);
  color: white;
  font-weight: 600;
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transform: translateX(400px);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-lg);
}

.notification-toast.show {
  transform: translateX(0);
  opacity: 1;
}

.notification-success {
  background: var(--success-color);
}

.notification-error {
  background: var(--danger-color);
}

.notification-warning {
  background: var(--warning-color);
  color: var(--dark-color);
}

.notification-info {
  background: var(--primary-color);
}

.pdf-viewer.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: white;
  z-index: 9999;
  padding: 2rem;
  overflow-y: auto;
}
`;

// Inject notification styles
const styleSheet = document.createElement("style");
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);