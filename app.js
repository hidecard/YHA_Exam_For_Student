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
let openedTabs = [];
let tabSwitchLog = [];
let windowFocusLog = [];
let examSessionId = null;
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

    // Handle PDF loading with error handling
    try {
      await loadPDF(data.pdf_link);
    } catch (pdfError) {
      console.error("PDF loading error:", pdfError);
      showNotification("PDF loading failed, but exam can continue", "warning");
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
    (pdfLink.includes("raw.githubusercontent.com") ||
      pdfLink.includes("drive.google.com"))
  ) {
    pdfCard.style.display = "block";
    pdfViewer.innerHTML =
      '<div class="text-center"><div class="spinner"></div><p>Loading PDF...</p></div>';

    try {
      // Use iframe to display PDF directly with error handling
      const iframe = document.createElement("iframe");
      iframe.src = pdfLink;
      iframe.width = "100%";
      iframe.height = "600px";
      iframe.style.border = "none";
      iframe.style.borderRadius = "12px";
      iframe.title = "Exam PDF Document";

      iframe.onload = function () {
        console.log("PDF loaded successfully");
      };

      iframe.onerror = function () {
        console.error("PDF iframe loading failed");
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
            <a href="${pdfLink}" target="_blank" class="btn btn-outline-primary btn-sm">
              <i class="fas fa-external-link-alt"></i> Open PDF in New Tab
            </a>
          </div>
        </div>
      `;

      pdfViewer.querySelector(".pdf-container").appendChild(iframe);
    } catch (error) {
      console.error("PDF Error:", error);
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

  // Log exam completion
  logWindowEvent("exam_completed", "Exam session completed");

  // Show detailed exam report modal
  showExamCompletionReport();
}

function showExamCompletionReport() {
  // Remove existing modal if any
  const existingModal = document.getElementById("examReportModal");
  if (existingModal) {
    existingModal.remove();
  }

  const totalExamTime = examStartTime
    ? Math.floor((Date.now() - examStartTime.getTime()) / 1000)
    : 0;
  const minutes = Math.floor(totalExamTime / 60);
  const seconds = totalExamTime % 60;

  const modal = document.createElement("div");
  modal.className = "modal fade show";
  modal.style.display = "block";
  modal.id = "examReportModal";
  modal.innerHTML = `
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content modern-modal">
        <div class="modal-header" style="background: var(--primary-gradient); color: white;">
          <i class="fas fa-chart-line" style="font-size: 1.5rem; margin-right: 0.5rem;"></i>
          <h5 class="modal-title">Exam Completion Report</h5>
        </div>
        <div class="modal-body">
          <!-- Basic Exam Info -->
          <div class="exam-summary">
            <h6><i class="fas fa-info-circle"></i> Exam Summary</h6>
            <div class="summary-item">
              <span class="label">Exam ID:</span>
              <span class="value">${currentExamId}</span>
            </div>
            <div class="summary-item">
              <span class="label">Total Questions:</span>
              <span class="value">${totalQuestions}</span>
            </div>
            <div class="summary-item">
              <span class="label">Total Time:</span>
              <span class="value">${minutes}m ${seconds}s</span>
            </div>
            <div class="summary-item">
              <span class="label">Session ID:</span>
              <span class="value" style="font-family: monospace; font-size: 0.8rem;">${examSessionId}</span>
            </div>
          </div>

          <!-- Security Report -->
          <div class="security-report mt-4">
            <h6><i class="fas fa-shield-alt"></i> Security Report</h6>
            <div class="summary-item">
              <span class="label">Tab Switches:</span>
              <span class="value" style="color: ${tabSwitchCount > 3 ? "var(--danger-color)" : tabSwitchCount > 0 ? "var(--warning-color)" : "var(--success-color)"}">
                ${tabSwitchCount} violations
              </span>
            </div>
            <div class="summary-item">
              <span class="label">New Tabs Opened:</span>
              <span class="value" style="color: ${openedTabs.length > 0 ? "var(--danger-color)" : "var(--success-color)"}">
                ${openedTabs.length} tabs
              </span>
            </div>
            <div class="summary-item">
              <span class="label">Window Events:</span>
              <span class="value">${windowFocusLog.length} events</span>
            </div>
          </div>

          <!-- Opened Tabs Details -->
          ${
            openedTabs.length > 0
              ? `
          <div class="opened-tabs mt-4">
            <h6><i class="fas fa-external-link-alt"></i> Opened Tabs/Windows</h6>
            <div class="tab-list" style="max-height: 200px; overflow-y: auto;">
              ${openedTabs
                .map(
                  (tab, index) => `
                <div class="tab-item" style="background: var(--gray-100); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
                  <div style="font-weight: 600; color: var(--danger-color);">#${index + 1} - ${tab.method}</div>
                  <div style="font-size: 0.9rem; color: var(--gray-600); margin: 4px 0;">
                    <i class="fas fa-link"></i> URL: <span style="font-family: monospace;">${tab.url}</span>
                  </div>
                  <div style="font-size: 0.8rem; color: var(--gray-500);">
                    <i class="fas fa-clock"></i> Time: ${new Date(tab.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
          `
              : ""
          }

          <!-- Tab Switch Timeline -->
          ${
            tabSwitchLog.length > 0
              ? `
          <div class="tab-switch-timeline mt-4">
            <h6><i class="fas fa-history"></i> Tab Switch Timeline</h6>
            <div class="timeline-list" style="max-height: 250px; overflow-y: auto;">
              ${tabSwitchLog
                .map(
                  (log, index) => `
                <div class="timeline-item" style="border-left: 3px solid var(--warning-color); padding-left: 12px; margin-bottom: 12px;">
                  <div style="font-weight: 600; color: var(--warning-color);">#${index + 1} - ${log.action}</div>
                  <div style="font-size: 0.9rem; color: var(--gray-600); margin: 4px 0;">
                    Question ${log.questionIndex + 1} | Time Remaining: ${Math.floor(log.timeRemaining / 60)}:${(log.timeRemaining % 60).toString().padStart(2, "0")}
                  </div>
                  <div style="font-size: 0.8rem; color: var(--gray-500);">
                    ${new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
          `
              : ""
          }

          <!-- Integrity Score -->
          <div class="integrity-score mt-4 p-3" style="background: ${getIntegrityColor()}; border-radius: 12px; text-align: center;">
            <h6 style="margin: 0; color: white;">
              <i class="fas fa-medal"></i> Exam Integrity Score
            </h6>
            <div style="font-size: 2rem; font-weight: bold; color: white; margin: 8px 0;">
              ${calculateIntegrityScore()}%
            </div>
            <div style="color: rgba(255,255,255,0.9); font-size: 0.9rem;">
              ${getIntegrityMessage()}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" onclick="downloadReport()">
            <i class="fas fa-download"></i> Download Report
          </button>
          <button type="button" class="btn-modern btn-primary" onclick="restartExam()">
            Take Another Exam
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function calculateIntegrityScore() {
  let score = 100;

  // Deduct points for tab switches
  score -= Math.min(tabSwitchCount * 10, 50);

  // Deduct points for opened tabs
  score -= Math.min(openedTabs.length * 15, 40);

  // Bonus for completing exam
  if (currentQuestionIndex >= totalQuestions - 1) {
    score += 5;
  }

  return Math.max(score, 0);
}

function getIntegrityColor() {
  const score = calculateIntegrityScore();
  if (score >= 90) return "var(--success-gradient)";
  if (score >= 70) return "var(--warning-color)";
  return "var(--danger-color)";
}

function getIntegrityMessage() {
  const score = calculateIntegrityScore();
  if (score >= 90) return "Excellent! No security violations detected.";
  if (score >= 70) return "Good, but some minor violations detected.";
  if (score >= 50) return "Fair, multiple violations detected.";
  return "Poor integrity - many security violations.";
}

function downloadReport() {
  const reportData = {
    examInfo: {
      examId: currentExamId,
      sessionId: examSessionId,
      totalQuestions: totalQuestions,
      completedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
    },
    securityReport: {
      tabSwitchCount: tabSwitchCount,
      openedTabsCount: openedTabs.length,
      integrityScore: calculateIntegrityScore(),
    },
    openedTabs: openedTabs,
    tabSwitchLog: tabSwitchLog,
    windowFocusLog: windowFocusLog,
  };

  const blob = new Blob([JSON.stringify(reportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `exam-report-${currentExamId}-${examSessionId}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showNotification("Report downloaded successfully!", "success");
}

// Restart exam
function restartExam() {
  location.reload();
}

// Enhanced Tab Switching Detection
function setupTabSwitchingDetection() {
  // Generate unique session ID
  examSessionId =
    "exam_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

  // Listen for visibility change events
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Listen for focus/blur events
  window.addEventListener("blur", handleWindowBlur);
  window.addEventListener("focus", handleWindowFocus);

  // Listen for beforeunload (tab closing/refreshing)
  window.addEventListener("beforeunload", handleBeforeUnload);

  // Track new windows/tabs opened
  trackNewWindows();

  // Track keyboard shortcuts that might open new tabs
  trackKeyboardShortcuts();

  // Initialize focus tracking
  logWindowEvent("exam_started", "Exam session started");
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
  const timeSpent = examStartTime
    ? Math.floor((Date.now() - examStartTime.getTime()) / 1000)
    : 0;

  console.log(`Tab Switch #${tabSwitchCount}: ${action} at ${timestamp}`);

  // Enhanced logging with more details
  const logEntry = {
    sessionId: examSessionId,
    examId: currentExamId,
    action: action,
    timestamp: timestamp,
    questionIndex: currentQuestionIndex,
    timeRemaining: timeRemaining,
    timeSpentInExam: timeSpent,
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    windowSize: `${window.innerWidth}x${window.innerHeight}`,
    documentTitle: document.title,
    currentUrl: window.location.href,
  };

  tabSwitchLog.push(logEntry);

  // Store in localStorage for tracking
  localStorage.setItem(
    `tabSwitchLog_${examSessionId}`,
    JSON.stringify(tabSwitchLog),
  );

  // Show warning if too many switches
  if (tabSwitchCount >= 3) {
    showSevereTabWarning();
  }
}

function logWindowEvent(action, details) {
  const timestamp = new Date().toISOString();
  const timeSpent = examStartTime
    ? Math.floor((Date.now() - examStartTime.getTime()) / 1000)
    : 0;

  const logEntry = {
    sessionId: examSessionId,
    examId: currentExamId,
    action: action,
    details: details,
    timestamp: timestamp,
    timeSpentInExam: timeSpent,
    questionIndex: currentQuestionIndex,
    timeRemaining: timeRemaining,
  };

  windowFocusLog.push(logEntry);
  localStorage.setItem(
    `windowFocusLog_${examSessionId}`,
    JSON.stringify(windowFocusLog),
  );
}

function trackNewWindows() {
  // Track window.open calls
  const originalOpen = window.open;
  window.open = function (url, name, features) {
    const newWindow = originalOpen.call(this, url, name, features);

    if (isExamActive) {
      const tabInfo = {
        url: url || "about:blank",
        name: name || "unnamed",
        features: features || "default",
        timestamp: new Date().toISOString(),
        method: "window.open",
      };

      openedTabs.push(tabInfo);
      logWindowEvent("new_window_opened", `New window opened: ${url}`);
      showNotification(`⚠️ New window detected: ${url}`, "warning");
    }

    return newWindow;
  };

  // Track links with target="_blank"
  document.addEventListener("click", function (e) {
    if (!isExamActive) return;

    const link = e.target.closest("a");
    if (link && link.target === "_blank") {
      const tabInfo = {
        url: link.href,
        name: link.target,
        timestamp: new Date().toISOString(),
        method: "link_click",
      };

      openedTabs.push(tabInfo);
      logWindowEvent("new_tab_from_link", `New tab from link: ${link.href}`);
      showNotification(`⚠️ New tab opened from link: ${link.href}`, "warning");
    }
  });
}

function trackKeyboardShortcuts() {
  document.addEventListener("keydown", function (e) {
    if (!isExamActive) return;

    // Common shortcuts that open new tabs/windows
    const shortcuts = [
      { keys: ["Control", "t"], action: "Ctrl+T (New Tab)" },
      { keys: ["Control", "n"], action: "Ctrl+N (New Window)" },
      { keys: ["Control", "Shift", "n"], action: "Ctrl+Shift+N (Incognito)" },
      { keys: ["Control", "Shift", "t"], action: "Ctrl+Shift+T (Restore Tab)" },
      { keys: ["Alt", "Tab"], action: "Alt+Tab (Switch App)" },
      { keys: ["Control", "Tab"], action: "Ctrl+Tab (Switch Tab)" },
      {
        keys: ["Control", "Shift", "Tab"],
        action: "Ctrl+Shift+Tab (Previous Tab)",
      },
    ];

    for (const shortcut of shortcuts) {
      if (isShortcutPressed(e, shortcut.keys)) {
        logWindowEvent("keyboard_shortcut", shortcut.action);
        showNotification(
          `⚠️ Keyboard shortcut detected: ${shortcut.action}`,
          "warning",
        );
        break;
      }
    }
  });
}

function isShortcutPressed(event, keys) {
  const pressedKeys = [];

  if (event.ctrlKey || event.metaKey) pressedKeys.push("Control");
  if (event.shiftKey) pressedKeys.push("Shift");
  if (event.altKey) pressedKeys.push("Alt");
  pressedKeys.push(event.key);

  return keys.every((key) => pressedKeys.includes(key));
}

function showTabSwitchWarning(type) {
  let message = "";

  switch (type) {
    case "tab_hidden":
      message = `⚠️ Warning: Tab switching detected! (${tabSwitchCount + 1} violations)`;
      break;
    case "tab_visible":
      message = `👁️ Tab focus restored. Please stay on the exam page.`;
      break;
    case "window_blur":
      message = `⚠️ Warning: Window focus lost! Stay focused on the exam.`;
      break;
    case "window_focus":
      message = `✅ Window focus restored.`;
      break;
  }

  showNotification(
    message,
    type.includes("visible") || type.includes("focus") ? "info" : "warning",
  );
}

function showSevereTabWarning() {
  const existingModal = document.getElementById("severeWarningModal");
  if (existingModal) {
    existingModal.remove();
  }

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
