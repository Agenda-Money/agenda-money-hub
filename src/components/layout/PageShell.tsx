import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface PageShellProps {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

export function PageShell({ title, description, icon: Icon, children }: PageShellProps) {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          </div>
        </div>
        {children}
      </div>
    </DashboardLayout>
  );
}
