import { User, PUBLIC_USER_FIELDS } from "../models/User";
import { Post, PUBLISHED } from "../models/Post";
import { enqueue } from "../lib/queue";
import { digestMail } from "../lib/emails";
import { logger } from "../lib/logger";

/** Weekly email: the top posts from the past week in each reader's followed tags. */
export async function sendWeeklyDigest(): Promise<number> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const top = await Post.find({ ...PUBLISHED, publishedAt: { $gte: since } })
    .sort({ trendingScore: -1, likesCount: -1 })
    .limit(50)
    .select("title slug excerpt tags author")
    .populate("author", PUBLIC_USER_FIELDS)
    .lean();
  if (!top.length) return 0;

  let sent = 0;
  const cursor = User.find({
    emailVerified: true,
    status: { $ne: "banned" },
    "emailPrefs.digest": true,
    $or: [{ lastDigestAt: null }, { lastDigestAt: { $lt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) } }],
  })
    .select("email name username followedTags")
    .cursor();

  for await (const user of cursor) {
    const mine = user.followedTags.length ? top.filter((p) => p.tags.some((t) => user.followedTags.includes(t))) : [];
    const picks = (mine.length >= 3 ? mine : [...mine, ...top.filter((p) => !mine.includes(p))]).slice(0, 5);
    const posts = picks.map((p) => {
      const author = p.author as unknown as { name?: string; username: string };
      return { title: p.title, slug: p.slug, excerpt: p.excerpt, author: author.name || author.username };
    });
    await enqueue("email", digestMail(user.email, user.name || user.username, posts));
    await User.updateOne({ _id: user._id }, { lastDigestAt: new Date() });
    sent++;
  }
  logger.info({ sent }, "weekly digest queued");
  return sent;
}
