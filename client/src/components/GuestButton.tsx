import { UserRound } from "lucide-react";
import { Button } from "./ui/Button";
import { useStartGuest } from "@/lib/guest";

export function GuestButton({ className, size = "lg", variant = "outline" }: { className?: string; size?: "md" | "lg"; variant?: "outline" | "ghost" }) {
  const start = useStartGuest();
  return (
    <Button variant={variant} size={size} className={className} loading={start.isPending} onClick={() => start.mutate()}>
      {!start.isPending && <UserRound className="h-4 w-4" />}
      Continue as guest
    </Button>
  );
}
