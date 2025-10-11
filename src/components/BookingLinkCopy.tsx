import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Share2, CheckCircle2, QrCode, Smartphone, Plus, Trash2, BarChart3, TrendingUp, Eye, EyeOff } from "lucide-react";
import { useBranch } from '@/contexts/BranchContext';
import { createApiUrl } from "@/utils/api-url";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface BookingLink {
  id: number;
  originalLink: string;
  content: string;
  generatedLink: string;
  branchId: string;
  createdAt: string;
  usageCount: number;
  linkKey: string;
  isActive: boolean;
}

interface BookingLinkStat {
  linkKey: string;
  content: string;
  generatedLink: string;
  bookingCount: number;
  lastUsed: string | null;
}

export const BookingLinkCopy: React.FC = () => {
  const { toast } = useToast();
  const { currentBranch } = useBranch();
  const queryClient = useQueryClient();
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showLinksManager, setShowLinksManager] = useState(false);
  const [newLinkContent, setNewLinkContent] = useState('');

  // Генерируем базовую ссылку на основе текущего домена и organisationId
  const baseBookingUrl = `${window.location.origin}/booking?organisationId=${currentBranch?.organisationId || ''}`;

  // Запрос списка созданных ссылок
  const { data: bookingLinks, isLoading: linksLoading } = useQuery<{ success: boolean; links: BookingLink[] }>({
    queryKey: [createApiUrl(`/api/booking-links/${currentBranch?.id}`)],
    enabled: !!currentBranch?.id,
    refetchInterval: 30000,
  });

  // Запрос статистики использования ссылок
  const { data: linkStats, isLoading: statsLoading } = useQuery<{ success: boolean; stats: BookingLinkStat[] }>({
    queryKey: [createApiUrl(`/api/booking-links-stats/${currentBranch?.id}`)],
    enabled: !!currentBranch?.id,
    refetchInterval: 30000,
  });

  // Мутация для создания новой ссылки
  const createLinkMutation = useMutation({
    mutationFn: async ({ originalLink, content, branchId }: { originalLink: string; content: string; branchId: string }) => {
      const response = await fetch(createApiUrl('/api/create-booking-params-link'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ originalLink, content, branchId }),
      });

      if (!response.ok) {
        throw new Error('Ошибка создания ссылки');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [createApiUrl(`/api/booking-links/${currentBranch?.id}`)] });
      queryClient.invalidateQueries({ queryKey: [createApiUrl(`/api/booking-links-stats/${currentBranch?.id}`)] });
      setNewLinkContent('');
      setShowCreateForm(false);
      toast({
        title: "✅ Ссылка создана",
        description: "Новая ссылка для отслеживания успешно создана",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать ссылку",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (url: string, linkKey?: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(linkKey || 'base');
      toast({
        title: "✅ Ссылка скопирована",
        description: "Ссылка успешно скопирована в буфер обмена",
        variant: "default",
      });
      
      // Сбрасываем состояние через 2 секунды
      setTimeout(() => setIsCopied(null), 2000);
    } catch (err) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать ссылку",
        variant: "destructive",
      });
    }
  };

  const openBookingPage = (url: string) => {
    window.open(url, '_blank');
  };

  const generateQRCode = (url: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    window.open(qrUrl, '_blank');
  };

  const handleCreateLink = () => {
    if (!newLinkContent.trim() || !currentBranch?.id) return;

    createLinkMutation.mutate({
      originalLink: baseBookingUrl,
      content: newLinkContent.trim(),
      branchId: currentBranch.id.toString(),
    });
  };

  const totalBookings = linkStats?.stats?.reduce((sum, stat) => sum + stat.bookingCount, 0) || 0;

  if (!currentBranch?.organisationId) {
    return (
      <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-amber-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-amber-700">
            <div className="bg-amber-500 p-2 rounded-lg">
              <Share2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium">Ссылки для бронирования</p>
              <p className="text-sm text-amber-600">
                Будут доступны после выбора филиала
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-emerald-800">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-xl shadow-md">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">Ссылки для бронирования</h3>
            <p className="text-sm text-emerald-600 font-normal">
              Создавайте отслеживаемые ссылки для маркетинга
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Базовая ссылка */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-emerald-200 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-100 p-1.5 rounded-lg">
                <Smartphone className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-emerald-700">
                Базовая ссылка для записи
              </span>
            </div>
            
            <Input
              value={baseBookingUrl}
              readOnly
              className="bg-gradient-to-r from-gray-50 to-gray-100 border-emerald-300 focus:border-emerald-500 focus:ring-emerald-200 text-sm font-mono text-gray-700 cursor-pointer"
              onClick={() => copyToClipboard(baseBookingUrl)}
            />
            
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => copyToClipboard(baseBookingUrl)}
                size="sm"
                className={`transition-all duration-300 transform hover:scale-105 ${
                  isCopied === 'base'
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-200' 
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-200'
                } shadow-lg`}
              >
                {isCopied === 'base' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Скопировано!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Копировать
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => openBookingPage(baseBookingUrl)}
                variant="outline"
                size="sm"
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-all duration-200 hover:scale-105"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Открыть
              </Button>

              <Button
                onClick={() => generateQRCode(baseBookingUrl)}
                variant="outline"
                size="sm"
                className="border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 transition-all duration-200 hover:scale-105"
              >
                <QrCode className="h-4 w-4 mr-2" />
                QR код
              </Button>
            </div>
          </div>
        </div>

        {/* Управление отслеживаемыми ссылками */}
        <Collapsible open={showLinksManager} onOpenChange={setShowLinksManager}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Отслеживаемые ссылки и статистика
                {totalBookings > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {totalBookings} записей
                  </Badge>
                )}
              </div>
              {showLinksManager ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Форма создания новой ссылки */}
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-blue-800 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Создать отслеживаемую ссылку
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {showCreateForm ? 'Скрыть' : 'Показать'}
                </Button>
              </div>
              
              {showCreateForm && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Описание источника (например: Instagram Stories - скидка 20%, Google Ads - массаж для офисных работников)"
                    value={newLinkContent}
                    onChange={(e) => setNewLinkContent(e.target.value)}
                    className="border-blue-300 focus:border-blue-500"
                    rows={2}
                  />
                  <Button
                    onClick={handleCreateLink}
                    disabled={!newLinkContent.trim() || createLinkMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {createLinkMutation.isPending ? 'Создание...' : 'Создать ссылку'}
                  </Button>
                </div>
              )}
            </div>

            {/* Статистика */}
            {linkStats?.stats && linkStats.stats.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                <h4 className="font-medium text-purple-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Статистика использования ссылок
                </h4>
                
                {/* Общая статистика */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white/70 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-600">{linkStats.stats.length}</div>
                    <div className="text-xs text-purple-700">Активных ссылок</div>
                  </div>
                  <div className="bg-white/70 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">{totalBookings}</div>
                    <div className="text-xs text-blue-700">Всего записей</div>
                  </div>
                  <div className="bg-white/70 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {linkStats.stats.filter(s => s.bookingCount > 0).length}
                    </div>
                    <div className="text-xs text-green-700">Используемых</div>
                  </div>
                  <div className="bg-white/70 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {totalBookings > 0 ? Math.round(totalBookings / linkStats.stats.length) : 0}
                    </div>
                    <div className="text-xs text-orange-700">Среднее/ссылку</div>
                  </div>
                </div>

                {/* Детальная статистика */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Источник</TableHead>
                        <TableHead className="text-xs text-center">Записей</TableHead>
                        <TableHead className="text-xs text-center">Последнее использование</TableHead>
                        <TableHead className="text-xs text-center">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linkStats.stats.map((stat) => (
                        <TableRow key={stat.linkKey}>
                          <TableCell className="text-xs">
                            <div className="max-w-40 truncate" title={stat.content}>
                              {stat.content}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={stat.bookingCount > 0 ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {stat.bookingCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {stat.lastUsed 
                              ? format(new Date(stat.lastUsed), 'dd.MM.yyyy HH:mm')
                              : 'Не использовалась'
                            }
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-1 justify-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(stat.generatedLink, stat.linkKey)}
                                className="h-6 w-6 p-0"
                              >
                                {isCopied === stat.linkKey ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openBookingPage(stat.generatedLink)}
                                className="h-6 w-6 p-0"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Список всех созданных ссылок */}
            {bookingLinks?.links && bookingLinks.links.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h4 className="font-medium text-gray-800 mb-3">Все созданные ссылки</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {bookingLinks.links.map((link) => (
                    <div key={link.id} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {link.content}
                          </p>
                          <p className="text-xs text-gray-500 font-mono truncate">
                            {link.generatedLink}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {link.usageCount} использований
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {format(new Date(link.createdAt), 'dd.MM.yyyy')}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(link.generatedLink, link.linkKey)}
                            className="h-8 w-8 p-0"
                          >
                            {isCopied === link.linkKey ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => generateQRCode(link.generatedLink)}
                            className="h-8 w-8 p-0"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Пустое состояние */}
            {(!linkStats?.stats || linkStats.stats.length === 0) && !statsLoading && (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Пока нет созданных отслеживаемых ссылок</p>
                <p className="text-sm">Создайте первую ссылку для отслеживания источников трафика</p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Info Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 rounded-full p-2 mt-0.5 shadow-md">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
            <div className="text-sm text-blue-700">
              <p className="font-semibold mb-2 text-blue-800">💡 Способы использования:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-600">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  <span>Instagram Stories с отслеживанием</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  <span>Google Ads кампании</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  <span>Печатная реклама с QR</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  <span>Партнерские сайты</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
