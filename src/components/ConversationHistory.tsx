import { useEffect, useRef, useState } from "react";
import type { Message, Client } from "@shared/schema";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { User, Bot, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ConversationHistoryProps {
  client: Client;
  messages: Message[];
}

export default function ConversationHistory({ client, messages }: ConversationHistoryProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [sortedMessages, setSortedMessages] = useState<Message[]>([]);

  // Sort messages by timestamp and deduplicate
  useEffect(() => {
    if (messages && messages.length > 0) {
      // Create a Map to store messages by ID to handle duplicates
      const uniqueMessages = new Map<number, Message>();
      
      // Add all messages to the Map (later messages will override earlier ones with the same ID)
      messages.forEach(message => {
        uniqueMessages.set(message.id, message);
      });
      
      // Convert the Map values back to an array and sort by timestamp
      const sorted = Array.from(uniqueMessages.values()).sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateA - dateB;
      });
      
      setSortedMessages(sorted);
      setIsInitialLoad(false);
    } else {
      setSortedMessages([]);
    }
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: isInitialLoad ? "auto" : "smooth" });
    }
  }, [sortedMessages, isInitialLoad]);

  // Format timestamp for display
  const formatMessageTime = (timestamp: Date | string) => {
    if (!timestamp) return "Время не указано";
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "Некорректное время";
      }
      
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();
      
      if (isToday) {
        return `Сегодня, ${format(date, "HH:mm", { locale: ru })}`;
      } else if (isYesterday) {
        return `Вчера, ${format(date, "HH:mm", { locale: ru })}`;
      }
      
      return format(date, "dd.MM.yyyy, HH:mm", { locale: ru });
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Ошибка времени";
    }
  };
  
  // Group messages by date for better visual separation
  const getMessageDateGroup = (timestamp: Date | string) => {
    if (!timestamp) return "";
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "";
      }
      
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();
      
      if (isToday) {
        return "Сегодня";
      } else if (isYesterday) {
        return "Вчера";
      }
      
      return format(date, "d MMMM yyyy", { locale: ru });
    } catch (error) {
      return "";
    }
  };
  
  // Group messages by date
  const messagesByDate = sortedMessages.reduce<Record<string, Message[]>>((groups, message) => {
    const dateGroup = getMessageDateGroup(message.timestamp);
    if (!groups[dateGroup]) {
      groups[dateGroup] = [];
    }
    groups[dateGroup].push(message);
    return groups;
  }, {});

  // Loading state
  if (isInitialLoad && messages.length > 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mb-2" />
        <p>Загрузка сообщений...</p>
      </div>
    );
  }

  // No messages state
  if (sortedMessages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <p className="text-center">Нет сообщений</p>
        <p className="text-center text-sm mt-1">Когда клиент напишет, сообщения появятся здесь</p>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg p-4 h-full overflow-y-auto">
      {Object.entries(messagesByDate).map(([dateGroup, messagesInGroup]) => (
        <div key={dateGroup} className="mb-6">
          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-muted"></div>
            <Badge variant="outline" className="mx-4 px-3 py-1 bg-muted/30">
              {dateGroup}
            </Badge>
            <div className="flex-grow border-t border-muted"></div>
          </div>
          
          {messagesInGroup.map((message, index) => (
            <div key={message.id || index} className="mb-4">
              {/* User message */}
              {message.isFromClient && (
                <div className="flex items-start mb-2">
                  <div className="flex-shrink-0 rounded-full bg-muted p-1 mr-2 mt-1">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 max-w-[80%]">
                    <p className="text-xs text-muted-foreground mb-1">
                      {client.firstName || client.username || "Клиент"} - {format(new Date(message.timestamp), "HH:mm", { locale: ru })}
                    </p>
                    <Card className="shadow-sm">
                      <CardContent className="p-3 bg-muted/20">
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
              
              {/* Bot message */}
              {!message.isFromClient && (
                <div className="flex items-start justify-end mb-2">
                  <div className="flex-1 max-w-[80%] text-right">
                    <p className="text-xs text-muted-foreground mb-1">
                      {format(new Date(message.timestamp), "HH:mm", { locale: ru })} - Aisulu (бот)
                    </p>
                    <Card className="shadow-sm">
                      <CardContent className="p-3 bg-primary/5 text-left">
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="flex-shrink-0 rounded-full bg-primary/20 p-1 ml-2 mt-1">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
      <div ref={messagesEndRef} className="h-1" />
    </div>
  );
}
