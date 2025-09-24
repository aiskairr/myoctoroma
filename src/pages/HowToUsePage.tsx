import { ExternalLink, Play, BookOpen, Star, Clock, Users, DollarSign, Calendar, BarChart3, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function HowToUsePage() {
  const handleVideoClick = () => {
    window.open('https://youtu.be/NJv5GSxQ-UI', '_blank');
  };

  const features = [
    {
      icon: Calendar,
      title: "Календарь и записи",
      description: "Удобное планирование и управление записями клиентов"
    },
    {
      icon: Users,
      title: "Управление мастерами",
      description: "Контроль расписания и загрузки специалистов"
    },
    {
      icon: DollarSign,
      title: "Финансовый учет",
      description: "Отслеживание доходов, расходов и зарплат"
    },
    {
      icon: BarChart3,
      title: "Аналитика и отчеты",
      description: "Детальная статистика и бизнес-аналитика"
    }
  ];

  const benefits = [
    "Экономия времени на рутинных задачах",
    "Повышение качества обслуживания клиентов",
    "Автоматизация расчетов и отчетности",
    "Удобный интерфейс для всей команды"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Обучение и поддержка
          </div>

          <h1 className="text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
            Как использовать
            <span className="text-primary"> CRM систему</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Полное руководство по эффективному использованию всех возможностей системы
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Video Card */}
          <div className="lg:col-span-2">
            <Card className="relative overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-card to-card/80">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />

              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Play className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Видео-инструкция</CardTitle>
                      <CardDescription className="text-base">
                        Пошаговое руководство по работе с системой
                      </CardDescription>
                    </div>
                  </div>

                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                    <Star className="h-3 w-3 mr-1" />
                    Рекомендуем
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="relative space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                      <div className="p-2 bg-primary/10 rounded-md flex-shrink-0">
                        <feature.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-1">{feature.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Длительность: 15 минут</span>
                  </div>

                  <Button
                    onClick={handleVideoClick}
                    size="lg"
                    className="w-full group shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    Смотреть видео-инструкцию
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Benefits Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-1 bg-green-100 rounded">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  Преимущества
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">{benefit}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Start */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                  </div>
                  Быстрый старт
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium">1</div>
                    <span>Посмотрите обучающее видео</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium">2</div>
                    <span>Создайте первую запись</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium">3</div>
                    <span>Настройте мастеров</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium">4</div>
                    <span>Начните работу</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}