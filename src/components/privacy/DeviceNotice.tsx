import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The privacy notice about device capture, as a customer sees it.
 *
 * Two parts, so the admin preview and the real page cannot drift apart:
 *   DeviceNoticeView   what is drawn, from the text it is given
 *   DeviceNotice       fetches the published text and draws it, or nothing
 *
 * The text is plain text. It is rendered as text with line breaks kept, never as
 * HTML, because it is edited in the admin and shown on a public page.
 */

export interface DeviceNoticeText {
  shortNotice: string;
  policyText: string;
}

export function DeviceNoticeView({ shortNotice, policyText }: DeviceNoticeText) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="flex gap-2 rounded-2xl border border-gray-100 bg-gray-50/80 p-3 text-left"
        data-testid="device-notice"
      >
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
        <p className="text-[11px] leading-relaxed text-gray-500">
          {shortNotice}{" "}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-medium text-pink-600 underline underline-offset-2 hover:text-pink-700"
          >
            Privacy
          </button>
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Privacy</DialogTitle>
            <DialogDescription className="sr-only">How we use device and connection information</DialogDescription>
          </DialogHeader>
          <div className="whitespace-pre-line text-sm leading-relaxed text-gray-700" data-testid="policy-text">
            {policyText}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Shows the published notice, or nothing at all.
 *
 * Nothing when the server has none to give, which is whenever device capture is
 * off, and nothing when the request fails: a customer must never be blocked, or
 * shown an error, because a notice could not be fetched.
 */
export function DeviceNotice({ baseUrl }: { baseUrl: string }) {
  const [text, setText] = useState<DeviceNoticeText | null>(null);

  useEffect(() => {
    if (!baseUrl) return;
    let cancelled = false;
    fetch(`${baseUrl}/api/site/privacy-notice`, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const d = json?.data;
        if (!cancelled && d && typeof d.shortNotice === "string" && typeof d.policyText === "string") {
          setText({ shortNotice: d.shortNotice, policyText: d.policyText });
        }
      })
      .catch(() => {
        // Deliberately silent.
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  if (!text) return null;
  return <DeviceNoticeView {...text} />;
}
