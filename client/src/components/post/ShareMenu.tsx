import { Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Menu, MenuItem } from "../ui/Menu";

export function ShareMenu({ title, url }: { title: string; url: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };
  const native = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      /* user cancelled */
    }
  };
  const enc = encodeURIComponent;
  return (
    <Menu
      align="right"
      trigger={({ toggle, open, id }) => (
        <button onClick={toggle} aria-expanded={open} aria-controls={id} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-muted hover:text-ink" aria-label="Share">
          <Share2 className="h-5 w-5" />
          <span className="hidden sm:inline">Share</span>
        </button>
      )}
    >
      {(close) => (
        <>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <MenuItem onClick={() => (close(), void native())} icon={<Share2 className="h-4 w-4" />}>
              Share via…
            </MenuItem>
          )}
          <MenuItem onClick={() => (close(), void copy())} icon={<Link2 className="h-4 w-4" />}>
            Copy link
          </MenuItem>
          <a className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-muted" href={`https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`} target="_blank" rel="noopener noreferrer" onClick={close}>
            Share on X
          </a>
          <a className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-muted" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noopener noreferrer" onClick={close}>
            Share on LinkedIn
          </a>
          <a className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-muted" href={`https://www.reddit.com/submit?url=${enc(url)}&title=${enc(title)}`} target="_blank" rel="noopener noreferrer" onClick={close}>
            Share on Reddit
          </a>
        </>
      )}
    </Menu>
  );
}
