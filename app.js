// ========================================
// VARIABLES GLOBALES
// ========================================

let tasks = [];
let deferredPrompt;
let currentFilter = 'todas';
let editingTaskId = null;
let notificationTimeouts = {};

// ========================================
// ELEMENTOS DEL DOM
// ========================================

const taskInput = document.getElementById('taskInput');
const addButton = document.getElementById('addButton');
const taskList = document.getElementById('taskList');
const taskCount = document.getElementById('taskCount');
const clearCompletedButton = document.getElementById('clearCompleted');
const filterButtons = document.querySelectorAll('.filter-btn');
const installPrompt = document.getElementById('installPrompt');
const installButton = document.getElementById('installButton');
const dismissButton = document.getElementById('dismissButton');
const themeToggle = document.getElementById('themeToggle');
const editModal = document.getElementById('editModal');
const closeModal = document.getElementById('closeModal');
const editTaskInput = document.getElementById('editTaskInput');
const editDeadline = document.getElementById('editDeadline');
const editNotification = document.getElementById('editNotification');
const notificationGroup = document.getElementById('notificationGroup');
const cancelEdit = document.getElementById('cancelEdit');
const saveEdit = document.getElementById('saveEdit');

// ========================================
// REGISTRO DEL SERVICE WORKER
// ========================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/mi-pwa-tareas/service-worker.js')
            .then((registration) => {
                console.log('Service Worker registrado exitosamente:', registration.scope);
            })
            .catch((error) => {
                console.log('Error al registrar Service Worker:', error);
            });
    });
}

// ========================================
// MANEJO DE LA INSTALACIÓN DE LA PWA
// ========================================

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installPrompt.style.display = 'block';
});

installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Usuario ${outcome === 'accepted' ? 'aceptó' : 'rechazó'} la instalación`);
        deferredPrompt = null;
        installPrompt.style.display = 'none';
    }
});

dismissButton.addEventListener('click', () => {
    installPrompt.style.display = 'none';
});

// ========================================
// MODO OSCURO
// ========================================

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('darkMode', isDark);
}

function loadTheme() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    }
}

themeToggle.addEventListener('click', toggleTheme);

// ========================================
// NOTIFICACIONES
// ========================================

async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
    }
}

function scheduleNotification(task) {
    if (!task.deadline || !task.notificationTime || task.completed) return;
    
    const deadlineTime = new Date(task.deadline).getTime();
    const notificationTime = deadlineTime - (task.notificationTime * 60 * 1000);
    const now = Date.now();
    const timeUntilNotification = notificationTime - now;
    
    if (timeUntilNotification > 0) {
        if (notificationTimeouts[task.id]) {
            clearTimeout(notificationTimeouts[task.id]);
        }
        
        notificationTimeouts[task.id] = setTimeout(() => {
            showNotification(task);
        }, timeUntilNotification);
    }
}

function showNotification(task) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('⏰ Recordatorio de Tarea', {
            body: task.text,
            icon: '/mi-pwa-tareas/icons/icon-192.png',
            badge: '/mi-pwa-tareas/icons/icon-192.png',
            tag: `task-${task.id}`,
            requireInteraction: true
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }
}

function cancelNotification(taskId) {
    if (notificationTimeouts[taskId]) {
        clearTimeout(notificationTimeouts[taskId]);
        delete notificationTimeouts[taskId];
    }
}

function rescheduleAllNotifications() {
    Object.keys(notificationTimeouts).forEach(id => {
        clearTimeout(notificationTimeouts[id]);
    });
    notificationTimeouts = {};
    
    tasks.forEach(task => {
        if (task.deadline && task.notificationTime && !task.completed) {
            scheduleNotification(task);
        }
    });
}

// ========================================
// FUNCIONES DE ALMACENAMIENTO
// ========================================

function loadTasks() {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        renderTasks();
        rescheduleAllNotifications();
    }
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// ========================================
// FUNCIONES PRINCIPALES
// ========================================

function addTask() {
    const taskText = taskInput.value.trim();
    
    if (taskText === '') {
        alert('Por favor escribe una tarea');
        return;
    }
    
    const task = {
        id: Date.now(),
        text: taskText,
        completed: false,
        createdAt: new Date().toISOString(),
        deadline: null,
        notificationTime: null
    };
    
    tasks.unshift(task);
    saveTasks();
    taskInput.value = '';
    renderTasks();
    
    requestNotificationPermission();
}

function deleteTask(id) {
    cancelNotification(id);
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderTasks();
}

function toggleTask(id) {
    const task = tasks.find(task => task.id === id);
    if (task) {
        task.completed = !task.completed;
        
        if (task.completed) {
            cancelNotification(id);
        } else if (task.deadline && task.notificationTime) {
            scheduleNotification(task);
        }
        
        saveTasks();
        renderTasks();
    }
}

function clearCompleted() {
    tasks.forEach(task => {
        if (task.completed) {
            cancelNotification(task.id);
        }
    });
    
    tasks = tasks.filter(task => !task.completed);
    saveTasks();
    renderTasks();
}

function setFilter(filter) {
    currentFilter = filter;
    
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    renderTasks();
}

function getFilteredTasks() {
    switch (currentFilter) {
        case 'pendientes':
            return tasks.filter(task => !task.completed);
        case 'completadas':
            return tasks.filter(task => task.completed);
        default:
            return tasks;
    }
}

function formatDeadline(deadline) {
    const date = new Date(deadline);
    const now = new Date();
    const diffMs = date - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    };
    const formattedDate = date.toLocaleDateString('es-ES', options);
    
    let timeLeft = '';
    if (diffMs < 0) {
        timeLeft = '⚠️ Vencida';
    } else if (diffDays > 0) {
        timeLeft = `(${diffDays} día${diffDays > 1 ? 's' : ''})`;
    } else if (diffHours > 0) {
        timeLeft = `(${diffHours} hora${diffHours > 1 ? 's' : ''})`;
    } else {
        timeLeft = '(Hoy)';
    }
    
    return { formattedDate, timeLeft, isOverdue: diffMs < 0 };
}

function renderTasks() {
    taskList.innerHTML = '';
    const filteredTasks = getFilteredTasks();
    
    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        
        let deadlineHtml = '';
        if (task.deadline) {
            const { formattedDate, timeLeft, isOverdue } = formatDeadline(task.deadline);
            deadlineHtml = `
                <div class="task-deadline ${isOverdue && !task.completed ? 'overdue' : ''}">
                    📅 ${formattedDate} ${timeLeft}
                </div>
            `;
        }
        
        li.innerHTML = `
            <div class="task-main">
                <input 
                    type="checkbox" 
                    class="task-checkbox" 
                    ${task.completed ? 'checked' : ''}
                    onchange="toggleTask(${task.id})"
                >
                <div class="task-content">
                    <span class="task-text">${task.text}</span>
                    ${deadlineHtml}
                </div>
                <div class="task-actions">
                    <button class="task-btn edit-btn" onclick="openEditModal(${task.id})">
                        ✏️
                    </button>
                    ${task.deadline ? `
                    <button class="task-btn calendar-btn" onclick="addToCalendar(${task.id})">
                        📅
                    </button>
                    ` : ''}
                    <button class="task-btn delete-btn" onclick="deleteTask(${task.id})">
                        🗑️
                    </button>
                </div>
            </div>
        `;
        
        taskList.appendChild(li);
    });
    
    updateTaskCount();
}

function updateTaskCount() {
    const pendingTasks = tasks.filter(task => !task.completed).length;
    taskCount.textContent = `${pendingTasks} tarea${pendingTasks !== 1 ? 's' : ''} pendiente${pendingTasks !== 1 ? 's' : ''}`;
}

// ========================================
// MODAL DE EDICIÓN
// ========================================

function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    editingTaskId = id;
    editTaskInput.value = task.text;
    
    if (task.deadline) {
        const date = new Date(task.deadline);
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        editDeadline.value = localDate.toISOString().slice(0, 16);
        notificationGroup.style.display = 'block';
        editNotification.value = task.notificationTime || '';
    } else {
        editDeadline.value = '';
        notificationGroup.style.display = 'none';
        editNotification.value = '';
    }
    
    editModal.style.display = 'block';
}

function closeEditModal() {
    editModal.style.display = 'none';
    editingTaskId = null;
    editTaskInput.value = '';
    editDeadline.value = '';
    editNotification.value = '';
}

function saveTaskEdit() {
    const task = tasks.find(t => t.id === editingTaskId);
    if (!task) return;
    
    const newText = editTaskInput.value.trim();
    if (newText === '') {
        alert('Por favor escribe una tarea');
        return;
    }
    
    task.text = newText;
    
    if (editDeadline.value) {
        task.deadline = new Date(editDeadline.value).toISOString();
        task.notificationTime = editNotification.value ? parseInt(editNotification.value) : null;
        
        if (task.notificationTime && !task.completed) {
            scheduleNotification(task);
        }
    } else {
        cancelNotification(task.id);
        task.deadline = null;
        task.notificationTime = null;
    }
    
    saveTasks();
    renderTasks();
    closeEditModal();
}

editDeadline.addEventListener('change', () => {
    if (editDeadline.value) {
        notificationGroup.style.display = 'block';
    } else {
        notificationGroup.style.display = 'none';
        editNotification.value = '';
    }
});

closeModal.addEventListener('click', closeEditModal);
cancelEdit.addEventListener('click', closeEditModal);
saveEdit.addEventListener('click', saveTaskEdit);

window.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeEditModal();
    }
});

// ========================================
// AGREGAR AL CALENDARIO
// ========================================

function addToCalendar(id) {
    const task = tasks.find(t => t.id === id);
    if (!task || !task.deadline) return;
    
    const startDate = new Date(task.deadline);
    const endDate = new Date(startDate.getTime() + (30 * 60 * 1000));
    
    const formatDate = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.text)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent('Tarea de Mis Tareas PWA')}`;
    
    window.open(calendarUrl, '_blank');
}

// ========================================
// EVENT LISTENERS
// ========================================

addButton.addEventListener('click', addTask);

taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

clearCompletedButton.addEventListener('click', clearCompleted);

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadTasks();
    requestNotificationPermission();
});