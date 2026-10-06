import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { DeviceNoticeView } from "@/components/privacy/DeviceNotice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { placeholdersIn, type NoticeResponse } from "@/lib/fraud";

const errorText = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

/**
 * Edit the wording customers are told about device capture, see exactly where
 * it will appear, and publish it.
 *
 * Saving changes only the draft. Customers see nothing new until it is
 * published, and then only while device capture is on. Every published version
 * is kept, so what a customer was told on a given day can always be answered.
 */
export function PrivacyNoticeEditor() {
  const qc = useQueryClient();
  const [shortNotice, setShortNotice] = useState("");
  const [policyText, setPolicyText] = useState("");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const notice = useQuery({
    queryKey: ["fraud-privacy-notice"],
    queryFn: async () => (await api.get("/api/admin/fraud/privacy-notice")).data.data as NoticeResponse,
    retry: false,
  });

  // Fill the editor from the server once per saved version of the draft, and
  // never while the person is typing over it.
  useEffect(() => {
    const d = notice.data;
    if (!d) return;
    const stamp = `${d.draftUpdatedAt ?? "initial"}`;
    if (stamp !== loadedFor) {
      setShortNotice(d.draft.shortNotice);
      setPolicyText(d.draft.policyText);
      setLoadedFor(stamp);
    }
  }, [notice.data, loadedFor]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["fraud-privacy-notice"] });
    qc.invalidateQueries({ queryKey: ["fraud-signals"] });
  };

  const save = useMutation({
    mutationFn: async () => api.put("/api/admin/fraud/privacy-notice", { shortNotice, policyText }),
    onSuccess: () => {
      toast.success("Draft saved. Customers see nothing new until you publish.");
      refresh();
    },
    onError: (err) => toast.error(errorText(err, "Could not save the draft.")),
  });

  const publish = useMutation({
    mutationFn: async () => api.post("/api/admin/fraud/privacy-notice/publish"),
    onSuccess: () => {
      toast.success("Published.");
      setConfirmPublish(false);
      refresh();
    },
    onError: (err) => {
      toast.error(errorText(err, "Could not publish."));
      setConfirmPublish(false);
      refresh();
    },
  });

  if (notice.isLoading) return <Skeleton className="h-96 w-full" />;

  if (notice.error || !notice.data) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{errorText(notice.error, "Could not load the privacy notice.")}</span>
      </div>
    );
  }

  const data = notice.data;
  const { limits } = data;

  // Unsaved edits are what is in the boxes versus what is saved on the server.
  const edited = shortNotice.trim() !== data.draft.shortNotice || policyText.trim() !== data.draft.policyText;
  const blanks = [...new Set([...placeholdersIn(shortNotice), ...placeholdersIn(policyText)])];

  const lengthProblem = (value: string, l: { min: number; max: number }) => {
    const n = value.trim().length;
    return n < l.min ? `At least ${l.min} characters` : n > l.max ? `At most ${l.max} characters` : null;
  };
  const shortProblem = lengthProblem(shortNotice, limits.shortNotice);
  const policyProblem = lengthProblem(policyText, limits.policyText);

  const canSave = edited && !shortProblem && !policyProblem && !save.isPending;
  const canPublish =
    !edited && blanks.length === 0 && data.hasUnpublishedChanges && !publish.isPending && !save.isPending;

  const whyNotPublish = edited
    ? "Save your changes first."
    : blanks.length > 0
      ? "Fill in the blanks first."
      : !data.hasUnpublishedChanges
        ? "Nothing has changed since the last publish."
        : null;

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <p className="text-sm text-muted-foreground">
          This is what customers are told about the device information we record. It appears on the sign-in
          page, only while device capture is on. Wording needs counsel&apos;s approval before it is published.
        </p>
        <p className="flex items-center gap-1.5 text-sm" data-testid="notice-status">
          {data.published ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden />
              Published as version {data.published.version} by {data.published.publishedBy} on{" "}
              {fmt(data.published.publishedAt)}
              {data.hasUnpublishedChanges ? ". The draft below has changes that are not published." : "."}
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
              Not published. Device capture cannot be turned on until this is.
            </>
          )}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="short-notice">Short notice (shown on the sign-in page)</Label>
              <span className="text-xs text-muted-foreground">
                {shortNotice.trim().length} / {limits.shortNotice.max}
              </span>
            </div>
            <Textarea
              id="short-notice"
              rows={7}
              value={shortNotice}
              onChange={(e) => setShortNotice(e.target.value)}
              aria-invalid={!!shortProblem}
            />
            {shortProblem && <p className="text-xs text-destructive">{shortProblem}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="policy-text">Full wording (shown behind the &ldquo;Privacy&rdquo; link)</Label>
              <span className="text-xs text-muted-foreground">
                {policyText.trim().length} / {limits.policyText.max}
              </span>
            </div>
            <Textarea
              id="policy-text"
              rows={14}
              value={policyText}
              onChange={(e) => setPolicyText(e.target.value)}
              aria-invalid={!!policyProblem}
            />
            {policyProblem && <p className="text-xs text-destructive">{policyProblem}</p>}
          </div>

          {blanks.length > 0 && (
            <div
              className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
              role="status"
              data-testid="notice-blanks"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                Still to fill in: {blanks.join(", ")}. Anything in square brackets is a blank, and the notice
                cannot be published while any remain.
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" disabled={!canSave} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Save draft"}
            </Button>
            <Button disabled={!canPublish} onClick={() => setConfirmPublish(true)}>
              Publish
            </Button>
            {whyNotPublish && <span className="text-xs text-muted-foreground">{whyNotPublish}</span>}
          </div>
          {data.draftUpdatedAt && (
            <p className="text-xs text-muted-foreground">
              Draft last saved {fmt(data.draftUpdatedAt)}
              {data.draftUpdatedBy ? ` by ${data.draftUpdatedBy}` : ""}.
            </p>
          )}
        </section>

        <section className="space-y-3" aria-labelledby="preview-heading">
          <div className="space-y-1">
            <h2 id="preview-heading" className="text-sm font-semibold">
              Where customers will see it
            </h2>
            <p className="text-xs text-muted-foreground">
              Below the phone number on the sign-in page of apply.agendamoney.com, before they continue. This
              preview shows what is in the boxes on the left, including unsaved edits. Click &ldquo;Privacy&rdquo;
              to see the full wording.
            </p>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4" data-testid="notice-preview">
            <div className="mx-auto w-full max-w-sm space-y-4 rounded-[28px] border border-white/60 bg-white p-6 shadow-sm">
              <div className="space-y-1 text-center">
                <p className="text-lg font-bold tracking-tight text-gray-800">Enter your phone number</p>
                <p className="text-[11px] text-gray-500">We&apos;ll send a one-time code to verify your number</p>
              </div>
              <div className="flex h-11 items-center rounded-full border border-blue-50 bg-slate-50 px-4 text-sm text-gray-400">
                +233 &nbsp;|&nbsp; 24 XXX XXXX
              </div>
              <div className="flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-pink-600 to-rose-500 text-xs font-bold uppercase tracking-widest text-white">
                Continue
              </div>
              {shortNotice.trim() ? (
                <DeviceNoticeView shortNotice={shortNotice.trim()} policyText={policyText.trim()} />
              ) : (
                <p className="text-center text-xs text-muted-foreground">Nothing to show yet.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {data.history.length > 0 && (
        <section className="space-y-2" aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-sm font-semibold">
            Published versions
          </h2>
          <ul className="divide-y rounded-lg border text-sm">
            {[...data.history].reverse().map((v) => (
              <li key={v.version} className="flex items-center justify-between gap-4 px-4 py-2">
                <span>Version {v.version}</span>
                <span className="text-xs text-muted-foreground">
                  {fmt(v.publishedAt)} by {v.publishedBy}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Published versions are kept exactly as they were, so what a customer was told on any day can be
            answered.
          </p>
        </section>
      )}

      <AlertDialog open={confirmPublish} onOpenChange={(open) => !open && !publish.isPending && setConfirmPublish(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this wording?</AlertDialogTitle>
            <AlertDialogDescription>
              It becomes version {(data.published?.version ?? 0) + 1}. Customers see it on the sign-in page from
              the moment device capture is on. A published version cannot be edited, only replaced by a newer one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publish.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={publish.isPending}
              onClick={(e) => {
                e.preventDefault();
                publish.mutate();
              }}
            >
              {publish.isPending ? "Publishing…" : "Publish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
