import React from 'react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AcoesExportacao({ onPdf, onExcel }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onPdf}>
        <FileDown className="h-4 w-4" />
        PDF
      </Button>
      <Button variant="outline" size="sm" onClick={onExcel}>
        <FileSpreadsheet className="h-4 w-4" />
        Excel
      </Button>
    </div>
  );
}
