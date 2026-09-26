import { useNavigate } from "react-router";
import { UserCheck, UserPlus } from "lucide-react";
import { Button } from "../ui/Button";
import { useFollow } from "@/api/hooks";
import { useMe } from "@/store";

export function FollowButton({ username, following, size = "sm" }: { username: string; following: boolean; size?: "sm" | "md" }) {
  const me = useMe();
  const navigate = useNavigate();
  const follow = useFollow(username);
  if (me?.username === username) return null;
  return (
    <Button
      size={size}
      variant={following ? "outline" : "primary"}
      loading={follow.isPending}
      onClick={() => (me ? follow.mutate(!following) : navigate(`/sign-in?next=/u/${username}`))}
      aria-pressed={following}
    >
      {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {following ? "Following" : "Follow"}
    </Button>
  );
}
