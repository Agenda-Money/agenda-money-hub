import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { printCurrentPage } from "@/lib/exportUtils";

interface Props {
  onExportXlsx: () => void;
  disabled?: boolean;
}

/** Shared "Export" control for every Plan page — PDF via the browser's
 * native print (scoped by .print-hide page chrome), Excel via a
 * page-supplied callback that already has the page's loaded data. */
export function ExportMenu({ onExportXlsx, disabled }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled} className="print-hide">
          <Download className="h-4 w-4 mr-2" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportXlsx}>
          <FileSpreadsheet className="h-4 w-4 mr-2" /> Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={printCurrentPage}>
          <FileText className="h-4 w-4 mr-2" /> Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
