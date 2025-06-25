// === SMART QR ATTENDANCE – FULLY RESTORED ADMIN.JS ===
// Copy-paste version – Full functionality, zero missing features.

const qs = id => document.getElementById(id);

// DOM Elements
const startBtn = qs("btn-start-scan");
const stopBtn = qs("stop-scan");
const toggleCameraBtn = qs("toggle-camera");
const scannerPlaceholder = qs("scanner-placeholder");
const scannerAnimation = qs("scanner-animation");
const presentCountEl = qs("present-count");
const classCountInput = qs("class-count");
const toggleThemeBtn = qs("btn-toggle-theme");
const loader = qs("loading-overlay");
const saveScheduleBtn = qs("btn-save-schedule");
const classScheduleBody = qs("class-schedule-body");
const attendanceTableBody = qs("attendance-table-body");
const leaderboardBody = qs("leaderboard");

let html5QrCode = null;
let cameraDevices = [];
let currentDeviceIndex = 0;
let studentDetails = JSON.parse(localStorage.getItem("studentDetails") || "{}");
let attendanceData = JSON.parse(localStorage.getItem("attendanceData") || "{}");
let totalClasses = parseInt(localStorage.getItem("totalClasses")) || 7;
let lastScannedRoll = null;
let lastScannedTime = 0;

function playSound(id) {
  const sound = qs(id);
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }
}

