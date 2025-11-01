import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocale } from '@/contexts/LocaleContext';
import { useBranch } from '@/contexts/BranchContext';
import { FileSpreadsheet, Calendar, Upload } from 'lucide-react';
import { AltegioImportTab } from './imports/AltegioImportTab';
import { DikidiImportTab } from './imports/DikidiImportTab';
import { ZapisikzImportTab } from './imports/ZapisikzImportTab';

export function UnifiedImportCard() {
  const { t } = useLocale();
  const { currentBranch } = useBranch();
  const [activeTab, setActiveTab] = useState<'altegio' | 'dikidi' | 'zapisikz'>('altegio');

  if (!currentBranch) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {t('import.unified.title') || 'Импорт данных'}
        </CardTitle>
        <CardDescription>
          {t('import.unified.description') || 'Выберите систему для импорта клиентов, мастеров и записей'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="altegio" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Altegio</span>
            </TabsTrigger>
            <TabsTrigger value="dikidi" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">DIKIDI</span>
            </TabsTrigger>
            <TabsTrigger value="zapisikz" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Zapisi.kz</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="altegio" className="mt-6">
            <AltegioImportTab />
          </TabsContent>

          <TabsContent value="dikidi" className="mt-6">
            <DikidiImportTab />
          </TabsContent>

          <TabsContent value="zapisikz" className="mt-6">
            <ZapisikzImportTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
