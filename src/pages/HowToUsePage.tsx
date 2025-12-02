import { Play, BookOpen, Star, Clock, Users, DollarSign, Calendar, BarChart3, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLocale } from "@/contexts/LocaleContext";

export default function HowToUsePage() {
  const { t } = useLocale();
  
  const handleVideoClick = () => {
    window.open('https://youtu.be/JKGyNsZeqww', '_blank');
  };

  const handleCalendarVideoClick = () => {
    window.open('https://youtu.be/GBOer1QM3Nc', '_blank');
  };

    const features = [
    {
      icon: Calendar,
      title: t('how_to_use.feature_calendar'),
      description: t('how_to_use.feature_calendar_desc'),
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Users,
      title: t('how_to_use.feature_masters'),
      description: t('how_to_use.feature_masters_desc'),
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: DollarSign,
      title: t('how_to_use.feature_finance'),
      description: t('how_to_use.feature_finance_desc'),
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      icon: BarChart3,
      title: t('how_to_use.feature_analytics'),
      description: t('how_to_use.feature_analytics_desc'),
      gradient: "from-orange-500 to-red-500"
    }
  ];

    const benefits = [
    { icon: Clock, text: t('how_to_use.benefit_time') },
    { icon: Star, text: t('how_to_use.benefit_quality') },
    { icon: Sparkles, text: t('how_to_use.benefit_automation') },
    { icon: BookOpen, text: t('how_to_use.benefit_interface') }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Hero Section */}
                {/* Hero Section */}
        <div className="text-center space-y-4 mb-12">
          <Badge variant="secondary" className="mb-2">
            {t('how_to_use.badge')}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            {t('how_to_use.title')} <br className="md:hidden" />
            {t('how_to_use.title_crm')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('how_to_use.subtitle')}
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
                      <CardTitle className="text-2xl">{t('how_to_use.video_title')}</CardTitle>
                      <CardDescription className="text-base">
                        {t('how_to_use.video_description')}
                      </CardDescription>
                    </div>
                  </div>

                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                    <Star className="h-3 w-3 mr-1" />
                    {t('how_to_use.recommended')}
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
                    <span className="text-sm font-medium">{t('how_to_use.duration')}</span>
                  </div>

                  <Button
                    onClick={handleVideoClick}
                    size="lg"
                    className="w-full group shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    {t('how_to_use.watch_button')}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Tutorial Video Card */}
            <Card className="relative overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-card to-card/80 mt-8">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />

              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{t('how_to_use.calendar_video_title')}</CardTitle>
                      <CardDescription className="text-base">
                        {t('how_to_use.calendar_video_description')}
                      </CardDescription>
                    </div>
                  </div>

                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                    <Calendar className="h-3 w-3 mr-1" />
                    {t('how_to_use.tutorial')}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="relative space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-950/30 transition-colors">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-md flex-shrink-0">
                      <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">{t('how_to_use.calendar_feature_1')}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('how_to_use.calendar_feature_1_desc')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/50 dark:hover:bg-purple-950/30 transition-colors">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-md flex-shrink-0">
                      <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">{t('how_to_use.calendar_feature_2')}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('how_to_use.calendar_feature_2_desc')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/30 transition-colors">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-md flex-shrink-0">
                      <Star className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">{t('how_to_use.calendar_feature_3')}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('how_to_use.calendar_feature_3_desc')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100/50 dark:hover:bg-orange-950/30 transition-colors">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-md flex-shrink-0">
                      <BarChart3 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">{t('how_to_use.calendar_feature_4')}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('how_to_use.calendar_feature_4_desc')}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t('how_to_use.calendar_duration')}</span>
                  </div>

                  <Button
                    onClick={handleCalendarVideoClick}
                    size="lg"
                    variant="default"
                    className="w-full group shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  >
                    <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    {t('how_to_use.watch_calendar_button')}
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
                  {t('how_to_use.benefits_title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">{benefit.text}</span>
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
                  {t('how_to_use.quick_start')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium">1</div>
                    <span>{t('how_to_use.step_1')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium">2</div>
                    <span>{t('how_to_use.step_2')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium">3</div>
                    <span>{t('how_to_use.step_3')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium">4</div>
                    <span>{t('how_to_use.step_4')}</span>
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