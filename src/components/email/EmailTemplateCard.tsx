import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

interface EmailTemplateCardProps {
  readonly title: string;
  readonly description: string;
  readonly children: React.ReactNode;
  readonly onPreview?: () => void;
}

export function EmailTemplateCard({ title, description, children, onPreview }: EmailTemplateCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
          {onPreview && (
            <Button variant="outline" size="sm" onClick={onPreview}>
              Preview
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="border rounded-lg overflow-hidden bg-slate-50">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}