'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileSpreadsheet, Package } from 'lucide-react';
import { ImportarInventarioTab } from './ImportarInventarioTab';
import { GenerarCargaTab } from './GenerarCargaTab';
import { HistorialTab } from './HistorialTab';

export function PosIntegrationPage(): JSX.Element {
  return (
    <Tabs defaultValue="importar" className="w-full">
      <TabsList className="flex flex-col gap-1 sm:flex-row sm:gap-0 w-full sm:w-auto h-auto sm:h-10">
        <TabsTrigger value="importar" className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
          <Upload className="mr-2 h-4 w-4" /> Importar Inventario
        </TabsTrigger>
        <TabsTrigger value="generar" className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Generar Carga POS
        </TabsTrigger>
        <TabsTrigger value="historial" className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
          <Package className="mr-2 h-4 w-4" /> Historial
        </TabsTrigger>
      </TabsList>

      <TabsContent value="importar" className="mt-4">
        <ImportarInventarioTab />
      </TabsContent>

      <TabsContent value="generar" className="mt-4">
        <GenerarCargaTab />
      </TabsContent>

      <TabsContent value="historial" className="mt-4">
        <HistorialTab />
      </TabsContent>
    </Tabs>
  );
}
