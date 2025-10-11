/**
 * Утилиты для отслеживания источников записей через URL параметры
 */

export interface TrackingInfo {
  sourceUrl: string;
  parameters: { [key: string]: string };
  trackingSource?: string;
  notesText: string;
}

/**
 * Извлекает параметры URL для отслеживания источника записи
 * @returns объект с информацией об источнике
 */
export function extractTrackingInfo(): TrackingInfo {
  const urlParams = new URLSearchParams(window.location.search);
  const parameters: { [key: string]: string } = {};
  
  // Собираем все параметры URL
  urlParams.forEach((value, key) => {
    parameters[key] = value;
  });

  const sourceUrl = window.location.href;
  const trackingSource = parameters.source || null;

  // Создаем текст для заметок
  let notesText = '';
  if (Object.keys(parameters).length > 0) {
    const paramsString = Object.entries(parameters)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    notesText = `Источник записи: ${sourceUrl}\nПараметры: ${paramsString}`;
    
    // Если есть параметр source (из отслеживаемых ссылок), выделяем его особо
    if (trackingSource) {
      notesText += `\nОтслеживаемая ссылка: ${trackingSource}`;
    }

    // Добавляем дату и время создания заметки
    const now = new Date();
    const timestamp = now.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Bishkek'
    });
    notesText += `\nВремя создания записи: ${timestamp}`;
  }

  return {
    sourceUrl,
    parameters,
    trackingSource: trackingSource || undefined,
    notesText
  };
}

/**
 * Определяет тип источника на основе параметров URL
 * @param parameters параметры URL
 * @returns описание источника
 */
export function getSourceType(parameters: { [key: string]: string }): string {
  if (parameters.source) {
    return 'Отслеживаемая ссылка';
  }
  
  if (parameters.utm_source) {
    return `UTM источник: ${parameters.utm_source}`;
  }
  
  if (parameters.ref) {
    return `Реферальная ссылка: ${parameters.ref}`;
  }
  
  if (Object.keys(parameters).length > 0) {
    return 'Ссылка с параметрами';
  }
  
  return 'Прямой переход';
}

/**
 * Форматирует параметры URL для отображения в админ панели
 * @param parameters параметры URL
 * @returns форматированная строка
 */
export function formatParametersForAdmin(parameters: { [key: string]: string }): string {
  if (Object.keys(parameters).length === 0) {
    return 'Нет параметров';
  }

  return Object.entries(parameters)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}