function showToast(message, duration = 3000) {
  const toast = qs("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration);
}

function toggleScannerAnimation(show = true) {
  if (scannerAnimation) {
    if (show) {
      scannerAnimation.classList.remove("hidden");
      scannerAnimation.classList.add("active");
    } else {
      scannerAnimation.classList.add("hidden");
      scannerAnimation.classList.remove("active");
    }
  }
}


function updatePresentCount() {
  presentCountEl.textContent = `Present: ${Object.keys(attendanceData).length}`;
}

function updateLeaderboard() {
  leaderboardBody.innerHTML = "";
  Object.entries(studentDetails).forEach(([roll, s]) => {
    const attended = attendanceData[roll]?.attended || 0;
    const percent = totalClasses ? ((attended / totalClasses) * 100).toFixed(1) : "0.0";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${roll}</td>
      <td>${s.name}</td>
      <td>${s.dept}</td>
      <td>${attended}/${totalClasses}</td>
      <td>${attendanceData[roll]?.lastScanned || "-"}</td>
      <td>${percent}%</td>
    `;
    leaderboardBody.appendChild(row);
  });
  updatePresentCount();
}

function handleScanSuccess(decodedText) {
  try {
    const student = JSON.parse(decodedText);
    const now = new Date();
    const timestamp = now.getTime();
    const roll = student.roll.trim();

    if (roll === lastScannedRoll && (timestamp - lastScannedTime) < 3000) return;
    lastScannedRoll = roll;
    lastScannedTime = timestamp;

    if ((attendanceData[roll]?.attended || 0) >= totalClasses) {
      showToast(`${student.name} already attended all classes.`);
      playSound("sound-scan-error");
      return;
    }

    studentDetails[roll] = { name: student.name.trim(), dept: student.dept.trim() };
    attendanceData[roll] = attendanceData[roll] || { attended: 0 };
    attendanceData[roll].attended++;
    attendanceData[roll].lastScanned = now.toLocaleString();

    localStorage.setItem("studentDetails", JSON.stringify(studentDetails));
    localStorage.setItem("attendanceData", JSON.stringify(attendanceData));
 const todayKey = `attendance_${new Date().toISOString().split("T")[0]}`;
const todayLog = JSON.parse(localStorage.getItem(todayKey) || "{}");
todayLog[roll] = {
  name: student.name.trim(),
  dept: student.dept.trim(),
  timestamp: now.toLocaleString()
};
localStorage.setItem(todayKey, JSON.stringify(todayLog));

    updateLeaderboard();
    showToast(`${student.name} marked present`);
    playSound("sound-scan-success");
  } catch (e) {
    showToast("Invalid QR Code");
    playSound("sound-scan-error");
  }
 
}

async function startScanner(deviceId = null) {
  try {
    scannerPlaceholder?.classList.add("hidden");
    toggleScannerAnimation(true);
    playSound("sound-button");

    if (!html5QrCode) html5QrCode = new Html5Qrcode("scanner");
    if (!cameraDevices.length) cameraDevices = await Html5Qrcode.getCameras();

    // ✅ Prefer back camera on mobile if available
    const backCamera = cameraDevices.find(cam =>
      cam.label.toLowerCase().includes("back")
    );

    const selectedId = deviceId || backCamera?.id || cameraDevices[0]?.id;
    if (!selectedId) throw new Error("No camera found");

    await html5QrCode.start(
      { deviceId: { exact: selectedId } },
      {
        fps: 10,
        qrbox: function(viewfinderWidth, viewfinderHeight) {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: minEdge * 0.6,
            height: minEdge * 0.6
          };
        },
        aspectRatio: 1
      },
      handleScanSuccess,
      error => console.warn("Scan error", error)
    );

    stopBtn.classList.remove("hidden");
    toggleCameraBtn.classList.remove("hidden");

  } catch (error) {
    console.error(error);
    showToast("Camera error: " + error.message);
    toggleScannerAnimation(false);
    scannerPlaceholder?.classList.remove("hidden");
  }
}


startBtn?.addEventListener("click", () => startScanner());

stopBtn?.addEventListener("click", async () => {
  if (html5QrCode?.isScanning) {
    await html5QrCode.stop();
    await html5QrCode.clear();
    toggleScannerAnimation(false);
    scannerPlaceholder?.classList.remove("hidden");
    stopBtn.classList.add("hidden");
    toggleCameraBtn.classList.add("hidden");
    playSound("sound-button");
  }
});

toggleCameraBtn?.addEventListener("click", async () => {
  if (!cameraDevices.length) cameraDevices = await Html5Qrcode.getCameras();
  currentDeviceIndex = (currentDeviceIndex + 1) % cameraDevices.length;

  if (html5QrCode?.isScanning) {
    await html5QrCode.stop();
    await html5QrCode.clear();
  }

  await startScanner(cameraDevices[currentDeviceIndex].id);
});

// === Export, Reset, Theme, FAB, Search, Init etc. will be appended next ===
// === EXPORT & RESET ===

// Export CSV Helper
function exportCSV(filename, rows) {
  const content = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast(`Exported ${filename}`);
  playSound("sound-button");
}

// Export Students
qs("btn-export-students")?.addEventListener("click", () => {
  exportCSV("students.csv", [
    ["Roll", "Name", "Dept"],
    ...Object.entries(studentDetails).map(([r, s]) => [r, s.name, s.dept])
  ]);
});

// Export Attendance
qs("btn-export-attendance")?.addEventListener("click", () => {
  exportCSV("attendance.csv", [
    ["Roll", "Name", "Attended", "Last Scanned"],
    ...Object.entries(attendanceData).map(([r, a]) => [
      r,
      studentDetails[r]?.name || "Unknown",
      a.attended,
      a.lastScanned || "-"
    ])
  ]);
});

// Export JSON
qs("btn-export-json")?.addEventListener("click", () => {
  const json = JSON.stringify({ studentDetails, attendanceData }, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("Exported JSON");
  playSound("sound-button");
});

// Reset Attendance
qs("btn-reset-attendance")?.addEventListener("click", () => {
  if (!confirm("Are you sure you want to reset all attendance?")) return;
  studentDetails = {};
  attendanceData = {};
  localStorage.removeItem("studentDetails");
  localStorage.removeItem("attendanceData");
  updateLeaderboard();
  showToast("Attendance reset");
  playSound("sound-reset");
});
// === FAB (Floating Action Button) ===
qs("fab-main")?.addEventListener("click", () => {
  qs("fab-options")?.classList.toggle("hidden");
  playSound("sound-button");
});

qs("fab-add")?.addEventListener("click", () => qs("btn-add-student")?.click());
qs("fab-export")?.addEventListener("click", () => qs("btn-export-json")?.click());
qs("fab-reset")?.addEventListener("click", () => qs("btn-reset-attendance")?.click());
qs("fab-theme")?.addEventListener("click", () => qs("btn-toggle-theme")?.click());

// === Theme Toggle ===
function loadDarkMode() {
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
  // Theme Toggle
document.getElementById("btn-toggle-theme")?.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("darkMode", isDark);
});

// Load theme on page load
window.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
  }
});

}

toggleThemeBtn?.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
  playSound("sound-button");
});


// === Add Student ===
qs("btn-add-student")?.addEventListener("click", () => {
  const roll = prompt("Enter Roll Number:");
  const name = prompt("Enter Name:");
  const dept = prompt("Enter Department:");
  if (roll && name && dept) {
    studentDetails[roll] = { name, dept };
    localStorage.setItem("studentDetails", JSON.stringify(studentDetails));
    updateLeaderboard();
    showToast(`Student ${name} added`);
    playSound("sound-button");
  } else {
    showToast("Incomplete details");
    playSound("sound-scan-error");
  }
});

// === Class Count Control ===
classCountInput?.addEventListener("change", () => {
  const val = parseInt(classCountInput.value);
  if (val > 0) {
    totalClasses = val;
    localStorage.setItem("totalClasses", val);
    updateLeaderboard();
    playSound("sound-button");
  } else {
    showToast("Invalid class count");
    playSound("sound-scan-error");
  }
});

// === Schedule Rendering and Save ===
function generateDefaultTimes() {
  const times = [];
  let hour = 9, minute = 0;
  for (let i = 0; i < 7; i++) {
    times.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`);
    minute += 40;
    if (minute >= 60) {
      minute -= 60;
      hour++;
    }
  }
  return times;
}

function renderSchedule(schedule = []) {
  classScheduleBody.innerHTML = "";
  const defaultTimes = generateDefaultTimes();
  for (let i = 0; i < 7; i++) {
    const row = schedule[i] || {
      lecture: `Lecture ${i + 1}`,
      time: defaultTimes[i],
      subject: "",
      faculty: "",
      present: ""
    };
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.lecture}</td>
      <td><input type="text" value="${row.time}" /></td>
      <td><input type="text" value="${row.subject}" /></td>
      <td><input type="text" value="${row.faculty}" /></td>
      <td><input type="number" value="${row.present}" min="0" /></td>
    `;
    classScheduleBody.appendChild(tr);
  }
}

function loadSchedule() {
  const saved = JSON.parse(localStorage.getItem("dailySchedule") || "[]");
  renderSchedule(saved);
}

saveScheduleBtn?.addEventListener("click", () => {
  const rows = classScheduleBody.querySelectorAll("tr");
  const schedule = [];
  rows.forEach((row, i) => {
    const inputs = row.querySelectorAll("input");
    schedule.push({
      lecture: `Lecture ${i + 1}`,
      time: inputs[0].value,
      subject: inputs[1].value,
      faculty: inputs[2].value,
      present: inputs[3].value
    });
  });
  localStorage.setItem("dailySchedule", JSON.stringify(schedule));
  showToast("Schedule saved");
  playSound("sound-button");
});
// === Live Clock ===
function updateLiveClock() {
  const timeEl = qs("live-time");
  const dateEl = qs("live-date");
  const now = new Date();
  const time = now.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString("en-IN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (timeEl) timeEl.textContent = time;
  if (dateEl) dateEl.textContent = date;
}
setInterval(updateLiveClock, 1000);
updateLiveClock();

// === Filter Attendance by % ===
qs("filter-attendance")?.addEventListener("change", e => {
  const filter = e.target.value;
  const tbody = qs("leaderboard");
  if (!tbody) return;

  Array.from(tbody.children).forEach(row => {
    const percent = parseFloat(row.cells[5]?.textContent || 0);
    switch (filter) {
      case "all": row.style.display = ""; break;
      case "above75": row.style.display = percent >= 75 ? "" : "none"; break;
      case "below50": row.style.display = percent <= 50 ? "" : "none"; break;
      case "exact100": row.style.display = percent === 100 ? "" : "none"; break;
    }
  });
});

// === Sort Leaderboard by Attendance % ===
qs("sort-attendance")?.addEventListener("click", () => {
  const tbody = qs("leaderboard");
  if (!tbody) return;
  const rows = Array.from(tbody.children);
  rows.sort((a, b) => {
    const pa = parseFloat(a.cells[5]?.textContent || 0);
    const pb = parseFloat(b.cells[5]?.textContent || 0);
    return pb - pa;
  });
  rows.forEach(r => tbody.appendChild(r));
  showToast("Sorted by attendance%");
  playSound("sound-button");
});

// === Tab Navigation ===
document.querySelectorAll(".nav-item").forEach(tab => {
  tab.addEventListener("click", () => {
    playSound("sound-tab");
    document.querySelectorAll(".nav-item").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    const targetId = tab.dataset.tab;
    if (targetId === "logout") {
      localStorage.removeItem("loggedIn");
      window.location.href = "login.html";
      return;
    }

    tab.classList.add("active");
    const content = qs(targetId);
    if (content) {
      loader?.classList.remove("hidden");
      setTimeout(() => {
        loader?.classList.add("hidden");
        content.classList.add("active");
        if (targetId === "analytics") renderCharts?.();
        if (targetId === "history") renderHistoryTable?.();
        if (targetId === "classes") loadSchedule();
      }, 600);
    }
  });
});

// === Init Load ===
window.addEventListener("DOMContentLoaded", () => {
  loadDarkMode();
  updateLeaderboard();
  loadSchedule();
  updateLiveClock();
});
function updateStudentDetailsTable() {
  const tbody = qs("student-details-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  Object.entries(studentDetails).forEach(([roll, s]) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${roll}</td>
      <td>${s.name}</td>
      <td>${s.dept}</td>
    `;
    tbody.appendChild(row);
  });
}
function renderHistoryTable() {
  const date = document.getElementById("history-from-date").value ||
               new Date().toISOString().split("T")[0];

  const tbody = document.getElementById("history-body");
  const history = JSON.parse(localStorage.getItem(`attendance_${date}`) || "{}");

  tbody.innerHTML = "";

  if (!Object.keys(history).length) {
    tbody.innerHTML = `<tr><td colspan="5">No history found for ${date}.</td></tr>`;
    return;
  }

  for (const [roll, entry] of Object.entries(history)) {
    const [d, t] = entry.timestamp.split(", ");
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${roll}</td>
      <td>${entry.name}</td>
      <td>${entry.dept}</td>
      <td>${d}</td>
      <td>${t}</td>
    `;
    tbody.appendChild(row);
  }
}

updateStudentDetailsTable();
renderHistoryTable();
if (targetId === "history") renderHistoryTable();
function toggleScannerAnimation(show = true) {
  scannerAnimation?.classList.toggle("hidden", !show);
}
function renderHistoryTable() {
  const tbody = document.getElementById("history-body");
  const today = new Date().toISOString().split("T")[0];
  const history = JSON.parse(localStorage.getItem(`attendance_${today}`) || "{}");

  tbody.innerHTML = "";

  if (!Object.keys(history).length) {
    tbody.innerHTML = `<tr><td colspan="5">No history found today.</td></tr>`;
    return;
  }

  Object.entries(history).forEach(([roll, info]) => {
    const [date, time] = info.timestamp.split(", ");
    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="Roll Number">${roll}</td>
  <td data-label="Name">${s.name}</td>
  <td data-label="Department">${s.dept}</td>
  <td data-label="Classes Attended">${attended}/${totalClasses}</td>
  <td data-label="Last Scanned">${attendanceData[roll]?.lastScanned || "-"}</td>
  <td data-label="Attendance %">${percent}%</td>
`;
    tbody.appendChild(row);
  });
}
toggleScannerAnimation(true);  // when scan starts
toggleScannerAnimation(false); // when scan stops
// === DARK MODE TOGGLE ===
function loadTheme() {
  const darkMode = localStorage.getItem("darkMode") === "true";
  document.body.classList.toggle("dark-mode", darkMode);
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", isDark);
}

