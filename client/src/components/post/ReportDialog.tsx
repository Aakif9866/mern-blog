import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Input";
import { api, errorMessage } from "@/lib/api";

const REASONS = [
  { value: "spam", label: "Spam or advertising" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate", label: "Hate speech" },
  { value: "misinformation", label: "Misinformation" },
  { value: "nsfw", label: "Sexual or graphic content" },
  { value: "plagiarism", label: "Plagiarism" },
  { value: "other", label: "Something else" },
];

export function ReportDialog({ open, onClose, targetType, targetId }: { open: boolean; onClose: () => void; targetType: "post" | "comment"; targetId: string }) {
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post("/reports", { targetType, targetId, reason, details: details || undefined });
      toast.success("Thanks. Our moderators will take a look.");
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Report this ${targetType}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} loading={busy}>
            Submit report
          </Button>
        </>
      }
    >
      <fieldset className="space-y-1">
        <legend className="mb-2 text-sm text-ink-soft">What's wrong with it?</legend>
        {REASONS.map((r) => (
          <label key={r.value} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted">
            <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="h-4 w-4 accent-brand-600" />
            <span className="text-sm">{r.label}</span>
          </label>
        ))}
      </fieldset>
      <Textarea className="mt-3" rows={3} maxLength={1000} placeholder="Anything else moderators should know? (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
    </Modal>
  );
}
