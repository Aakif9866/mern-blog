import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FolderPlus } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { api, errorMessage } from "@/lib/api";
import { keys } from "@/api/keys";
import type { Collection } from "@/lib/types";

/** Choose which collection a bookmark lives in (or none), creating collections inline. */
export function CollectionPicker({ open, onClose, current, onPick }: { open: boolean; onClose: () => void; current: string | null; onPick: (list: string | null) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data } = useQuery({ queryKey: keys.collections, queryFn: () => api.get<{ collections: Collection[] }>("/bookmarks/collections"), enabled: open });
  const create = useMutation({
    mutationFn: () => api.post<Collection>("/bookmarks/collections", { name }),
    onSuccess: (c) => {
      setName("");
      void qc.invalidateQueries({ queryKey: keys.collections });
      onPick(c._id);
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const option = (id: string | null, label: string) => (
    <button
      key={id ?? "none"}
      onClick={() => {
        onPick(id);
        onClose();
      }}
      className={clsx("flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm hover:bg-muted", current === id && "bg-muted font-medium")}
    >
      {label}
      {current === id && <Check className="h-4 w-4 text-brand-600" />}
    </button>
  );
  return (
    <Modal open={open} onClose={onClose} title="Save to collection" size="sm">
      <div className="space-y-1">
        {option(null, "Saved (no collection)")}
        {data?.collections.map((c) => option(c._id, c.name))}
      </div>
      <form
        className="mt-4 flex gap-2 border-t border-line pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate();
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New collection" maxLength={60} aria-label="New collection name" />
        <Button type="submit" variant="outline" loading={create.isPending} aria-label="Create collection">
          <FolderPlus className="h-4 w-4" />
        </Button>
      </form>
    </Modal>
  );
}
