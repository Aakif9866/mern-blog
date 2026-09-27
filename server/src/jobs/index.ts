import { registerJob, startJobs } from "../lib/queue";
import { sendMail, type Mail } from "../lib/mailer";
import { logger } from "../lib/logger";
import { enrichPost } from "../services/ai.service";
import { publishDueScheduled, recomputeTrending } from "../services/post.service";
import { recomputeTrendingTags } from "../services/tag.service";
import { sendWeeklyDigest } from "../services/digest.service";
import { cleanupExpiredGuests } from "../services/user.service";

export function registerJobs(): void {
  registerJob<Mail>("email", sendMail);
  registerJob<{ postId: string }>("post:enrich", ({ postId }) => enrichPost(postId));
  registerJob("posts:publish-scheduled", async () => {
    const n = await publishDueScheduled();
    if (n) logger.info({ published: n }, "scheduled posts published");
  });
  registerJob("posts:trending", recomputeTrending);
  registerJob("tags:trending", recomputeTrendingTags);
  registerJob("guests:cleanup", async () => {
    const n = await cleanupExpiredGuests();
    if (n) logger.info({ deleted: n }, "expired guest accounts removed");
  });
  registerJob("digest:weekly", async () => {
    await sendWeeklyDigest();
  });
}

export async function startScheduledJobs(): Promise<void> {
  await startJobs([
    { name: "posts:publish-scheduled", everyMs: 60_000 },
    { name: "posts:trending", everyMs: 10 * 60_000 },
    { name: "tags:trending", everyMs: 30 * 60_000 },
    { name: "guests:cleanup", everyMs: 60 * 60_000 },
    // Mondays at 09:00 with BullMQ. In-process mode checks every 6 hours instead;
    // each reader's lastDigestAt keeps it to one email a week either way.
    { name: "digest:weekly", cron: "0 9 * * 1", everyMs: 6 * 60 * 60_000 },
  ]);
}
