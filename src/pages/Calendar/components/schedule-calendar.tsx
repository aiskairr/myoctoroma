'use client'

import { useNextCalendarApp, ScheduleXCalendar } from '@schedule-x/react'
import { createViewDay } from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop'
import { createResizePlugin } from '@schedule-x/resize'
import 'temporal-polyfill/global'
import '@schedule-x/theme-default/dist/index.css'
import { useState } from 'react'

// Типы для пользователей
interface User {
    id: string
    name: string
    color: string
}

interface UserEvent {
    id: string
    title: string
    start: any
    end: any
    userId: string
}

// Компонент модального окна для создания задачи
function CreateTaskModal({ isOpen, onClose, onCreate, defaultTime, user }: {
    isOpen: boolean,
    onClose: () => void,
    onCreate: (title: string, start: any, end: any) => void,
    defaultTime: any,
    user: User
}) {
    const [taskTitle, setTaskTitle] = useState('')

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!taskTitle.trim()) {
            alert('Название задачи не может быть пустым!')
            return
        }

        const startTime = Temporal.ZonedDateTime.from(defaultTime)
        const endTime = startTime.add({ hours: 1 }) // По умолчанию задача длится 1 час

        onCreate(taskTitle, startTime, endTime)
        setTaskTitle('')
        onClose()
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                width: '300px',
                border: `2px solid ${user.color}`
            }}>
                <h3 style={{ color: user.color }}>Новая задача для {user.name}</h3>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="Название задачи"
                        style={{
                            width: '100%',
                            padding: '8px',
                            marginBottom: '10px',
                            borderRadius: '4px',
                            border: '1px solid #ccc'
                        }}
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" style={{
                            padding: '8px 16px',
                            backgroundColor: user.color,
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}>
                            Создать
                        </button>
                        <button type="button" onClick={onClose} style={{
                            padding: '8px 16px',
                            backgroundColor: '#ccc',
                            color: 'black',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}>
                            Отмена
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// Компонент для одного календаря пользователя
function UserCalendar({ user, events, onAddEvent }: {
    user: User;
    events: UserEvent[];
    onAddEvent: (newEvent: UserEvent) => void
}) {
    const eventsService = useState(() => createEventsServicePlugin())[0]
    const dragAndDrop = useState(() => {
        console.log('🔧 Инициализация drag-and-drop плагина для', user.name)
        return createDragAndDropPlugin()
    })[0]
    const resize = useState(() => {
        console.log('🔧 Инициализация resize плагина для', user.name)
        return createResizePlugin()
    })[0]
    const [previousEventState, setPreviousEventState] = useState(new Map())
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedTime, setSelectedTime] = useState(null)

    const checkEventConflict = (updatedEvent: any, allEvents: any) => {
        return allEvents.some((event: any) => {
            if (event.id === updatedEvent.id) return false

            const eventStart = new Date(event.start.toString())
            const eventEnd = new Date(event.end.toString())
            const updatedStart = new Date(updatedEvent.start.toString())
            const updatedEnd = new Date(updatedEvent.end.toString())

            return updatedStart < eventEnd && updatedEnd > eventStart
        })
    }

    const userEvents = events
        .filter(event => event.userId === user.id)
        .map(event => {
            const mappedEvent = {
                ...event,
                backgroundColor: user.color,
                borderColor: user.color,
                // Добавляем свойства для drag-and-drop
                draggable: true,
                resizable: true
            }
            console.log(`📅 Событие для ${user.name}:`, mappedEvent)
            return mappedEvent
        })

    const handleCreateTask = (title: string, start: any, end: any) => {
        const newEvent = {
            id: `${user.id}-${Date.now()}`,
            title,
            start,
            end,
            userId: user.id,
            backgroundColor: user.color,
            borderColor: user.color
        }

        const hasConflict = checkEventConflict(newEvent, eventsService.getAll())
        if (hasConflict) {
            alert(`❌ Новая задача пересекается с существующей для ${user.name}!`)
            return
        }

        eventsService.add(newEvent)
        onAddEvent(newEvent)
        console.log(`✅ Новая задача создана для ${user.name}:`, newEvent)
    }

    const calendar = useNextCalendarApp({
        locale: 'ru-RU',
        firstDayOfWeek: 1,
        views: [createViewDay()],
        defaultView: 'day',
        events: userEvents,
        plugins: [eventsService, dragAndDrop, resize],
        callbacks: {
            onRender: () => {
                console.log(`🎨 onRender called for ${user.name}`)
                const allEvents = eventsService.getAll()
                console.log(`📋 Все события в eventsService для ${user.name}:`, allEvents)
                const eventMap = new Map()
                allEvents.forEach(event => {
                    eventMap.set(event.id, {
                        start: event.start,
                        end: event.end
                    })
                })
                setPreviousEventState(eventMap)
                console.log(`${user.name} events:`, allEvents)
            },
            onEventClick: (event) => {
                console.log(`🖱️ Клик по событию ${user.name}:`, event)
            },
            onEventUpdate: async (updatedEvent) => {
                console.log('🔥 onEventUpdate called!')
                console.log('updatedEvent:', updatedEvent)
                console.log('Тип изменения:', updatedEvent._isDrag ? 'DRAG' : updatedEvent._isResize ? 'RESIZE' : 'UNKNOWN')
                
                // Проверяем, изменилось ли что-то
                const prevState = previousEventState.get(updatedEvent.id)
                console.log('Предыдущее состояние:', prevState)
                console.log('Новое состояние:', { start: updatedEvent.start, end: updatedEvent.end })
                
                if (!prevState || 
                    prevState.start?.toString() === updatedEvent.start?.toString() && 
                    prevState.end?.toString() === updatedEvent.end?.toString()) {
                    console.log('⚠️ Состояние не изменилось, пропускаем обновление')
                    return true
                }

                const allEvents = eventsService.getAll()
                const hasConflict = checkEventConflict(updatedEvent, allEvents)

                if (hasConflict) {
                    console.warn(`⚠️ Конфликт событий обнаружен у ${user.name}!`)

                    const previousState = previousEventState.get(updatedEvent.id)
                    if (previousState) {
                        const restoredEvent = {
                            ...updatedEvent,
                            start: previousState.start,
                            end: previousState.end
                        }
                        setTimeout(() => {
                            eventsService.update(restoredEvent)
                        }, 100)
                    }

                    alert(`❌ Событие ${user.name} не может пересекаться с другими событиями!`)
                    return false
                }

                // Формируем payload для API
                const payload = {
                    start: updatedEvent.start?.toString(),
                    end: updatedEvent.end?.toString(),
                    title: updatedEvent.title,
                    userId: updatedEvent.userId
                }
                
                console.log('📤 Отправка PUT запроса:', payload)
                
                try {
                    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${updatedEvent.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                        credentials: 'include'
                    })
                    
                    console.log('📡 Ответ сервера:', response.status, response.ok)
                    
                    if (!response.ok) {
                        const errorData = await response.json()
                        console.error('❌ Ошибка ответа:', errorData)
                        alert(`Ошибка обновления события: ${errorData.message || response.status}`)
                        return false
                    }
                    
                    console.log(`✅ PUT /api/tasks/${updatedEvent.id} успешно отправлен!`)
                } catch (error) {
                    console.error('❌ Ошибка сети:', error)
                    alert(`Ошибка сети при обновлении события: ${error}`)
                    return false
                }

                setPreviousEventState(prev => {
                    const newMap = new Map(prev)
                    newMap.set(updatedEvent.id, {
                        start: updatedEvent.start,
                        end: updatedEvent.end
                    })
                    return newMap
                })

                console.log(`✅ ${user.name} event successfully updated:`, updatedEvent)
                return true
            },
        }
    })

    return (
        <div style={{ marginBottom: '30px' }}>
            <h3 style={{
                color: user.color,
                margin: '10px 0',
                padding: '10px',
                backgroundColor: `${user.color}20`,
                borderRadius: '8px',
                border: `2px solid ${user.color}`
            }}>
                📅 {user.name} (ID: {user.id})
            </h3>
            <div style={{ border: `2px solid ${user.color}`, borderRadius: '8px', overflow: 'hidden', minWidth: '500px' }}>
                <ScheduleXCalendar calendarApp={calendar} />
            </div>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                🔧 Drag-and-drop: {dragAndDrop ? 'активен' : 'неактивен'} | 
                Resize: {resize ? 'активен' : 'неактивен'} | 
                Событий: {userEvents.length}
            </div>
            <CreateTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateTask}
                defaultTime={selectedTime}
                user={user}
            />
        </div>
    )
}

