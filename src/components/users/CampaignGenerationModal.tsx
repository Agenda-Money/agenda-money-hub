import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function CampaignGenerationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Campaign Generation</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p>This feature is coming soon.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
