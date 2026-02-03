const input = document.getElementById("taskInput");
const dateInput = document.getElementById("dateInput");
const searchInput = document.getElementById("searchInput");
const addBtn = document.getElementById("addBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const list = document.getElementById("taskList");
const counter = document.getElementById("counter");
const filters = document.querySelectorAll(".filters button");

let currentFilter = "all";
let draggedId = null;
let currentSort = "none";
let searchQuery = "";
let currentDeadlineFilter = "all";
let deadlineStatus = "none";
const initialTasks = [
  {
    id: 1,
    text: "Сделать зарядку",
    done: false,
    important: false,
    deferred: false,
    deadline: null,
  },
  {
    id: 2,
    text: "Выпить воду",
    done: true,
    important: false,
    deferred: false,
    deadline: null,
  },
  {
    id: 3,
    text: "Прочитать новости",
    done: false,
    important: false,
    deferred: false,
    deadline: null,
  },
];
let historyState = loadHistoryFromStorage();
let state = {
  past: [], // прошлые состояния
  present: [], // текущее состояние (tasks)
  future: [], // будущие состояния (для redo)
};
// Добавление задачи
function addTask(tasks, text, deadline = null) {
  const newTask = {
    id: Date.now(),
    text: text,
    done: false,
    important: false,
    deferred: false,
    deadline: deadline,
  };
  return [...tasks, newTask];
}
function toggleTask(tasks, id) {
  return tasks.map((task) => {
    if (task.id === id) {
      return { ...task, done: !task.done };
    }
    return task;
  });
}
function deleteTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}
function saveHistoryToStorage() {
  localStorage.setItem("todo-history", JSON.stringify(historyState));
}
function getDeadlineStatus(deadline) {
  if (!deadline) return "none";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(deadline);
  date.setHours(0, 0, 0, 0);

  const diffDays = Math.round((date - today) / 86400000);

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  return "future";
}

function updateTasks(tasks, action) {
  switch (action.type) {
    case "ADD":
      return addTask(tasks, action.payload.text, action.payload.deadline);
    case "TOGGLE":
      return toggleTask(tasks, action.payload);

    case "DELETE":
      return deleteTask(tasks, action.payload);
    case "EDIT":
      return tasks.map((task) =>
        task.id === action.payload.id
          ? { ...task, text: action.payload.text }
          : task,
      );
    case "TOGGLE_IMPORTANT":
      return tasks.map((task) =>
        task.id === action.payload
          ? { ...task, important: !task.important }
          : task,
      );

    case "TOGGLE_DEFERRED":
      return tasks.map((task) =>
        task.id === action.payload
          ? { ...task, deferred: !task.deferred }
          : task,
      );

    default:
      return tasks;
  }
}
function dispatch(action) {
  const newPresent = updateTasks(historyState.present, action);
  historyState = {
    past: [...historyState.past, historyState.present],
    present: newPresent,
    future: [],
  };

  tasks = historyState.present;
  saveHistoryToStorage();
  render();
}
function undo() {
  if (historyState.past.length === 0) return;

  const previous = historyState.past.at(-1);
  const newPast = historyState.past.slice(0, -1);

  historyState = {
    past: newPast,
    present: previous,
    future: [historyState.present, ...historyState.future],
  };

  tasks = historyState.present;
  saveHistoryToStorage();
  render();
}

function redo() {
  if (historyState.future.length === 0) return;

  const next = historyState.future[0];
  const newFuture = historyState.future.slice(1);

  historyState = {
    past: [...historyState.past, historyState.present],
    present: next,
    future: newFuture,
  };

  tasks = historyState.present;
  saveHistoryToStorage();
  render();
}
addBtn.addEventListener("click", () => {
  const text = input.value.trim();
  const deadline = dateInput.value || null;

  if (!text) return;

  dispatch({
    type: "ADD",
    payload: { text, deadline },
  });

  input.value = "";
  dateInput.value = "";
});

