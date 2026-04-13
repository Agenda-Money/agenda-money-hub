import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageSquare, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import csaApi from '@/lib/csaApi';

export default function CsaTemplatesPage() {
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'borrower' | 'guarantor'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['csa-templates-full'],
    queryFn: () => csaApi.get('/api/csa/templates').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const allTemplates: any[] = data?.templates ?? [];
  const templates = audienceFilter === 'all'
    ? allTemplates
    : allTemplates.filter((t) => t.audience === audienceFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">SMS Templates</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Pre-approved messages for collections outreach</p>
      </div>

      {/* Audience filter */}
      <div className="flex gap-2">
        {(['all', 'borrower', 'guarantor'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setAudienceFilter(f)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold capitalize border transition-all',
              audienceFilter === f
                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground',
            )}
          >
            {f === 'all' ? 'All Templates' : f === 'borrower' ? 'Borrower' : 'Guarantor'}
          </button>
        ))}
      </div>

      {/* Template list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground opacity-30 mb-3" />
          <p className="text-base font-semibold text-foreground">No templates found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t: any, i: number) => (
            <motion.div
              key={t._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-foreground">{t.label}</p>
                  <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider">
                    {t.key}
                  </Badge>
                </div>
                <div className={cn(
                  'flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border',
                  t.audience === 'guarantor'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200',
                )}>
                  {t.audience === 'guarantor'
                    ? <><Users className="h-3 w-3" /> Guarantor</>
                    : <><User className="h-3 w-3" /> Borrower</>
                  }
                </div>
              </div>

              <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-3 leading-relaxed border border-border/50">
                {t.body}
              </p>

              {t.variables?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {t.variables.map((v: string) => (
                    <span key={v} className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded-md text-muted-foreground border border-border">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
