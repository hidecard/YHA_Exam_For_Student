let currentExamId = "";
let currentQuestionIndex = 0;
let totalQuestions = 0;
let examStartTime = null;
let currentTheme = "light";
let examTimer = null;
let timeRemaining = 3600; // 1 hour in seconds
let isOnline = navigator.onLine;
const API_URL =
  "https://script.google.com/macros/s/AKfycbwP2m20Mb3Jkmp351o-l4NV9j7B8bDytq229agCj53j3OZV0jX-ONCkv7ES03zARvtsWg/exec";

// Initialize app
document.addEventListener("DOMContentLoaded", function () {
  initializeTheme();
  hideLoading();
  setupInputValidation();
  setupOfflineMode();

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
    hideLoading();
    showNotification("Exam started successfully!", "success");
  } catch (error) {
    hideLoading();
    if (!isOnline) {
      showNotification("Starting in offline mode", "warning");
      showExamSection();
    } else {
      showNotification("Failed to start exam. Please try again.", "error");
    }
    console.error("Start exam error:", error);
  }
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

// Removed auto-save functions since using Google Sheets

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Show exam section
function showExamSection() {
  document.getElementById("welcomeSection").style.display = "none";
  document.getElementById("examSection").style.display = "block";
  document.getElementById("currentExamId").textContent = currentExamId;
  updateProgress();
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
    await loadPDF(data.pdf_link);

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

// Enhanced PDF loading
async function loadPDF(pdfLink) {
  const pdfCard = document.getElementById("pdfCard");
  const pdfViewer = document.getElementById("pdfViewer");

  if (pdfLink && pdfLink.includes("raw.githubusercontent.com")) {
    pdfCard.style.display = "block";
    pdfViewer.innerHTML =
      '<div class="text-center"><div class="spinner"></div><p>Loading PDF...</p></div>';

    try {
      const pdf = await pdfjsLib.getDocument(pdfLink).promise;
      pdfViewer.innerHTML = "";

      const numPages = pdf.numPages;
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const canvas = document.createElement("canvas");
        canvas.style.marginBottom = "20px";
        pdfViewer.appendChild(canvas);

        const context = canvas.getContext("2d");
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport })
          .promise;
      }
    } catch (error) {
      console.error("PDF Error:", error);
      pdfViewer.innerHTML = `
        <div class="alert alert-warning d-flex align-items-center">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <span>Error loading PDF: ${error.message}</span>
        </div>
      `;
    }
  } else {
    pdfCard.style.display = "none";
  }
}

// Handle resources
function handleResources(resourceLink) {
  const resourcesSection = document.getElementById("resourcesSection");
  const downloadBtn = document.getElementById("resourceDownload");

  if (resourceLink && resourceLink.includes("raw.githubusercontent.com")) {
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

// Navigation functions are now included above

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
  const modal = new bootstrap.Modal(document.getElementById("successModal"));
  document.getElementById("summaryTotal").textContent = totalQuestions;
  document.getElementById("summaryExamId").textContent = currentExamId;
  modal.show();
}

// Restart exam
function restartExam() {
  location.reload();
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

// Add notification styles to CSS (will be injected)
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