input.addEventListener("keyup", (event) => {
  if (event.key === "Enter") {
    const text = input.value.trim();
    if (text === "") return;
    dispatch({ type: "ADD", payload: text });
    input.value = "";
  }
});
searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  render();
});
// Отрисовка списка
function render() {
  console.log("FILTER:", currentFilter);
  console.log("DEADLINE:", currentDeadlineFilter);
  const tasks = [...historyState.present]; // ← локальная ссылка на state берем копию
  let visibleTasks = tasks;

  list.innerHTML = "";
  // применяем фильтр
  switch (currentFilter) {
    case "active":
      visibleTasks = visibleTasks.filter((t) => !t.done);
      break;
    case "done":
      visibleTasks = visibleTasks.filter((t) => t.done);
      break;
    case "important":
      visibleTasks = visibleTasks.filter((t) => t.important);
      break;
    case "deferred":
      visibleTasks = visibleTasks.filter((t) => t.deferred);
      break;
    case "all":
    default:
      // ничего не делаем
      break;
  }
  if (currentDeadlineFilter && currentDeadlineFilter !== "all") {
    visibleTasks = visibleTasks.filter((task) => {
      const deadlineStatus = getDeadlineStatus(task.deadline);
      return deadlineStatus === currentDeadlineFilter;
    });
  }
  // фильтр по поиску
  if (searchQuery !== "") {
    visibleTasks = visibleTasks.filter((task) =>
      task.text.toLowerCase().includes(searchQuery),
    );
  }
  if (currentSort === "status") {
    visibleTasks.sort((a, b) => a.done - b.done);
  }

  if (currentSort === "alpha") {
    visibleTasks.sort((a, b) => a.text.localeCompare(b.text, "ru"));
  }
  if (currentSort === "deadline") {
    visibleTasks.sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });
  }
  visibleTasks.forEach((task) => {
    const li = document.createElement("li");
    const deadlineStatus = getDeadlineStatus(task.deadline);
    li.dataset.deadline = deadlineStatus;
    const starBtn = document.createElement("button");
    starBtn.textContent = task.important ? "⭐" : "☆";
    starBtn.className = task.important ? "important" : "noimportant";
    starBtn.title = "Отметить как важную";

    starBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dispatch({ type: "TOGGLE_IMPORTANT", payload: task.id });
    });

    const deferBtn = document.createElement("button");
    deferBtn.textContent = task.deferred ? "⏰" : "🕒";
    deferBtn.className = task.deferred ? "deferred" : "nodeferred";
    deferBtn.title = "Отложить";

    deferBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dispatch({ type: "TOGGLE_DEFERRED", payload: task.id });
    });

    li.draggable = true;
    li.dataset.id = task.id;
    li.addEventListener("dragstart", (e) => {
      draggedId = li.dataset.id;
      li.classList.add("dragging");
    });

    li.addEventListener("dragend", () => {
      li.classList.remove("dragging");
    });

    const textSpan = document.createElement("span");
    textSpan.textContent = task.text;
    textSpan.className = "task-text";
    const meta = document.createElement("div");
    meta.className = "task-meta";

    const dateSpan = document.createElement("span");
    dateSpan.className = "task-date";
    dateSpan.textContent = String(10);

    meta.append(dateSpan);
    const statusSpan = document.createElement("span");
    meta.append(statusSpan);

    li.dataset.deadline = deadlineStatus;

    if (deadlineStatus === "overdue") {
      statusSpan.className = "task-status overdue";
      statusSpan.textContent = "Просрочено";
    }
    if (deadlineStatus === "today") {
      statusSpan.className = "task-status today";
      statusSpan.textContent = "Сегодня";
    }
    if (deadlineStatus === "tomorrow") {
      statusSpan.className = "task-status tomorrow";
      statusSpan.textContent = "Завтра";
    }
    if (deadlineStatus === "future") {
      statusSpan.className = "task-status future";
      statusSpan.textContent = "Будущее";
    }
    if (task.deadline) {
      const d = new Date(task.deadline);
      dateSpan.textContent = `до ${d.toLocaleDateString("ru-RU")}`;
    } else {
      dateSpan.textContent = "";
    }
    statusSpan.classList.add("deadline-status", deadlineStatus);
    // отметка выполнено
    if (task.done) {
      li.classList.add("done");
    }

    if (task.important) {
      li.classList.add("important");
    }

    if (task.deferred) {
      li.classList.add("deferred");
    }

    // кнопка удаления
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "×";
    deleteBtn.className = "delete";

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dispatch({ type: "DELETE", payload: task.id });
    });
    const inputCheckbox = document.createElement("input");
    inputCheckbox.type = "checkbox";
    inputCheckbox.checked = task.done;
    inputCheckbox.className = "task-checkbox";

    inputCheckbox.addEventListener("click", (e) => {
      e.stopPropagation();
      dispatch({ type: "TOGGLE", payload: task.id });
    });
    li.append(inputCheckbox, textSpan, meta, starBtn, deferBtn, deleteBtn);
    textSpan.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    textSpan.addEventListener("dblclick", (e) => {
      e.stopPropagation(); //  не даём событию дойти до li
      const inputEdit = document.createElement("input");
      inputEdit.type = "text";
      inputEdit.value = task.text;
      li.innerHTML = "";
      li.append(inputEdit);
      inputEdit.focus();

      // сохранить по Enter
      inputEdit.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
          const newText = inputEdit.value.trim();
          if (newText !== "") {
            dispatch({
              type: "EDIT",
              payload: { id: task.id, text: newText },
            });
          }
        }

        // отмена по Esc
        if (e.key === "Escape") {
          render();
        }
      });
    });

    list.append(li);
  });

  updateCounter();
  localStorage.setItem("tasks", JSON.stringify(historyState.present));
}
list.addEventListener("dragover", (e) => {
  e.preventDefault();

  const targetLi = e.target.closest("li");
  if (!targetLi) return;

  // снимаем со всех
  document.querySelectorAll("li.drag-over").forEach((li) => {
    li.classList.remove("drag-over");
  });

  // вешаем на текущий
  targetLi.classList.add("drag-over");
});