// Основной компонент
function ScheduleCalendar() {
    const [allEvents, setAllEvents] = useState<UserEvent[]>([
        // События Алексея
        {
            id: 'alex-1',
            title: 'Утренний стендап',
            start: Temporal.ZonedDateTime.from('2025-09-22T09:00:00[UTC]'),
            end: Temporal.ZonedDateTime.from('2025-09-22T09:30:00[UTC]'),
            userId: '1'
        },
        {
            id: 'alex-2',
            title: 'Код-ревью',
            start: Temporal.ZonedDateTime.from('2025-09-22T14:00:00[UTC]'),
            end: Temporal.ZonedDateTime.from('2025-09-22T15:00:00[UTC]'),
            userId: '1'
        },
        // События Марии
        {
            id: 'maria-1',
            title: 'Встреча с клиентом',
            start: Temporal.ZonedDateTime.from('2025-09-22T10:00:00[UTC]'),
            end: Temporal.ZonedDateTime.from('2025-09-22T11:30:00[UTC]'),
            userId: '2'
        },
        {
            id: 'maria-2',
            title: 'Презентация проекта',
            start: Temporal.ZonedDateTime.from('2025-09-22T16:00:00[UTC]'),
            end: Temporal.ZonedDateTime.from('2025-09-22T17:30:00[UTC]'),
            userId: '2'
        },
        // События Дмитрия
        {
            id: 'dmitry-1',
            title: 'Планирование спринта',
            start: Temporal.ZonedDateTime.from('2025-09-22T11:00:00[UTC]'),
            end: Temporal.ZonedDateTime.from('2025-09-22T12:00:00[UTC]'),
            userId: '3'
        },
        // События Анны
        {
            id: 'anna-1',
            title: 'Дизайн-ревью',
            start: Temporal.ZonedDateTime.from('2025-09-22T13:00:00[UTC]'),
            end: Temporal.ZonedDateTime.from('2025-09-22T14:00:00[UTC]'),
            userId: '4'
        },
        {
            id: 'anna-2',
            title: 'UX исследование',
            start: Temporal.ZonedDateTime.from('2025-09-22T15:30:00[UTC]'),
            end: Temporal.ZonedDateTime.from('2025-09-22T16:30:00[UTC]'),
            userId: '4'
        }
    ])

    const users: User[] = [
        { id: '1', name: 'Алексей Петров', color: '#3B82F6' },
        { id: '2', name: 'Мария Иванова', color: '#EF4444' },
        { id: '3', name: 'Дмитрий Сидоров', color: '#10B981' },
        { id: '4', name: 'Анна Козлова', color: '#F59E0B' }
    ]

    const handleAddEvent = (newEvent: UserEvent) => {
        setAllEvents(prev => [...prev, newEvent])
    }

    return (
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <div style={{
                display: 'flex',
                gap: '20px',
                maxWidth: '1400px',
                margin: '0 auto'
            }}>
                {users.map(user => (
                    <UserCalendar
                        key={user.id}
                        user={user}
                        events={allEvents}
                        onAddEvent={handleAddEvent}
                    />
                ))}
            </div>
        </div>
    )
}

export default ScheduleCalendar