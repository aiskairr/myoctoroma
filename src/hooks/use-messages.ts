import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBranch } from '@/contexts/BranchContext';
import { getQueryFn } from '@/lib/queryClient';

export interface MessageItem {
  id: number;
  content: string;
  isFromClient: boolean;
  timestamp: string;
  messengerUrl?: string;
}

export interface ClientMessages {
  client: {
    id: number;
    telegramId: string;
    firstName: string | null;
    lastName: string | null;
    username?: string | null;
    phoneNumber?: string | null;
  };
  messages: MessageItem[];
}

export interface MessagesResponse {
  success: boolean;
  branchId: number;
  page: number;
  totalMessages: number;
  hasMore: boolean;
  data: ClientMessages[];
}

/**
 * Hook для работы с новым Messages API
 * Поддерживает пагинацию по 1500 сообщений на страницу
 */
export function useMessages() {
  const { currentBranch } = useBranch();
  const [page, setPage] = useState(1);
  const [allData, setAllData] = useState<ClientMessages[]>([]);

  const { data, isLoading, error, refetch } = useQuery<MessagesResponse>({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/messages/${currentBranch?.id}/${page}`],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: !!currentBranch?.id,
    staleTime: 30000, // 30 секунд
    refetchInterval: 30000, // Автоматическое обновление каждые 30 секунд
  });

  // Обновляем allData при получении новых данных
  useEffect(() => {
    if (data?.success) {
      // При загрузке первой страницы заменяем все данные
      if (page === 1) {
        setAllData(data.data);
      } else {
        // При загрузке следующих страниц добавляем к существующим
        setAllData((prev) => {
          const existingIds = new Set(prev.map(item => item.client.id));
          const newItems = data.data.filter((item: ClientMessages) => !existingIds.has(item.client.id));
          return [...prev, ...newItems];
        });
      }
    }
  }, [data, page]);

  const loadNextPage = () => {
    if (data?.hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const reset = () => {
    setPage(1);
    setAllData([]);
  };

  return {
    // Все загруженные данные (с учетом пагинации)
    allData,
    // Текущая страница данных
    currentPageData: data?.data || [],
    // Метаданные
    page: data?.page || 1,
    totalMessages: data?.totalMessages || 0,
    hasMore: data?.hasMore || false,
    // Состояния загрузки
    isLoading,
    error,
    // Действия
    loadNextPage,
    reset,
    refetch,
  };
}

/**
 * Hook для получения сообщений конкретного клиента из загруженных данных
 */
export function useClientMessages(clientId: number | string, allData: ClientMessages[]) {
  const clientData = allData.find(
    (item) => item.client.id === Number(clientId) || item.client.telegramId === String(clientId)
  );

  return {
    client: clientData?.client || null,
    messages: clientData?.messages || [],
    hasMessages: (clientData?.messages?.length || 0) > 0,
  };
}
