import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, XCircle, AlertCircle } from "lucide-react";

type StatusBadgeProps = {
  status: string;
  className?: string;
  showIndicator?: boolean;
};

export default function StatusBadge({ status, className, showIndicator = true }: StatusBadgeProps) {
  // Перевод статусов
  const translateStatus = (status: string): string => {
    const statusLower = status.toLowerCase();

    if (statusLower === "active") return "Активен";
    if (statusLower === "inactive") return "Неактивен";
    if (statusLower === "processed") return "Обработан";
    if (statusLower === "completed") return "Завершен";
    if (statusLower === "in_progress") return "В процессе";
    if (statusLower === "scheduled") return "Записан";
    if (statusLower === "cancelled") return "Отменен";
    if (statusLower === "registered") return "Зарегистрирован";
    if (statusLower === "success") return "Успешно";
    if (statusLower === "failed") return "Ошибка";
    if (statusLower === "error") return "Ошибка";
    if (statusLower === "processing") return "Обработка";
    if (statusLower === "pending") return "В ожидании";

    return status; // Возвращаем оригинальный статус, если перевод не найден
  };

  // Define icon for status
  const StatusIcon = () => {
    const statusLower = status.toLowerCase();

    if (statusLower === "active" ||
      statusLower === "processed" ||
      statusLower === "completed" ||
      statusLower === "registered" ||
      statusLower === "success") {
      return <Check className="h-3 w-3" />;
    }

    if (statusLower === "failed" || statusLower === "error" || statusLower === "cancelled") {
      return <XCircle className="h-3 w-3" />;
    }

    if (statusLower === "inactive") {
      return <AlertCircle className="h-3 w-3" />;
    }

    if (statusLower === "processing" || statusLower === "pending" || statusLower === "in_progress" || statusLower === "scheduled") {
      return <Clock className="h-3 w-3" />;
    }

    return null;
  };

  // Define color mapping for different statuses
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();

    // Зеленый - записан (scheduled)
    if (statusLower === "scheduled") {
      return "bg-green-500 hover:bg-green-600 text-white";
    }

    // Синий - в процессе (in_progress)
    if (statusLower === "in_progress" || statusLower === "processing" || statusLower === "pending") {
      return "bg-blue-500 hover:bg-blue-600 text-white";
    }

    // Желтый - завершен (completed)
    if (statusLower === "completed") {
      return "bg-yellow-500 hover:bg-yellow-600 text-white";
    }

    // Другие статусы
    if (statusLower === "active" ||
      statusLower === "processed" ||
      statusLower === "registered" ||
      statusLower === "success") {
      return "bg-emerald-500 hover:bg-emerald-600 text-white";
    }

    if (statusLower === "failed" || statusLower === "error" || statusLower === "cancelled") {
      return "bg-red-500 hover:bg-red-600 text-white";
    }

    if (statusLower === "inactive") {
      return "bg-gray-500 hover:bg-gray-600 text-white";
    }

    return "bg-gray-200 hover:bg-gray-300 text-gray-800";
  };

  // Small variant for mini-badge (used in tables or inline)
  if (className?.includes("text-xs")) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium",
        getStatusColor(status),
        className
      )}>
        {showIndicator && <StatusIcon />}
        {translateStatus(status)}
      </span>
    );
  }

  return (
    <Badge className={cn(
      getStatusColor(status),
      "flex items-center w-fit gap-1",
      className
    )}>
      {showIndicator && status.length > 0 &&
        (className?.includes("icon") ? <StatusIcon /> : <span className="w-2 h-2 bg-white rounded-full mr-1" />)
      }
      {translateStatus(status)}
    </Badge>
  );
}
