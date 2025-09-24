import { useState, useMemo } from "react";
import type { Client } from "@shared/schema";
import StatusBadge from "./StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, MessageCircle, UserRound, Clock, Users2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ExtendedClient extends Client {
  hasUnreadMessages?: boolean;
}

interface ClientListProps {
  clients: ExtendedClient[];
  selectedClientId: string | null;
  onClientSelect: (telegramId: string) => void;
  conversationTopics?: Record<string, string>;
}

export default function ClientList({
  clients,
  selectedClientId,
  onClientSelect,
  conversationTopics = {}
}: ClientListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<'lastActive' | 'hasUnread'>('lastActive');

  // Filter and sort clients based on search query and sort order
  const filteredAndSortedClients = useMemo(() => {
    // Filter based on search
    const filtered = searchQuery
      ? clients.filter(
        (client) =>
          client.telegramId.includes(searchQuery) ||
          (client.username && client.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (client.firstName && client.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (client.lastName && client.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (conversationTopics[client.telegramId] &&
            conversationTopics[client.telegramId].toLowerCase().includes(searchQuery.toLowerCase()))
      )
      : [...clients];

    // Sort clients
    return filtered.sort((a, b) => {
      // Always prioritize clients with unread messages if sortOrder is 'hasUnread'
      if (sortOrder === 'hasUnread') {
        if (a.hasUnreadMessages && !b.hasUnreadMessages) return -1;
        if (!a.hasUnreadMessages && b.hasUnreadMessages) return 1;
      }

      // Then sort by last active time
      const dateA = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
      const dateB = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
      return dateB - dateA; // Most recent first
    });
  }, [clients, searchQuery, sortOrder, conversationTopics]);

  // Get client initials for avatar
  const getClientInitials = (client: Client): string => {
    if (client.firstName && client.firstName.length > 0) {
      const firstInitial = client.firstName.charAt(0).toUpperCase();
      const lastInitial = client.lastName ? client.lastName.charAt(0).toUpperCase() : '';
      return firstInitial + lastInitial;
    }

    if (client.username && client.username.length > 0) {
      return client.username.charAt(0).toUpperCase();
    }

    return "U"; // Unknown/User default
  };

  // Count clients with unread messages
  const unreadCount = clients.filter(client => client.hasUnreadMessages).length;

  return (
    <div className="bg-surface rounded-lg shadow h-[calc(100vh-9rem)] flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-medium">Клиенты</h2>
          <Badge className="ml-2 bg-muted text-muted-foreground">
            {clients.length}
          </Badge>
        </div>

        {unreadCount > 0 && (
          <Badge variant="destructive" className="rounded-full">
            {unreadCount} {unreadCount === 1 ? 'новое' :
              (unreadCount > 1 && unreadCount < 5) ? 'новых' : 'новых'}
          </Badge>
        )}
      </div>

      <div className="p-4 border-b space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск клиентов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex space-x-2">
          <Badge
            variant={sortOrder === 'lastActive' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSortOrder('lastActive')}
          >
            <Clock className="mr-1 h-3 w-3" />
            По активности
          </Badge>
          <Badge
            variant={sortOrder === 'hasUnread' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSortOrder('hasUnread')}
          >
            <MessageCircle className="mr-1 h-3 w-3" />
            Непрочитанные
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-grow">
        <div className="divide-y">
          {filteredAndSortedClients.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
              <Users2 className="h-10 w-10 mb-2 text-muted" />
              <p>Клиенты не найдены</p>
              {searchQuery && <p className="text-sm mt-1">Попробуйте изменить запрос поиска</p>}
            </div>
          ) : (
            filteredAndSortedClients.map((client) => (
              <div
                key={client.telegramId}
                className={`p-4 hover:bg-muted/20 cursor-pointer transition-colors relative ${selectedClientId === client.telegramId
                  ? "bg-primary/10 hover:bg-primary/15 border-l-4 border-primary"
                  : client.hasUnreadMessages
                    ? "border-l-4 border-primary"
                    : ""
                  }`}
                onClick={() => onClientSelect(client.telegramId)}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className={client.isActive ? "border-2 border-green-400" : ""}>
                    <AvatarFallback className={client.isActive ? "bg-green-50 text-green-700" : "bg-muted"}>
                      {getClientInitials(client)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">
                        {client.customName ? (
                          client.customName
                        ) : (
                          client.firstName || client.username
                            ? `${client.firstName || ""} ${client.lastName || ""} ${client.username ? `(@${client.username})` : ""
                              }`.trim()
                            : `Пользователь #${client.telegramId}`
                        )}
                      </h3>

                      {client.hasUnreadMessages && (
                        <Badge className="bg-primary text-white text-xs flex items-center h-5 shrink-0">
                          <MessageCircle className="h-3 w-3 mr-0.5" />
                          <span>Новое</span>
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 mr-1 inline" />
                      {client.lastActiveAt
                        ? formatDistanceToNow(new Date(client.lastActiveAt), {
                          addSuffix: true,
                          locale: ru
                        })
                        : "Неизвестно"}

                      <StatusBadge
                        status={client.isActive ? "Active" : "Inactive"}
                        className="ml-2 text-xs"
                      />
                    </div>

                    {conversationTopics[client.telegramId] && (
                      <Badge
                        variant="outline"
                        className="bg-primary/5 text-xs mt-2"
                      >
                        {conversationTopics[client.telegramId]}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
