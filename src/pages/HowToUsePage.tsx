import { ExternalLink, Play } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HowToUsePage() {
  const handleVideoClick = () => {
    window.open('https://youtu.be/NJv5GSxQ-UI', '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Как пользоваться программой?</h1>
        <p className="text-muted-foreground mt-2">
          Видео-инструкция по работе с системой
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-blue-600" />
            Обучающее видео
          </CardTitle>
          <CardDescription>
            Подробная инструкция по использованию всех функций CRM системы
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              В этом видео вы узнаете:
            </p>
            <ul className="text-sm space-y-2 pl-4">
              <li>• Как работать с календарем и записывать клиентов</li>
              <li>• Как управлять мастерами и их расписанием</li>
              <li>• Как вести учет финансов и зарплат</li>
              <li>• Как пользоваться отчетами</li>
              <li>• Основные функции системы</li>
            </ul>
            
            <Button 
              onClick={handleVideoClick}
              className="w-full mt-6"
              size="lg"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Открыть видео-инструкцию
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Дополнительная информация</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>
              <strong>Поддержка:</strong> Если у вас есть вопросы по работе с системой, 
              обратитесь к администратору или посмотрите видео-инструкцию.
            </p>
            <p>
              <strong>Обновления:</strong> Система регулярно обновляется для улучшения 
              функциональности и удобства использования.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}