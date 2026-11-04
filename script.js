
"use strict";

// Select HTML elements
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const emptyTitle = document.getElementById("emptyTitle");
const emptyText = document.getElementById("emptyText");
const taskMessage = document.getElementById("taskMessage");

const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const completedCount = document.getElementById("completedCount");

const progressBar = document.getElementById("progressBar");
const progressLabel = document.getElementById("progressLabel");
const progressTrack = document.getElementById("progressTrack");

const themeBtn = document.getElementById("themeBtn");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const filterButtons = document.querySelectorAll(".filter");

const quoteBtn = document.getElementById("quoteBtn");
const quoteText = document.getElementById("quoteText");
const quoteAuthor = document.getElementById("quoteAuthor");

// Application state
const TASKS_KEY = "taskflow_tasks_v1";
const THEME_KEY = "taskflow_theme_v1";

let tasks = loadTasks();
let currentFilter = "all";
let messageTimeout;

// Read tasks safely from browser storage
function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");

    if (!Array.isArray(saved)) return [];

    return saved
      .filter(task =>
        task &&
        typeof task.id === "string" &&
        typeof task.text === "string" &&
        typeof task.completed === "boolean"
      )
      .map(task => ({
        id: task.id,
        text: task.text.slice(0, 150),
        completed: task.completed,
        createdAt: typeof task.createdAt === "string"
          ? task.createdAt
          : new Date().toISOString()
      }));
  } catch (error) {
    console.error("Could not load tasks:", error);
    return [];
  }
}

// Save tasks
function saveTasks() {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Could not save tasks:", error);
    showMessage("Could not save data. Check browser storage.");
    return false;
  }
}

// Show a temporary status message
function showMessage(message) {
  taskMessage.textContent = message;
  clearTimeout(messageTimeout);

  messageTimeout = setTimeout(() => {
    taskMessage.textContent = "";
  }, 3000);
}

// Format task creation date
function formatDate(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Recently added";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

// Create a safe task element
function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = `task-item${task.completed ? " done" : ""}`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.checked = task.completed;
  checkbox.dataset.action = "toggle";
  checkbox.dataset.id = task.id;
  checkbox.setAttribute("aria-label", `Complete ${task.text}`);

  const content = document.createElement("div");
  content.className = "task-text";
  content.textContent = task.text;

  const time = document.createElement("span");
  time.className = "task-time";
  time.textContent = formatDate(task.createdAt);
  content.appendChild(time);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "×";
  deleteBtn.dataset.action = "delete";
  deleteBtn.dataset.id = task.id;
  deleteBtn.setAttribute("aria-label", `Delete ${task.text}`);
  deleteBtn.title = "Delete task";

  li.append(checkbox, content, deleteBtn);

  return li;
}

// Render tasks according to the selected filter
function renderTasks() {
  const visibleTasks = tasks.filter(task => {
    if (currentFilter === "pending") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });

  // Build the visible list
  const fragment = document.createDocumentFragment();

  for (const task of visibleTasks) {
    fragment.appendChild(createTaskElement(task));
  }

  taskList.replaceChildren(fragment);

  // Empty state
  emptyState.hidden = visibleTasks.length > 0;

  if (tasks.length === 0) {
    emptyTitle.textContent = "Nothing on your list yet";
    emptyText.textContent = "Add your first task above to get started.";
  } else if (visibleTasks.length === 0) {
    emptyTitle.textContent = "No matching tasks";
    emptyText.textContent = "Try another filter to see your tasks.";
  }

  // Update counters
  const completed = tasks.filter(task => task.completed).length;
  const pending = tasks.length - completed;
  const percentage = tasks.length === 0
    ? 0
    : Math.round((completed / tasks.length) * 100);

  totalCount.textContent = tasks.length;
  pendingCount.textContent = pending;
  completedCount.textContent = completed;

  progressBar.style.width = `${percentage}%`;
  progressLabel.textContent = `${percentage}% complete`;
  progressTrack.setAttribute("aria-valuenow", percentage);

  clearCompletedBtn.disabled = completed === 0;
  clearCompletedBtn.style.opacity = completed === 0 ? "0.45" : "1";
}

// Add a new task
taskForm.addEventListener("submit", event => {
  event.preventDefault();

  const text = taskInput.value.trim();

  if (!text) {
    showMessage("Please enter a task first.");
    taskInput.focus();
    return;
  }

  if (text.length > 150) {
    showMessage("Keep your task within 150 characters.");
    return;
  }

  const task = {
    id: globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text,
    completed: false,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(task);

  // If storage fails, keep the current UI usable
  saveTasks();
  currentFilter = "all";
  updateActiveFilter();
  renderTasks();

  taskInput.value = "";
  taskInput.focus();
  showMessage("Task added successfully!");
});

// Handle checkbox and delete clicks using event delegation
taskList.addEventListener("change", event => {
  const checkbox = event.target.closest('[data-action="toggle"]');
  if (!checkbox) return;

  const task = tasks.find(item => item.id === checkbox.dataset.id);
  if (!task) return;

  task.completed = checkbox.checked;
  saveTasks();
  renderTasks();

  showMessage(task.completed
    ? "Great job! Task completed."
    : "Task moved back to pending.");
});

taskList.addEventListener("click", event => {
  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;

  const task = tasks.find(item => item.id === button.dataset.id);
  if (!task) return;

  tasks = tasks.filter(item => item.id !== button.dataset.id);
  saveTasks();
  renderTasks();
  showMessage("Task deleted.");
});

// Filter buttons
function updateActiveFilter() {
  filterButtons.forEach(button => {
    const isActive = button.dataset.filter === currentFilter;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    updateActiveFilter();
    renderTasks();
  });
});

// Remove all completed tasks
clearCompletedBtn.addEventListener("click", () => {
  const completed = tasks.filter(task => task.completed).length;

  if (completed === 0) return;

  const confirmed = confirm(
    `Delete all ${completed} completed task(s)?`
  );

  if (!confirmed) return;

  tasks = tasks.filter(task => !task.completed);
  saveTasks();
  renderTasks();
  showMessage("Completed tasks cleared.");
});

// Dark mode
function applyTheme(theme) {
  const isDark = theme === "dark";

  document.body.classList.toggle("dark", isDark);
  themeBtn.textContent = isDark ? "☀️" : "🌙";
  themeBtn.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode"
  );
}

function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

applyTheme(loadTheme());

themeBtn.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark")
    ? "light"
    : "dark";

  applyTheme(nextTheme);

  try {
    localStorage.setItem(THEME_KEY, nextTheme);
  } catch (error) {
    console.error("Could not save theme:", error);
  }
});

// Display today's date
document.getElementById("todayDate").textContent =
  new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

// Fetch API: load a random inspirational quote
quoteBtn.addEventListener("click", async () => {
  quoteBtn.disabled = true;
  quoteBtn.textContent = "Loading...";

  try {
    const response = await fetch("https://dummyjson.com/quotes/random");

    if (!response.ok) {
      throw new Error("Quote request failed");
    }

    const data = await response.json();

    if (!data.quote) {
      throw new Error("No quote returned");
    }

    quoteText.textContent = data.quote;
    quoteAuthor.textContent = `— ${data.author || "Unknown"}`;
  } catch (error) {
    console.error("Could not fetch quote:", error);
    showMessage("Could not load a quote. Check your internet connection.");
  } finally {
    quoteBtn.disabled = false;
    quoteBtn.textContent = "New quote ↗";
  }
});

// Initial render
updateActiveFilter();
renderTasks();