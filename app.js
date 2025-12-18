// ========================================
// VARIABLES GLOBALES
// ========================================

// Arreglo para almacenar las tareas
let tasks = [];

// Variable para guardar el evento de instalación de la PWA
let deferredPrompt;

// Filtro actual (todas, pendientes, completadas)
let currentFilter = 'todas';

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

// ========================================
// REGISTRO DEL SERVICE WORKER
// ========================================

if ('serviceWorker' in navigator) {
    // Registrar el Service Worker cuando la página cargue
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
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

// Capturar el evento beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevenir que el navegador muestre su propio prompt
    e.preventDefault();
    
    // Guardar el evento para usarlo después
    deferredPrompt = e;
    
    // Mostrar nuestro botón de instalación personalizado
    installPrompt.style.display = 'block';
});

// Manejar el clic en el botón de instalar
installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
        // Mostrar el prompt de instalación
        deferredPrompt.prompt();
        
        // Esperar la respuesta del usuario
        const { outcome } = await deferredPrompt.userChoice;
        
        console.log(`Usuario ${outcome === 'accepted' ? 'aceptó' : 'rechazó'} la instalación`);
        
        // Limpiar el prompt
        deferredPrompt = null;
        
        // Ocultar el mensaje de instalación
        installPrompt.style.display = 'none';
    }
});

// Manejar el clic en "Ahora no"
dismissButton.addEventListener('click', () => {
    installPrompt.style.display = 'none';
});

// ========================================
// FUNCIONES DE ALMACENAMIENTO LOCAL
// ========================================

// Cargar tareas desde localStorage
function loadTasks() {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        renderTasks();
    }
}

// Guardar tareas en localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// ========================================
// FUNCIONES PRINCIPALES
// ========================================

// Agregar una nueva tarea
function addTask() {
    const taskText = taskInput.value.trim();
    
    // Validar que el input no esté vacío
    if (taskText === '') {
        alert('Por favor escribe una tarea');
        return;
    }
    
    // Crear objeto de tarea
    const task = {
        id: Date.now(), // ID único basado en timestamp
        text: taskText,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    // Agregar la tarea al inicio del arreglo
    tasks.unshift(task);
    
    // Guardar en localStorage
    saveTasks();
    
    // Limpiar el input
    taskInput.value = '';
    
    // Re-renderizar la lista
    renderTasks();
}

// Eliminar una tarea
function deleteTask(id) {
    // Filtrar el arreglo para eliminar la tarea con ese ID
    tasks = tasks.filter(task => task.id !== id);
    
    // Guardar cambios
    saveTasks();
    
    // Re-renderizar
    renderTasks();
}

// Cambiar el estado completado/pendiente de una tarea
function toggleTask(id) {
    // Encontrar la tarea y cambiar su estado
    const task = tasks.find(task => task.id === id);
    if (task) {
        task.completed = !task.completed;
        
        // Guardar cambios
        saveTasks();
        
        // Re-renderizar
        renderTasks();
    }
}

// Limpiar todas las tareas completadas
function clearCompleted() {
    // Filtrar solo las tareas no completadas
    tasks = tasks.filter(task => !task.completed);
    
    // Guardar y re-renderizar
    saveTasks();
    renderTasks();
}

// Cambiar el filtro actual
function setFilter(filter) {
    currentFilter = filter;
    
    // Actualizar botones activos
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    // Re-renderizar con el nuevo filtro
    renderTasks();
}

// Obtener tareas filtradas según el filtro actual
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

// Renderizar todas las tareas en el DOM
function renderTasks() {
    // Limpiar la lista actual
    taskList.innerHTML = '';
    
    // Obtener tareas filtradas
    const filteredTasks = getFilteredTasks();
    
    // Crear elementos HTML para cada tarea
    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        
        // Estructura HTML de cada tarea
        li.innerHTML = `
            <input 
                type="checkbox" 
                class="task-checkbox" 
                ${task.completed ? 'checked' : ''}
                onchange="toggleTask(${task.id})"
            >
            <span class="task-text">${task.text}</span>
            <button class="delete-btn" onclick="deleteTask(${task.id})">
                Eliminar
            </button>
        `;
        
        // Agregar a la lista
        taskList.appendChild(li);
    });
    
    // Actualizar contador de tareas pendientes
    updateTaskCount();
}

// Actualizar el contador de tareas pendientes
function updateTaskCount() {
    const pendingTasks = tasks.filter(task => !task.completed).length;
    taskCount.textContent = `${pendingTasks} tarea${pendingTasks !== 1 ? 's' : ''} pendiente${pendingTasks !== 1 ? 's' : ''}`;
}

// ========================================
// EVENT LISTENERS
// ========================================

// Botón de agregar tarea
addButton.addEventListener('click', addTask);

// Agregar tarea al presionar Enter
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Botón de limpiar completadas
clearCompletedButton.addEventListener('click', clearCompleted);

// Botones de filtro
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// ========================================
// INICIALIZACIÓN
// ========================================

// Cargar tareas cuando la página cargue
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
});