document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  document.getElementById("btn-toggle-theme")?.addEventListener("click", toggleTheme);
});
document.addEventListener("DOMContentLoaded", () => {
  const btnTheme = document.getElementById("btn-toggle-theme");
  const isDark = localStorage.getItem("darkMode") === "true";

  if (isDark) document.body.classList.add("dark-mode");

  btnTheme?.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
  });
});
// === DARK MODE TOGGLE ===
window.addEventListener("DOMContentLoaded", () => {
  const themeToggleBtn = document.getElementById("btn-toggle-theme");

  // Apply saved theme
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
  }

  // Listen for toggle button click
  themeToggleBtn?.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", isDark.toString());
  });
});
document.getElementById("btn-clear-history")?.addEventListener("click", () => {
  const today = new Date().toISOString().split("T")[0];
  localStorage.removeItem(`attendance_${today}`);
  renderHistoryTable();
  alert("Today's history cleared.");
});
document.getElementById("btn-export-history")?.addEventListener("click", () => {
  const today = new Date().toISOString().split("T")[0];
  const history = JSON.parse(localStorage.getItem(`attendance_${today}`) || "{}");

  if (Object.keys(history).length === 0) {
    alert("No history to export.");
    return;
  }

  let csv = "Roll No,Name,Department,Date,Time\n";
  for (const [roll, info] of Object.entries(history)) {
    const [date, time] = info.timestamp.split(", ");
    csv += `${roll},${info.name},${info.dept},${date},${time}\n`;
  }

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance_history_${today}.csv`;
  a.click();
});
document.getElementById("btn-clear-history")?.addEventListener("click", () => {
  const date = document.getElementById("history-from-date").value ||
               new Date().toISOString().split("T")[0];

  const key = `attendance_${date}`;
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    alert(`History for ${date} cleared.`);
    renderHistoryTable(); // Refresh
  } else {
    alert("No history found for selected date.");
  }
});
document.getElementById("btn-export-history")?.addEventListener("click", () => {
  const date = document.getElementById("history-from-date").value ||
               new Date().toISOString().split("T")[0];

  const history = JSON.parse(localStorage.getItem(`attendance_${date}`) || "{}");

  if (!Object.keys(history).length) {
    alert("No history found for selected date.");
    return;
  }

  let csv = "Roll No,Name,Department,Date,Time\n";
  for (const [roll, entry] of Object.entries(history)) {
    const [d, t] = entry.timestamp.split(", ");
    csv += `${roll},${entry.name},${entry.dept},${d},${t}\n`;
  }

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `history_${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});
document.addEventListener("DOMContentLoaded", () => {
  const clearBtn = document.getElementById("btn-clear-history");
  const exportBtn = document.getElementById("btn-export-history");
  const dateInput = document.getElementById("history-from-date");
  const tbody = document.getElementById("history-body");

  function getSelectedDate() {
    return dateInput?.value || new Date().toISOString().split("T")[0];
  }

  function renderHistoryTable(date) {
    const history = JSON.parse(localStorage.getItem(`attendance_${date}`) || "{}");
    tbody.innerHTML = "";

    if (!Object.keys(history).length) {
      tbody.innerHTML = `<tr><td colspan="5">No history for ${date}.</td></tr>`;
      return;
    }

    for (const [roll, info] of Object.entries(history)) {
      const [d, t] = info.timestamp.split(", ");
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${roll}</td>
        <td>${info.name}</td>
        <td>${info.dept}</td>
        <td>${d}</td>
        <td>${t}</td>
      `;
      tbody.appendChild(row);
    }
  }

  // ✅ Clear History
  clearBtn?.addEventListener("click", () => {
    const date = getSelectedDate();
    const key = `attendance_${date}`;
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      renderHistoryTable(date);
    }
  });

  // ✅ Export History CSV
  exportBtn?.addEventListener("click", () => {
    const date = getSelectedDate();
    const history = JSON.parse(localStorage.getItem(`attendance_${date}`) || "{}");

    if (!Object.keys(history).length) {
      return;
    }

    let csv = "Roll No,Name,Department,Date,Time\n";
    for (const [roll, info] of Object.entries(history)) {
      const [d, t] = info.timestamp.split(", ");
      csv += `${roll},${info.name},${info.dept},${d},${t}\n`;
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_history_${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // 🔄 Automatically load today's history on page load
  const initialDate = getSelectedDate();
  if (tbody) renderHistoryTable(initialDate);

  // 🔁 Change date = update table
  dateInput?.addEventListener("change", () => {
    renderHistoryTable(getSelectedDate());
  });
});
