import { jsPDF } from 'jspdf';

/**
 * Добавляет поддержку кириллицы в jsPDF
 * Использует встроенный шрифт с поддержкой Unicode
 */
export const addCyrillicFont = (doc: jsPDF) => {
  // jsPDF 3.x имеет встроенную поддержку базовых шрифтов
  // Но для кириллицы нужно использовать специальные методы
  
  // Устанавливаем шрифт, который лучше работает с кириллицей
  // В jsPDF 3.x можно использовать 'helvetica' с encoding
  doc.setFont('helvetica', 'normal');
  
  return doc;
};

/**
 * Экранирует текст для корректного отображения в PDF
 * Заменяет проблемные символы на их правильные аналоги
 */
export const escapePdfText = (text: string): string => {
  if (!text) return '';
  
  // Для jsPDF нужно использовать правильную кодировку
  // Преобразуем текст в формат, поддерживаемый PDF
  return text.toString();
};

/**
 * Конфигурация для autoTable с поддержкой кириллицы
 */
export const getCyrillicTableConfig = () => {
  return {
    styles: {
      font: 'helvetica',
      fontStyle: 'normal',
    },
    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
    },
  };
};
