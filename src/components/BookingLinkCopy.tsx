import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Share2, CheckCircle2, QrCode, Smartphone } from "lucide-react";
import { useBranch } from '@/contexts/BranchContext';

export const BookingLinkCopy: React.FC = () => {
  const { toast } = useToast();
  const { currentBranch } = useBranch();
  const [isCopied, setIsCopied] = useState(false);

  // Генерируем ссылку на основе текущего домена и organisationId
  const bookingUrl = `${window.location.origin}/booking?organisationId=${currentBranch?.organisationId || ''}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setIsCopied(true);
      toast({
        title: "✅ Ссылка скопирована",
        description: "Ссылка на онлайн запись успешно скопирована в буфер обмена",
        variant: "default",
      });
      
      // Сбрасываем состояние через 2 секунды
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать ссылку",
        variant: "destructive",
      });
    }
  };

  const openBookingPage = () => {
    window.open(bookingUrl, '_blank');
  };

  const generateQRCode = () => {
    // Открываем QR код генератор с нашей ссылкой
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bookingUrl)}`;
    window.open(qrUrl, '_blank');
  };

  if (!currentBranch?.organisationId) {
    return (
      <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-amber-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-amber-700">
            <div className="bg-amber-500 p-2 rounded-lg">
              <Share2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium">Ссылка на онлайн запись</p>
              <p className="text-sm text-amber-600">
                Будет доступна после выбора филиала
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
            <h3 className="text-xl font-semibold">Ссылка на онлайн запись</h3>
            <p className="text-sm text-emerald-600 font-normal">
              Поделитесь с клиентами для удобной записи
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* URL Input Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-emerald-200 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-100 p-1.5 rounded-lg">
                <Smartphone className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-emerald-700">
                Ссылка для записи
              </span>
            </div>
            
            <Input
              value={bookingUrl}
              readOnly
              className="bg-gradient-to-r from-gray-50 to-gray-100 border-emerald-300 focus:border-emerald-500 focus:ring-emerald-200 text-sm font-mono text-gray-700 cursor-pointer"
              onClick={copyToClipboard}
            />
            
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={copyToClipboard}
                size="sm"
                className={`transition-all duration-300 transform hover:scale-105 ${
                  isCopied 
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-200' 
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-200'
                } shadow-lg`}
              >
                {isCopied ? (
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
                onClick={openBookingPage}
                variant="outline"
                size="sm"
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-all duration-200 hover:scale-105"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Открыть
              </Button>

              <Button
                onClick={generateQRCode}
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
                  <span>Поделиться в мессенджерах</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  <span>Разместить на сайте</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  <span>Добавить в соцсети</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  <span>Печать QR кода</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
