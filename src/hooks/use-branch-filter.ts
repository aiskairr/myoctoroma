import { useEffect, useState } from 'react';
import { useBranch } from '../contexts/BranchContext';

// Хук для фильтрации данных по выбранному филиалу
export function useBranchFilter<T extends Record<string, any>>(
  data: T[] | null | undefined,
  options?: {
    includeInstagram?: boolean;
    includeTelegram?: boolean;
    applyFilter?: boolean; // Опционально отключить фильтрацию (для страницы /новые)
  }
) {
  const { currentBranch } = useBranch();
  const [filteredData, setFilteredData] = useState<T[]>([]);
  
  const { 
    includeInstagram = true, 
    includeTelegram = true,
    applyFilter = true
  } = options || {};

  useEffect(() => {
    if (!data) {
      setFilteredData([]);
      return;
    }

    // Если applyFilter=false, не применяем фильтрацию (например, для страницы "новые")
    if (!applyFilter) {
      setFilteredData(data);
      return;
    }

    // Получаем waInstance для текущего филиала (wa1 или wa2)
    const branchWaInstance = currentBranch.waInstance;

    // Фильтруем данные
    const filtered = data.filter(item => {
      // Проверка на задачи с CRM (branchId)
      if (item.branchId) {
        return item.branchId === branchWaInstance; // Фильтруем по branchId для задач
      }
      
      // Для клиентов проверяем связанные с ними идентификаторы
      // Для задач проверяем клиента внутри задачи
      const clientData = item.client || item;
      
      // Извлекаем нужные свойства безопасно
      const telegramId = clientData.telegramId as string | null | undefined;
      const instanceId = clientData.instanceId as string | null | undefined;
      const source = clientData.source as string | null | undefined;

      if (!telegramId && !instanceId && !source) {
        // Для задач, у которых нет указан филиал, но есть branchId
        if (item.branchId) {
          return item.branchId === branchWaInstance;
        }
        return true; // Если нет идентификаторов, сохраняем элемент
      }

      // Проверяем, относится ли элемент к выбранному филиалу WhatsApp
      const isWhatsAppBranch = 
        (telegramId?.startsWith(branchWaInstance + '_') || 
         instanceId === branchWaInstance);

      // Проверяем Instagram
      const isInstagram = source === 'instagram' || 
                          telegramId?.startsWith('ig_');

      // Проверяем Telegram
      const isTelegram = telegramId && 
                         !telegramId.startsWith('wa') && 
                         !telegramId.startsWith('ig_') && 
                         source !== 'instagram';

      // Проверяем ручные записи (manual)
      const isManualEntry = item.manual === true;

      // Для ручных записей проверяем branchId
      if (isManualEntry && item.branchId) {
        return item.branchId === branchWaInstance;
      }

      // Включаем запись, если:
      // 1. Это запись из WhatsApp выбранного филиала, или
      // 2. Это запись из Instagram и мы включаем Instagram, или
      // 3. Это запись из Telegram и мы включаем Telegram
      return isWhatsAppBranch || 
             (isInstagram && includeInstagram) || 
             (isTelegram && includeTelegram);
    });

    setFilteredData(filtered);
  }, [data, currentBranch, includeInstagram, includeTelegram, applyFilter]);

  return filteredData;
}