list.addEventListener("dragleave", () => {
  list.classList.remove("drag-over");
});

list.addEventListener("drop", (e) => {
  e.preventDefault();
  const targetLi = e.target.closest("li");
  if (!targetLi || !draggedId) return;
  document.querySelectorAll("li.drag-over").forEach((li) => {
    li.classList.remove("drag-over");
  });

  const targetId = targetLi.dataset.id;

  if (draggedId === targetId) return;

  let draggedIndex = tasks.findIndex((t) => t.id.toString() === draggedId);
  let targetIndex = tasks.findIndex((t) => t.id.toString() === targetId);

  if (draggedIndex === -1 || targetIndex === -1) return;

  const draggedTask = tasks[draggedIndex];
  tasks.splice(draggedIndex, 1);
  tasks.splice(targetIndex, 0, draggedTask);

  render();
});

// Счётчик задач
function updateCounter() {
  const tasks = historyState.present; // ← локальная ссылка на state
  const activeTasks = tasks.filter((task) => !task.done);
  counter.textContent = `Осталось задач: ${activeTasks.length}`;
}
filters.forEach((btn) => {
  btn.addEventListener("click", () => {
    // снимаем active со всех
    filters.forEach((b) => b.classList.remove("active"));

    // ставим active на выбранную
    btn.classList.add("active");

    // запоминаем фильтр
    currentFilter = btn.dataset.filter;

    // перерисовываем список
    render();
  });
});
function loadHistoryFromStorage() {
  const saved = localStorage.getItem("todo-history");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn("Ошибка чтения history из localStorage", e);
    }
  }

  // если в storage пусто или сломано
  return {
    past: [],
    present: initialTasks, // стартовые задачи
    future: [],
  };
}

render();

document.getElementById("undoBtn").addEventListener("click", () => {
  undo();
  render();
});

document.getElementById("redoBtn").addEventListener("click", () => {
  redo();
  render();
});
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "z") {
    dispatch({ type: "UNDO" });
  }

  if (e.ctrlKey && e.key === "y") {
    dispatch({ type: "REDO" });
  }
});
sortDeadline.addEventListener("click", () => {
  currentSort = "deadline";
  render();
});

sortStatus.addEventListener("click", () => {
  currentSort = "status";
  render();
});

sortAlpha.addEventListener("click", () => {
  currentSort = "alpha";
  render();
});
