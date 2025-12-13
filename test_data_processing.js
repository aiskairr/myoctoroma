// Пример тестирования логики обработки данных
// Этот файл демонстрирует, как фронтенд обрабатывает данные из API

// Пример данных из API /api/tasks
const tasksFromAPI = [
    {
        "id": "111759501386762580",
        "clientId": 12,
        "status": "scheduled",
        "serviceType": "VIP пакет",
        "serviceServiceId": 59,
        "serviceDuration": 90,
        "servicePrice": null,
        "discount": 0,
        "finalPrice": null,
        "scheduleDate": "2025-10-03T00:00:00.000Z",
        "scheduleTime": "09:45",
        "endTime": null,
        "masterId": 4,
        "masterName": "Федор", // Это значение будет перезаписано
        "notes": "Задача создана вручную через интерфейс",
        "branchId": "1",
        "source": null,
        "chatId": null,
        "mother": null,
        "paymentMethod": null,
        "adminName": null,
        "paid": "unpaid",
        "createdAt": "2025-10-03T14:23:07.072Z",
        "updatedAt": "2025-10-03T14:23:07.072Z",
        "client": {
            "id": 12,
            "telegramId": "wa1_1234567890",
            "firstName": "jhbjhbjhb",
            "lastName": "Клиент",
            "username": "",
            "customName": null,
            "phoneNumber": "+1234567890",
            "branchId": "wa1",
            "organisationId": null,
            "firstSeenAt": "2025-10-03T14:23:07.056Z",
            "lastActiveAt": "2025-10-03T14:23:07.038Z",
            "isActive": true
        }
    },
    {
        "id": "111759501484315410",
        "clientId": 13,
        "status": "scheduled",
        "serviceType": "Арома релакс",
        "serviceServiceId": 63,
        "serviceDuration": 120,
        "servicePrice": 900,
        "discount": 0,
        "finalPrice": 900,
        "scheduleDate": "2025-10-03T00:00:00.000Z",
        "scheduleTime": "10:00",
        "endTime": null,
        "masterId": 3,
        "masterName": "Не назначен", // Это значение будет перезаписано
        "notes": "Задача создана вручную через интерфейс",
        "branchId": "1",
        "source": null,
        "chatId": null,
        "mother": null,
        "paymentMethod": null,
        "adminName": null,
        "paid": "unpaid",
        "createdAt": "2025-10-03T14:24:45.148Z",
        "updatedAt": "2025-10-03T14:24:45.148Z",
        "client": {
            "id": 13,
            "telegramId": "wa1_123456789099",
            "firstName": "kjnkjnjkn",
            "lastName": "Клиент",
            "username": "",
            "customName": null,
            "phoneNumber": "+123456789099",
            "branchId": "wa1",
            "organisationId": null,
            "firstSeenAt": "2025-10-03T14:24:45.119Z",
            "lastActiveAt": "2025-10-03T14:24:45.102Z",
            "isActive": true
        }
    }
];

// Пример данных из API /staff
const mastersFromAPI = [
    {
        "id": 3,
        "name": "Анна Петрова",
        "specialization": "Ароматерапевт",
        "isActive": true,
        "startWorkHour": "09:00",
        "endWorkHour": "18:00",
        "branchId": "1"
    },
    {
        "id": 4,
        "name": "Мария Иванова", // Обратите внимание: отличается от "Федор" в задаче
        "specialization": "VIP мастер",
        "isActive": true,
        "startWorkHour": "10:00",
        "endWorkHour": "20:00",
        "branchId": "1"
    }
];

// Функция объединения данных (как это происходит в useTasks)
function mergeTasksWithMasters(tasks, masters) {
    console.log("🔄 Тестирование объединения данных...");
    
    // Создаем карту мастеров
    const mastersMap = new Map(masters.map(master => [master.id, master]));
    console.log("📋 Карта мастеров:", Object.fromEntries(mastersMap));
    
    // Объединяем данные
    const mergedTasks = tasks.map(task => {
        const master = task.masterId ? mastersMap.get(task.masterId) : null;
        const masterName = master ? master.name : null;
        
        // Вычисляем clientName
        const clientName = task.client?.customName || 
                          task.client?.firstName || 
                          (task.client?.firstName && task.client?.lastName ? 
                            `${task.client.firstName} ${task.client.lastName}` : '') ||
                          'Клиент';
        
        // Вычисляем endTime если его нет
        let endTime = task.endTime;
        if (!endTime && task.scheduleTime && task.serviceDuration) {
            const [hours, minutes] = task.scheduleTime.split(':').map(Number);
            const startMinutes = hours * 60 + minutes;
            const endMinutes = startMinutes + task.serviceDuration;
            const endHours = Math.floor(endMinutes / 60);
            const endMins = endMinutes % 60;
            endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
        }
        
        return {
            ...task,
            masterName, // Перезаписываем данными из masters API
            master,
            clientName,
            endTime
        };
    });
    
    console.log("✅ Результат объединения:");
    mergedTasks.forEach((task, index) => {
        console.log(`  Задача ${index + 1}:`);
        console.log(`    ID: ${task.id}`);
        console.log(`    Клиент: ${task.clientName}`);
        console.log(`    Услуга: ${task.serviceType}`);
        console.log(`    Мастер ID: ${task.masterId}`);
        console.log(`    Мастер (из API): ${task.masterName} -> Мастер (актуальный): ${task.masterName}`);
        console.log(`    Время: ${task.scheduleTime} - ${task.endTime}`);
        console.log(`    Продолжительность: ${task.serviceDuration} мин`);
        console.log(`    Статус: ${task.status}`);
        console.log("    ---");
    });
    
    return mergedTasks;
}

// Тестируем функцию
const result = mergeTasksWithMasters(tasksFromAPI, mastersFromAPI);

// Проверяем результат
console.log("\n📊 Проверка результата:");
console.log("- Общее количество задач:", result.length);
console.log("- Задач с мастерами:", result.filter(t => t.masterName).length);
console.log("- Задач без мастеров:", result.filter(t => !t.masterName && t.masterId).length);

// Конвертируем в формат для календаря (как в time-schedule.tsx)
const appointments = result
    .filter(task => task.scheduleTime && task.masterId)
    .map(task => ({
        id: task.id.toString(),
        employeeId: task.masterId.toString(),
        clientName: task.clientName,
        service: task.serviceType,
        startTime: task.scheduleTime,
        endTime: task.endTime,
        duration: task.serviceDuration,
        status: task.status,
        notes: task.notes
    }));

console.log("\n📅 Данные для календаря:");
appointments.forEach((apt, index) => {
    console.log(`  Запись ${index + 1}:`);
    console.log(`    Клиент: ${apt.clientName}`);
    console.log(`    Услуга: ${apt.service}`);
    console.log(`    Сотрудник ID: ${apt.employeeId}`);
    console.log(`    Время: ${apt.startTime} - ${apt.endTime} (${apt.duration} мин)`);
    console.log("    ---");
});

export { mergeTasksWithMasters, tasksFromAPI, mastersFromAPI };
