/**
 * Demo community for local development: fictional members discussing films,
 * cricket, tech, food, careers and life. Every member is made up. Real
 * celebrities appear only as the subject of fan and critic discussion about
 * their public work, never as account holders.
 */

export interface SeedMember {
  username: string;
  name: string;
  bio: string;
  location: string;
  interests: string[];
  role?: "user" | "moderator" | "admin";
}

export interface SeedPost {
  by: string;
  title: string;
  tags: string[];
  daysAgo: number;
  body: string;
}

export interface SeedComment {
  by: string;
  text: string;
  replies?: SeedComment[];
}

export const members: SeedMember[] = [
  { username: "karthik_s", name: "Karthik Srinivasan", location: "Chennai", bio: "Film student. I rewatch Tamil climaxes frame by frame so you don't have to.", interests: ["kollywood", "filmmaking", "cinema"] },
  { username: "sravani_r", name: "Sravani Reddy", location: "Hyderabad", bio: "VFX compositor. Telugu cinema, sci-fi and far too much chai.", interests: ["tollywood", "vfx", "scifi", "careers"] },
  { username: "rohan_mehta", name: "Rohan Mehta", location: "Mumbai", bio: "Box-office nerd by night, chartered accountant by day.", interests: ["bollywood", "cinema", "finance"] },
  { username: "priya_nair", name: "Priya Nair", location: "Kochi", bio: "Culture journalist. Malayalam cinema evangelist.", interests: ["mollywood", "ott", "cinema"] },
  { username: "emily_carter", name: "Emily Carter", location: "Los Angeles", bio: "Screenwriter. Currently obsessed with Indian mass cinema.", interests: ["hollywood", "worldcinema", "writing"] },
  { username: "aditya_kumar", name: "Aditya Kumar", location: "Vijayawada", bio: "Telugu film reviewer. I believe in interval blocks.", interests: ["tollywood", "music", "cinema"] },
  { username: "harpreet_kaur", name: "Harpreet Kaur", location: "Toronto (from Ludhiana)", bio: "Punjabi music, immigrant life and the perfect makki di roti.", interests: ["music", "travel", "life"] },
  { username: "farhan_q", name: "Farhan Qureshi", location: "Lucknow", bio: "Urdu poetry, old Hindi film songs and slow evenings.", interests: ["music", "bollywood", "books"] },
  { username: "zoya_sheikh", name: "Zoya Sheikh", location: "Kolkata", bio: "Runs a college film society. Ray, Ghatak and everything after.", interests: ["worldcinema", "classics", "cinema"] },
  { username: "vikram_rao", name: "Vikram Rao", location: "Visakhapatnam", bio: "Cricket stats, bad takes and good biryani.", interests: ["cricket", "sports", "food"] },
  { username: "ananya_iyer", name: "Ananya Iyer", location: "Bengaluru", bio: "Backend engineer. Writing about AI, careers and working in tech.", interests: ["tech", "ai", "careers"] },
  { username: "sneha_patil", name: "Sneha Patil", location: "Pune", bio: "Two-time founder, one-time failure, full-time learner.", interests: ["startups", "careers", "tech"] },
  { username: "nikhil_joshi", name: "Nikhil Joshi", location: "New Delhi", bio: "UPSC aspirant, attempt number three. Notes on study and sanity.", interests: ["careers", "mentalhealth", "books"] },
  { username: "divya_raghavan", name: "Divya Raghavan", location: "Coimbatore", bio: "Nutritionist who refuses to give up biryani.", interests: ["food", "fitness", "health"] },
  { username: "lakshmi_prasad", name: "Lakshmi Prasad", location: "Mysuru", bio: "Retired banker. Now learning Python and gardening.", interests: ["finance", "tech", "life"] },
  { username: "meera_subramanian", name: "Meera Subramanian", location: "Madurai", bio: "Government school teacher. Tamil literature and small wins.", interests: ["books", "education", "kollywood"] },
  { username: "jake_morrison", name: "Jake Morrison", location: "Toronto", bio: "Sci-fi fan, IMAX loyalist, popcorn critic.", interests: ["hollywood", "scifi", "cinema"] },
  { username: "sofia_ramirez", name: "Sofía Ramírez", location: "Madrid", bio: "Programs a world-cinema festival. Subtitles are not a barrier.", interests: ["worldcinema", "cinema", "travel"] },
  { username: "kenji_watanabe", name: "Kenji Watanabe", location: "Tokyo", bio: "Anime editor. Discovered Telugu cinema in a Tokyo theatre.", interests: ["anime", "worldcinema", "tollywood"] },
  { username: "aisha_bello", name: "Aisha Bello", location: "Lagos", bio: "Product manager. Nollywood, tech and jollof diplomacy.", interests: ["worldcinema", "tech", "startups"] },
  { username: "chidi_eze", name: "Chidi Eze", location: "Lagos", bio: "Remote developer for a Bengaluru startup. Timezone warrior.", interests: ["careers", "tech", "remote"] },
  { username: "grace_lim", name: "Grace Lim", location: "Singapore", bio: "Financial planner who learned budgeting from K-dramas.", interests: ["finance", "kdrama", "life"] },
  { username: "rahul_dev", name: "Rahul Dev Sharma", location: "Bengaluru", bio: "Strength coach. Science over shortcuts.", interests: ["fitness", "health", "sports"] },
  { username: "tanvir_ahmed", name: "Tanvir Ahmed", location: "Kolkata", bio: "Photographer. Chasing light, street food and festivals.", interests: ["travel", "culture", "food"] },
  { username: "neha_gupta", name: "Neha Gupta", location: "Jaipur", bio: "Bollywood dance teacher and unapologetic 90s fan.", interests: ["bollywood", "music", "fitness"] },
];

const p = (...paras: string[]) => paras.map((x) => (x.startsWith("<") ? x : `<p>${x}</p>`)).join("");

export const posts: SeedPost[] = [
  {
    by: "karthik_s",
    title: "Lokesh Kanagaraj's cinematic universe is the boldest experiment in Indian cinema right now",
    tags: ["kollywood", "filmmaking", "cinema"],
    daysAgo: 3,
    body: p(
      "When Kaithi released in 2019, nobody walked out of the theatre thinking it was the first chapter of anything. Then Vikram (2022) pulled its characters back in, and Leo (2023) was folded into the same world. Suddenly Tamil audiences were doing what Marvel fans do: rewatching old films for clues.",
      "<h2>Why it works</h2>",
      "<ul><li><strong>Each film stands alone.</strong> You can enjoy Kaithi without knowing anything else exists.</li><li><strong>The connections are earned.</strong> Characters return because the story needs them, not because a studio needs a crossover.</li><li><strong>It's grounded.</strong> Drug cartels, police units and night-time chases, not multiverses.</li></ul>",
      "My worry is fatigue. Hollywood showed us that a shared universe can turn films into homework. The day an LCU film only makes sense if you've seen three others, the magic is gone.",
      "What do you think: is a cinematic universe good for Tamil cinema, or does it narrow what big films can be?"
    ),
  },
  {
    by: "sravani_r",
    title: "What four years in VFX taught me about why Telugu films look so big",
    tags: ["tollywood", "vfx", "careers"],
    daysAgo: 6,
    body: p(
      "People ask me how Telugu films pull off scale on budgets that would barely cover one Hollywood action sequence. From inside a compositing team, here's what I see.",
      "<h2>Planning beats money</h2>",
      "The best directors we work with storyboard every VFX shot before the shoot. When the plate is shot correctly, a two-day fix becomes a two-hour one. The films that look expensive are usually the ones that were planned hardest.",
      "<h2>Hyderabad has become a VFX city</h2>",
      "A lot of the talent that worked on international projects stayed here. That means a Telugu film can get artists who have done creature work and huge environment builds without flying anyone in.",
      "<blockquote><p>A good VFX shot is one the audience never talks about.</p></blockquote>",
      "If you're a student thinking about VFX as a career: learn compositing fundamentals and photography before software. Tools change every few years. Light doesn't."
    ),
  },
  {
    by: "rohan_mehta",
    title: "Is the \"pan-India film\" a genre now, or just a marketing label?",
    tags: ["bollywood", "tollywood", "discussion"],
    daysAgo: 2,
    body: p(
      "Since Baahubali, every big-budget film seems to launch in five languages at once. Some of them genuinely travel. Others feel like a regional film with a few stars added from other industries to sell satellite rights.",
      "My test is simple: would this story work if you removed the dubbing announcement from the poster? RRR would. A lot of films marketed as \"pan-India\" wouldn't.",
      "Curious what everyone thinks. Which recent film earned the pan-India label for you, and which one just borrowed it?"
    ),
  },
  {
    by: "priya_nair",
    title: "Why Malayalam cinema keeps winning with small budgets",
    tags: ["mollywood", "cinema", "ott"],
    daysAgo: 9,
    body: p(
      "2024 was a remarkable year for Malayalam cinema. Manjummel Boys, a survival drama about a group of friends at the Guna Caves in Kodaikanal, became a huge hit well beyond Kerala. Aavesham gave Fahadh Faasil one of his most gleefully unhinged roles. Neither needed a massive budget.",
      "<h2>Three habits I keep noticing</h2>",
      "<ol><li><strong>Writing first.</strong> Scripts are workshopped for months. You can feel it in the dialogue.</li><li><strong>Actors who disappear.</strong> Stars here take small, strange roles and nobody's image suffers for it.</li><li><strong>OTT made the rest of India curious.</strong> Subtitled Malayalam films found audiences in Delhi and Mumbai who would never have walked into a theatre for them.</li></ol>",
      "The risk now is success itself. When budgets grow, the pressure to play safe grows with them. I hope the industry remembers what got it here."
    ),
  },
  {
    by: "emily_carter",
    title: "An LA screenwriter's week binge-watching Indian films",
    tags: ["hollywood", "worldcinema", "writing"],
    daysAgo: 11,
    body: p(
      "A friend dared me to spend a week watching only Indian films. Seven days, eleven films, four languages. Here's what surprised a Hollywood writer.",
      "<ul><li><strong>The interval is a structural tool.</strong> Indian writers build a mid-film twist the way we build an act-two break, and audiences expect it.</li><li><strong>Songs aren't breaks from the story.</strong> In the best ones, the relationship moves forward more in four minutes than in twenty of dialogue.</li><li><strong>Sincerity isn't embarrassing.</strong> Hollywood hedges big emotion with irony. These films don't, and it's refreshing.</li></ul>",
      "My favourite of the week was 12th Fail. It's about a young man chasing the civil services exam, and I cried more than I'd like to admit. It's a reminder that underdog stories work in any language when the details are specific.",
      "Give me recommendations for week two!"
    ),
  },
  {
    by: "aditya_kumar",
    title: "Naatu Naatu at the Oscars: what actually changed for Telugu cinema?",
    tags: ["tollywood", "music", "cinema"],
    daysAgo: 16,
    body: p(
      "In March 2023, M. M. Keeravani and lyricist Chandrabose won the Oscar for Best Original Song for Naatu Naatu from RRR. I remember watching the live stream at 5 a.m. with half my building awake.",
      "So what changed? Honestly, less at home than people expected, and more abroad. International audiences now know Telugu cinema as its own thing, not just \"Bollywood\". Film festivals, streaming platforms and even anime fans in Japan started paying attention.",
      "What didn't change: Telugu audiences never needed an award to love their own music. Keeravani had been composing iconic songs for decades. The Oscar just let the rest of the world catch up.",
      "Where were you when it won?"
    ),
  },
  {
    by: "harpreet_kaur",
    title: "Diljit's rise shows regional artists don't need to \"cross over\" anymore",
    tags: ["music", "punjabi", "culture"],
    daysAgo: 5,
    body: p(
      "In 2023 Diljit Dosanjh became the first Punjabi artist to perform at Coachella. He sang in Punjabi, wore a turban, and the crowd sang back. Then came the Dil-Luminati tour and a string of sold-out stadiums.",
      "For those of us who grew up being told that Punjabi music was \"too regional\" for the mainstream, that felt like a correction. He didn't switch languages to go global. The world came to him.",
      "His acting helps too. Amar Singh Chamkila (2024) was a serious film about a real Punjabi folk singer, and it reached people who had never heard of Chamkila before.",
      "As an immigrant in Toronto, I can tell you: hearing Punjabi on a festival stage made a lot of kids here stand a little taller."
    ),
  },
  {
    by: "farhan_q",
    title: "Old Hindi film lyrics vs today's songs: am I just getting old?",
    tags: ["music", "bollywood", "discussion"],
    daysAgo: 1,
    body: p(
      "My nephew played me his playlist on the drive to Lucknow. The beats were great. I could not tell you what a single song was about.",
      "When I was his age, film songs were poems. Writers like Sahir Ludhianvi and Gulzar put Urdu poetry into the mouths of film heroes, and a whole country learned the words.",
      "But I also know every generation says this. My father thought the 80s songs I loved were noise.",
      "So I'm asking honestly: which recent Hindi film songs have lyrics you think will still be quoted in thirty years?"
    ),
  },
  {
    by: "zoya_sheikh",
    title: "Rewatching Satyajit Ray's Apu trilogy with nineteen-year-olds",
    tags: ["worldcinema", "classics", "cinema"],
    daysAgo: 20,
    body: p(
      "Our film society screened Pather Panchali (1955), Aparajito (1956) and Apur Sansar (1959) over three Fridays. I expected phones out by the twenty-minute mark. Instead, the room went silent during the train sequence, the same way it has for seventy years.",
      "What struck the students most was how little happens, and how much you feel. No background score telling you when to cry. Just a family, a village and time passing.",
      "One student said: \"It feels like a memory I didn't know I had.\" I've been programming films for eight years and I don't think I've heard a better review.",
      "If you've never seen them, start with Pather Panchali. Watch it on the biggest screen you can find, with your phone in another room."
    ),
  },
  {
    by: "vikram_rao",
    title: "Rohit and Virat retiring from T20Is after the 2024 World Cup was perfect timing. Change my mind.",
    tags: ["cricket", "sports", "discussion"],
    daysAgo: 7,
    body: p(
      "India beat South Africa in Barbados to win the 2024 T20 World Cup, and within hours Virat Kohli and Rohit Sharma announced they were done with T20 internationals. Ravindra Jadeja followed soon after.",
      "Some of my friends called it too early. I think it was the best possible exit: on top, with a trophy, and leaving room for a new generation in the format that rewards young legs and fearless batting.",
      "Compare that with how many greats hang on until they're dropped.",
      "Change my mind. Was it right, or should they have played one more cycle?"
    ),
  },
  {
    by: "vikram_rao",
    title: "Honest question: which cricket format do you actually watch end to end?",
    tags: ["cricket", "sports", "question"],
    daysAgo: 13,
    body: p(
      "I say I love Test cricket. I also check the score of a Test between Zoom calls and only watch the last session live.",
      "T20 I watch ball by ball, but I forget the matches by next week. ODIs I barely watch at all unless it's a World Cup.",
      "Be honest: which format do you watch completely, and which do you just claim to love?"
    ),
  },
  {
    by: "ananya_iyer",
    title: "I'm a backend engineer and AI coding tools changed my job in a year. Honest notes.",
    tags: ["tech", "ai", "careers"],
    daysAgo: 4,
    body: p(
      "A year ago I used AI tools for boilerplate. Today they write first drafts of most of my code. Here's what actually changed, without the hype or the doom.",
      "<h2>What got faster</h2>",
      "<ul><li>Writing tests. I describe the cases, review the output, fix the edge cases it missed.</li><li>Reading unfamiliar code. Asking \"what does this module do and who calls it?\" saves hours.</li><li>Migrations and refactors that are tedious but well defined.</li></ul>",
      "<h2>What didn't</h2>",
      "<ul><li>Deciding what to build. Still meetings, still whiteboards, still arguments.</li><li>Debugging production at 2 a.m. Context lives in people's heads and old Slack threads.</li><li>Reviewing. I review more code now, not less, because more gets written.</li></ul>",
      "My advice to juniors: get very good at reading and reviewing code. Typing speed was never the job."
    ),
  },
  {
    by: "sneha_patil",
    title: "Lessons from shutting down my first startup",
    tags: ["startups", "careers", "life"],
    daysAgo: 18,
    body: p(
      "We raised a small seed round, built a B2B logistics tool, got twenty paying customers, and ran out of money in month nineteen. Here's what I'd tell myself on day one.",
      "<ol><li><strong>Talk to customers before writing code.</strong> We built three features nobody used because we assumed.</li><li><strong>Revenue is the only validation.</strong> Pilots, letters of intent and \"we'd definitely pay\" are not revenue.</li><li><strong>Decide your shutdown line early.</strong> We kept going three months too long out of pride, and paid for it in stress.</li><li><strong>Take care of your team on the way out.</strong> Two of my engineers now work at companies I introduced them to. That matters more to me than the valuation we never got.</li></ol>",
      "I'm building again. Smaller, slower, and with customers from week one."
    ),
  },
  {
    by: "nikhil_joshi",
    title: "Third UPSC attempt: how I'm handling burnout",
    tags: ["careers", "mentalhealth", "education"],
    daysAgo: 8,
    body: p(
      "Everyone in Mukherjee Nagar has a story. Mine: two attempts, one prelims cleared, one mains that didn't go my way. Here's what's keeping me sane in attempt three.",
      "<ul><li><strong>Fixed hours, not endless hours.</strong> I study 9 to 6 and stop. My scores went up when my hours went down.</li><li><strong>One day off a week.</strong> Non-negotiable. Cricket with friends, phone calls home, no current affairs.</li><li><strong>A plan B that I actually like.</strong> Knowing I'd be happy teaching if this doesn't work out took a huge weight off.</li></ul>",
      "12th Fail made a lot of people cry because it showed our lives honestly. What I want people to know is that most of us won't become IPS officers, and that has to be okay too.",
      "If you're preparing too, how do you manage?"
    ),
  },
  {
    by: "divya_raghavan",
    title: "Hyderabadi vs Ambur vs Kolkata biryani: a nutritionist settles nothing",
    tags: ["food", "culture", "discussion"],
    daysAgo: 12,
    body: p(
      "I'm a nutritionist, so people expect me to say biryani is bad for you. I will not be saying that.",
      "<ul><li><strong>Hyderabadi:</strong> the dum-cooked royalty. Long-grain rice, layered, rich and heavily spiced.</li><li><strong>Ambur:</strong> from Tamil Nadu, made with short-grain seeraga samba rice and a lighter touch. Underrated outside the south.</li><li><strong>Kolkata:</strong> lighter on spice, perfumed, and yes, it has a potato. The potato is correct. Fight me.</li></ul>",
      "Nutrition tip that actually matters: pair it with raita and a salad, and watch the portion, not the dish.",
      "Now tell me which one wins, and be prepared to defend it."
    ),
  },
  {
    by: "lakshmi_prasad",
    title: "What 35 years in banking taught me about SIPs and patience",
    tags: ["finance", "life"],
    daysAgo: 22,
    body: p(
      "I started at a nationalised bank in 1988 and retired in 2023. I watched customers get rich and poor in every possible way. The ones who did well mostly did one boring thing: they kept investing a fixed amount every month and left it alone.",
      "<h2>What I tell my grandchildren</h2>",
      "<ul><li>Start small but start now. Time in the market does more work than cleverness.</li><li>Keep six months of expenses in an emergency fund first.</li><li>If someone promises guaranteed high returns, walk away. I have seen too many families lose savings to \"schemes\".</li><li>Buy term insurance, not insurance-cum-investment products you don't understand.</li></ul>",
      "This isn't financial advice for your situation, just what a long career taught me. Patience is the most underrated investment skill."
    ),
  },
  {
    by: "meera_subramanian",
    title: "Tamil books every teenager should read, and why I teach them",
    tags: ["books", "education", "tamil"],
    daysAgo: 25,
    body: p(
      "I've taught Tamil literature in a government school in Madurai for fourteen years. Every June I make a list for students who say they \"don't like reading\". It works more often than you'd think.",
      "<ul><li><strong>Ponniyin Selvan by Kalki Krishnamurthy.</strong> Yes, it's long. Yes, they finish it, especially since the films came out.</li><li><strong>Poems of Subramania Bharati.</strong> Short, fierce and easy to memorise. Teenagers love a rebel.</li><li><strong>Thirukkural.</strong> One couplet a day. It fits in a WhatsApp status and still says something true.</li></ul>",
      "The trick is never to call it homework. I read the first chapter aloud and stop at a cliffhanger. Works every year."
    ),
  },
  {
    by: "jake_morrison",
    title: "Dune: Part Two proves big sci-fi can still be an auteur's film",
    tags: ["hollywood", "scifi", "cinema"],
    daysAgo: 14,
    body: p(
      "Denis Villeneuve made a blockbuster that looks and sounds like nobody else's. The black-and-white arena sequence alone is braver than most franchise films manage in their entire runtime.",
      "What I love is that it trusts the audience. Long silences, strange rituals and a story that turns its own hero into a warning. That's not how you usually sell toys.",
      "See it on the biggest screen you can. It was built for IMAX, and on a laptop you're watching half the film.",
      "Hot take for the comments: this is the best sci-fi sequel since The Empire Strikes Back."
    ),
  },
  {
    by: "sofia_ramirez",
    title: "How RRR introduced a lot of European audiences to Indian cinema",
    tags: ["worldcinema", "tollywood", "cinema"],
    daysAgo: 19,
    body: p(
      "At our festival in Madrid, Indian films used to mean a single slot for an art-house drama. After RRR became a streaming hit in 2022, our audience surveys changed. People started asking for \"more films like that one\".",
      "What worked for European viewers: the sincerity, the friendship at the centre, and set pieces that don't need translation. You don't need to know anything about 1920s India to feel the interval block.",
      "The challenge now is going deeper. RRR opened the door, but Indian cinema is a dozen industries with very different voices. This year we're programming a Malayalam and a Marathi film alongside the big Telugu titles.",
      "Which Indian film would you show a European audience that has only seen RRR?"
    ),
  },
  {
    by: "kenji_watanabe",
    title: "Anime and Indian mass films have more in common than you think",
    tags: ["anime", "worldcinema", "tollywood"],
    daysAgo: 10,
    body: p(
      "I first saw an Indian film in a small Tokyo theatre where people were cheering like it was a football match. RRR had a long, successful run in Japan, and after one screening I understood why.",
      "<ul><li><strong>The power-up moment.</strong> In shōnen anime, the hero's turning point gets a slow-motion build and a musical sting. Indian mass films have the exact same grammar.</li><li><strong>Friendship as the core.</strong> Rivals who become brothers is the plot of half the anime I've edited.</li><li><strong>Emotion without apology.</strong> Both traditions let characters cry, shout and swear oaths.</li></ul>",
      "I think this is why Japanese audiences took to Indian cinema so fast. We already knew the language."
    ),
  },
  {
    by: "aisha_bello",
    title: "Nollywood and Tollywood: two industries that learned to punch above their budget",
    tags: ["worldcinema", "tollywood", "nollywood"],
    daysAgo: 24,
    body: p(
      "Nigeria's film industry is one of the most prolific in the world by number of films made. Like Telugu cinema, it grew by serving a huge home audience first and worrying about the world later.",
      "Both industries also figured out distribution before prestige: video markets and satellite TV for Nollywood, single screens and dubbing for Tollywood. Streaming then carried both to global audiences.",
      "Where Nollywood can learn from Tollywood: investing in spectacle and craft departments. Where Tollywood can learn from Nollywood: speed, and telling everyday stories about ordinary people.",
      "I'd love to see a co-production someday. Lagos and Hyderabad energy in one film? Take my money."
    ),
  },
  {
    by: "grace_lim",
    title: "K-dramas taught me more about money than any finance course",
    tags: ["finance", "kdrama", "life"],
    daysAgo: 15,
    body: p(
      "I'm a financial planner, and I'll admit it: some of my best client analogies come from Korean dramas.",
      "<ul><li><strong>The chaebol heir storyline:</strong> inherited wealth without skills disappears fast. Build your own income.</li><li><strong>The rooftop apartment:</strong> living below your means in your twenties buys you freedom in your thirties.</li><li><strong>The loan shark subplot:</strong> high-interest debt is the villain in every financial story, fictional or real.</li></ul>",
      "Entertainment sticks in memory better than spreadsheets. Whatever gets you to open a savings account, I'll take it."
    ),
  },
  {
    by: "rahul_dev",
    title: "Actor transformations are impressive. Please don't copy their diets.",
    tags: ["fitness", "health", "cinema"],
    daysAgo: 17,
    body: p(
      "Every time a big film releases, clients show me a before-and-after of the lead actor and ask for \"that plan\". Aamir Khan famously gained weight and then got very lean to play two stages of a wrestler's life in Dangal. That took months, a team of experts and medical supervision.",
      "Here's what you don't see: nutritionists planning every meal, doctors monitoring bloodwork, and schedules built around one goal. Many of these transformations are not meant to be sustained after the shoot.",
      "<h2>What actually works for normal humans</h2>",
      "<ul><li>Enough protein, spread across the day.</li><li>Strength training three times a week.</li><li>Sleep, which is free and wildly underrated.</li><li>Patience measured in months, not weeks.</li></ul>",
      "Admire the discipline. Copy the consistency, not the crash diet."
    ),
  },
  {
    by: "chidi_eze",
    title: "Working remotely from Lagos for a Bengaluru startup",
    tags: ["careers", "remote", "tech"],
    daysAgo: 21,
    body: p(
      "Four and a half hours of time difference, two cultures that both run on tea and jollof-level arguments, and one Slack workspace. Here's what I've learned in a year.",
      "<ul><li><strong>Overlap hours are sacred.</strong> We protect 11:30 a.m. to 3 p.m. Lagos time for meetings and keep the rest for deep work.</li><li><strong>Write everything down.</strong> A good design doc beats three calls.</li><li><strong>Learn the festivals.</strong> Nobody replies during Diwali week, and my team now knows not to schedule releases around Eid.</li></ul>",
      "The best part: my colleagues have taught me more about Indian food than I ever expected, and I've converted two of them to suya."
    ),
  },
  {
    by: "tanvir_ahmed",
    title: "Durga Puja pandal hopping in Kolkata: a photographer's guide",
    tags: ["travel", "culture", "photography"],
    daysAgo: 28,
    body: p(
      "UNESCO added Durga Puja in Kolkata to its list of Intangible Cultural Heritage in 2021. If you've never experienced it, the city turns into an open-air art gallery for five days.",
      "<ul><li><strong>Go late.</strong> The crowds thin after midnight and the lighting is at its best.</li><li><strong>Wear comfortable shoes.</strong> You will walk ten kilometres and not notice.</li><li><strong>Eat between pandals.</strong> Kathi rolls, phuchka and a mishti doi to finish.</li><li><strong>Ask before photographing people.</strong> Most will say yes, and you'll get better portraits.</li></ul>",
      "The pandals are temporary, sometimes built for months and gone in a week. That impermanence is what makes it beautiful."
    ),
  },
  {
    by: "karthik_s",
    title: "Rajinikanth or Kamal Haasan: who shaped Tamil cinema more?",
    tags: ["kollywood", "cinema", "discussion"],
    daysAgo: 30,
    body: p(
      "This is the debate that has ended friendships in Chennai. Both debuted in the 1970s and both are still making films. Let me try to be fair.",
      "<strong>Rajinikanth</strong> defined what a Tamil mass hero is. The style, the dialogue delivery, the fan culture on release day. His screen presence is an entire genre.",
      "<strong>Kamal Haasan</strong> pushed what Tamil cinema could attempt: new technology, unusual roles, prosthetics, scripts that took real risks.",
      "My answer: Rajini shaped how Tamil cinema is celebrated. Kamal shaped how it's made. We needed both.",
      "Now, which side are you on?"
    ),
  },
  {
    by: "sravani_r",
    title: "Kalki 2898 AD's world-building: ambitious mess or glimpse of the future?",
    tags: ["tollywood", "scifi", "vfx"],
    daysAgo: 26,
    body: p(
      "Nag Ashwin's Kalki 2898 AD (2024) tried to mix Indian mythology with post-apocalyptic sci-fi, starring Prabhas, Amitabh Bachchan, Deepika Padukone and Kamal Haasan. As a VFX person, I watched it three times.",
      "<strong>What worked:</strong> the production design of Kasi and the Complex is genuinely original. It doesn't look like a copy of Blade Runner or Mad Max. The last act, when the mythology fully arrives, is spectacular.",
      "<strong>What didn't:</strong> the first half takes a long time to explain its world, and some of the humour fights with the tone.",
      "My verdict: an ambitious film that proves Indian sci-fi doesn't have to borrow Western mythology. I'd rather have ten ambitious messes than one more safe remake."
    ),
  },
  {
    by: "rohan_mehta",
    title: "12th Fail and Laapataa Ladies show that Bollywood's best stories are the quiet ones",
    tags: ["bollywood", "cinema"],
    daysAgo: 23,
    body: p(
      "While everyone was tracking opening-weekend numbers of big-star films, two small films quietly became the ones people actually recommended to their parents.",
      "12th Fail, directed by Vidhu Vinod Chopra, is based on the life of IPS officer Manoj Kumar Sharma and his struggle through the civil services exam. Vikrant Massey carries it with enormous honesty.",
      "Laapataa Ladies, directed by Kiran Rao, is a funny, sharp story about two brides who get switched on a train. It was selected as India's official entry to the Academy Awards.",
      "The lesson for producers: word of mouth is still the most powerful marketing budget. Make something people want to talk about."
    ),
  },
  {
    by: "priya_nair",
    title: "Should OTT platforms release regional films with dubbed audio by default?",
    tags: ["ott", "cinema", "question"],
    daysAgo: 6,
    body: p(
      "My parents watch everything dubbed in Malayalam. My friends in Delhi refuse dubs and only watch with subtitles. Platforms seem stuck between the two.",
      "Arguments for dubs by default: more people watch, and older viewers or people who find reading subtitles tiring aren't excluded.",
      "Arguments against: a performance is also a voice. Watching Fahadh Faasil dubbed over is watching half an actor.",
      "What do you prefer, and should it be the platform's default or always a choice?"
    ),
  },
  {
    by: "farhan_q",
    title: "What A. R. Rahman taught a generation about sound",
    tags: ["music", "kollywood", "bollywood"],
    daysAgo: 29,
    body: p(
      "When Roja released in 1992, people who couldn't understand a word of Tamil bought the cassette anyway. Something about the sound was new: cleaner, layered, and unafraid of silence.",
      "Over the next three decades A. R. Rahman moved between Tamil, Hindi and international films, and in 2009 won two Oscars for Slumdog Millionaire. But for me his real legacy is that he made an entire generation listen to production, not just melody.",
      "Put on good headphones and listen to any of his 90s soundtracks. You'll hear small things in the corners of the mix that most composers wouldn't have bothered with.",
      "What's your favourite Rahman album, and why?"
    ),
  },
  {
    by: "emily_carter",
    title: "Oppenheimer's Best Picture win and the return of the three-hour movie",
    tags: ["hollywood", "cinema"],
    daysAgo: 27,
    body: p(
      "Christopher Nolan's Oppenheimer won Best Picture at the 2024 Oscars, and Cillian Murphy won Best Actor. A three-hour film about physics and politics made serious money in theatres. Studio executives are still processing that.",
      "As a writer, the lesson I take is that length isn't the problem. Boredom is. Audiences will sit for three hours if every scene earns its place.",
      "Indian audiences figured this out decades ago, to be fair. Hollywood is just catching up."
    ),
  },
  {
    by: "zoya_sheikh",
    title: "Is it okay to walk out of a film halfway?",
    tags: ["cinema", "discussion", "question"],
    daysAgo: 4,
    body: p(
      "Last week I walked out of a film for the first time in years. I felt guilty the whole way home, like I had broken a rule.",
      "Part of me thinks you owe a film your full attention. The other part thinks life is short and tickets are expensive.",
      "Do you finish every film you start? What's the last one you walked out of?"
    ),
  },
  {
    by: "harpreet_kaur",
    title: "Moving from Ludhiana to Toronto: what nobody tells you",
    tags: ["travel", "life", "careers"],
    daysAgo: 32,
    body: p(
      "Everyone warns you about the cold. Nobody warns you about the silence. In Ludhiana my house was never quiet. Here, weekends can go by without anyone knocking on the door.",
      "<ul><li>Your degree may not be recognised the way you expect. Research licensing before you land.</li><li>Your first job might be below your experience. It's a step, not a verdict.</li><li>Find your community early: a gurdwara, a cricket club or a WhatsApp group of people from home.</li><li>Call your parents on video. They need it as much as you do.</li></ul>",
      "Five years in, I love my life here. But I cook sarson da saag every winter just to make the apartment smell like home."
    ),
  },
  {
    by: "meera_subramanian",
    title: "Teaching in a government school: the small wins that keep me going",
    tags: ["education", "life"],
    daysAgo: 9,
    body: p(
      "A student who wouldn't speak in class for a year recited a Bharati poem at our annual day. Her mother cried. I cried. The headmaster pretended he had something in his eye.",
      "People talk about government schools as if they are only a problem to be fixed. They are also full of teachers staying late, buying chalk with their own money and fighting for their students.",
      "If you're a professional with a free Saturday, many schools would love a guest session on your job. Kids can't want careers they've never heard of."
    ),
  },
  {
    by: "ananya_iyer",
    title: "How do you explain your tech job to your grandparents?",
    tags: ["tech", "life", "question"],
    daysAgo: 3,
    body: p(
      "My paati still thinks I \"repair computers\". I've tried explaining backend engineering five times. The best I've managed: \"When you pay your electricity bill on the app, I build the part that makes sure the money goes to the right place.\"",
      "She nodded and asked if I could fix her TV remote.",
      "How do you explain your job to your family?"
    ),
  },
  {
    by: "aditya_kumar",
    title: "Allu Arjun's National Award for Pushpa: a win for mass cinema?",
    tags: ["tollywood", "cinema"],
    daysAgo: 34,
    body: p(
      "Allu Arjun won the National Film Award for Best Actor for Pushpa: The Rise, becoming the first Telugu actor to win in that category. For years, national awards seemed reserved for small, serious films. A mass entertainer winning felt like a statement.",
      "Some critics argued that a commercial performance shouldn't beat subtler work. I disagree. Playing a larger-than-life character believably, with a specific body language and dialect that millions imitated, is hard craft.",
      "Mass cinema isn't the opposite of good acting. It's a different register, and it deserves to be judged on its own terms."
    ),
  },
  {
    by: "karthik_s",
    title: "Vijay stepping into politics: what it means for Tamil cinema",
    tags: ["kollywood", "cinema", "discussion"],
    daysAgo: 12,
    body: p(
      "Actor Vijay launched his political party, Tamilaga Vettri Kazhagam, in 2024 and said he would step away from films to focus on politics. For an industry where he is one of the biggest box-office draws, that's a huge shift.",
      "Tamil Nadu has a long history of film stars in politics, so the move isn't unprecedented. The question for cinema is what happens to the space he leaves. Big-star films carry a lot of the industry's economics: theatres, distributors and hundreds of technicians.",
      "I'm not interested in debating his politics here. I'm interested in the industry. Who fills that space, and does it open the door for different kinds of films?"
    ),
  },
  {
    by: "divya_raghavan",
    title: "What's one dish from your state that deserves national fame?",
    tags: ["food", "question", "culture"],
    daysAgo: 2,
    body: p(
      "Everyone knows butter chicken and dosa. I want the dishes that don't travel but should.",
      "I'll start: Kongunadu-style kola urundai from my part of Tamil Nadu. Spiced meatballs that should be on every menu in the country.",
      "Your turn. One dish, one state, and why."
    ),
  },
  {
    by: "lakshmi_prasad",
    title: "Retired at 60, learning to code at 63",
    tags: ["tech", "life", "education"],
    daysAgo: 5,
    body: p(
      "My granddaughter set up Python on my laptop \"for fun\". Three months later I've written a small program that tracks my garden's watering schedule and tells me which plants I keep forgetting.",
      "What I've learned: error messages are not personal insults, and beginner tutorials assume you're twenty. Slow down, type every example yourself, and don't be embarrassed to ask.",
      "If you're older and curious: start. The computer doesn't care how old you are."
    ),
  },
  {
    by: "jake_morrison",
    title: "Which movie did you expect to hate but ended up loving?",
    tags: ["cinema", "question", "hollywood"],
    daysAgo: 1,
    body: p(
      "Mine was a three-hour Telugu action film a friend dragged me to. I went in skeptical and came out wanting to buy the soundtrack. It was RRR, of course.",
      "What's yours?"
    ),
  },
  {
    by: "neha_gupta",
    title: "Teaching 90s Bollywood choreography to Gen Z: a field report",
    tags: ["bollywood", "music", "fitness"],
    daysAgo: 14,
    body: p(
      "I run a dance studio in Jaipur. This month's theme was 90s Bollywood, and my Gen Z students came in expecting cringe. They left sweating and asking for more.",
      "The 90s steps look simple and are secretly exhausting: big arm movements, shoulder work and a lot of expression. You can't do them with a straight face, and that's the point.",
      "My students' verdict: \"It's cardio, but make it cinema.\" I'm putting that on the studio wall.",
      "Which 90s song should be next month's routine?"
    ),
  },
];

/** Comment threads keyed by post title. Replies nest one or two levels. */
export const threads: Record<string, SeedComment[]> = {
  "Lokesh Kanagaraj's cinematic universe is the boldest experiment in Indian cinema right now": [
    { by: "aditya_kumar", text: "Agree that each film standing alone is the key. The moment you need a flowchart, you've lost the family audience.", replies: [{ by: "karthik_s", text: "Exactly. My amma loved Vikram without knowing it was connected to anything." }] },
    { by: "emily_carter", text: "As a Hollywood writer: please learn from our mistakes. We turned films into TV episodes with bigger budgets.", replies: [{ by: "jake_morrison", text: "Painfully accurate @emily_carter" }] },
    { by: "meera_subramanian", text: "My students talk about the LCU the way we used to talk about Ponniyin Selvan characters. That's not a bad thing." },
  ],
  "What four years in VFX taught me about why Telugu films look so big": [
    { by: "kenji_watanabe", text: "\"Planning beats money\" is true in anime too. Storyboards save lives." },
    { by: "nikhil_joshi", text: "Is VFX a stable career in India? Asking for my cousin who wants to leave engineering.", replies: [{ by: "sravani_r", text: "More stable than five years ago. Start with a good compositing course and build a reel. Happy to review his reel, send it my way." }] },
  ],
  "Is the \"pan-India film\" a genre now, or just a marketing label?": [
    { by: "aditya_kumar", text: "Baahubali and RRR earned it. A lot of what came after just added a Hindi dub and a cameo.", replies: [{ by: "rohan_mehta", text: "The cameo economy is real. One day of shooting, three states of posters." }] },
    { by: "priya_nair", text: "Counterpoint: Malayalam films travel through OTT without ever calling themselves pan-India. Maybe the best films don't need the label." },
    { by: "sofia_ramirez", text: "From Europe, all of it just looks like \"Indian cinema\", and that's a problem for the smaller industries." },
  ],
  "Why Malayalam cinema keeps winning with small budgets": [
    { by: "zoya_sheikh", text: "Manjummel Boys had our whole film society talking. The last act is pure tension." },
    { by: "rohan_mehta", text: "Bollywood producers should study the writing rooms in Kochi. Seriously.", replies: [{ by: "priya_nair", text: "Some are! A few Hindi remakes of Malayalam films are in the works every year." }] },
  ],
  "An LA screenwriter's week binge-watching Indian films": [
    { by: "zoya_sheikh", text: "Week two: Pather Panchali, Kumbalangi Nights and Kaithi. Three very different Indias." },
    { by: "karthik_s", text: "Add Vikram (2022). The interval block will ruin action films for you." },
    { by: "nikhil_joshi", text: "12th Fail made me call my parents after watching it. Glad it reached you too." },
  ],
  "Naatu Naatu at the Oscars: what actually changed for Telugu cinema?": [
    { by: "kenji_watanabe", text: "In Tokyo, people were dancing Naatu Naatu at a wedding I attended. So, something changed!" },
    { by: "vikram_rao", text: "I was at a cricket ground and the whole stand started dancing when the news came. Best morning." },
  ],
  "Diljit's rise shows regional artists don't need to \"cross over\" anymore": [
    { by: "neha_gupta", text: "My studio's most requested choreography this year was a Diljit song. Punjabi music is pan-India music now." },
    { by: "farhan_q", text: "Chamkila was beautifully made. Imtiaz Ali understood the music, not just the story." },
  ],
  "Old Hindi film lyrics vs today's songs: am I just getting old?": [
    { by: "neha_gupta", text: "Some modern lyrics are brilliant, they just get less attention. Listen to what Amitabh Bhattacharya writes." },
    { by: "zoya_sheikh", text: "Every generation's nostalgia is real AND every generation has good writers. Both things are true.", replies: [{ by: "farhan_q", text: "This is annoyingly wise @zoya_sheikh" }] },
    { by: "ananya_iyer", text: "My grandfather says the same thing about the songs you love, Farhan saab." },
  ],
  "Rohit and Virat retiring from T20Is after the 2024 World Cup was perfect timing. Change my mind.": [
    { by: "rahul_dev", text: "Perfect timing. Leave on a high, focus on the formats where experience matters most." },
    { by: "chidi_eze", text: "I don't follow cricket closely but even I watched that final with my Bengaluru team. The emotion was unreal." },
    { by: "harpreet_kaur", text: "Can't change your mind. Watching it at 5 a.m. in Toronto with the whole gurdwara canteen was unforgettable." },
  ],
  "Honest question: which cricket format do you actually watch end to end?": [
    { by: "lakshmi_prasad", text: "Test cricket, every ball. I'm retired, this is my privilege." },
    { by: "ananya_iyer", text: "T20, but only the last five overs. I'm not proud of it." },
    { by: "rohan_mehta", text: "ODIs during World Cups only. The rest is highlights." },
  ],
  "I'm a backend engineer and AI coding tools changed my job in a year. Honest notes.": [
    { by: "chidi_eze", text: "The reviewing point is so real. My review queue doubled this year.", replies: [{ by: "ananya_iyer", text: "And reviewing AI code needs more attention, not less. It's confidently wrong in new ways." }] },
    { by: "sneha_patil", text: "As a founder: we ship faster, but hiring people with good judgement matters even more now." },
    { by: "lakshmi_prasad", text: "As a beginner, these tools explain my errors like a patient teacher. I'm grateful." },
  ],
  "Lessons from shutting down my first startup": [
    { by: "aisha_bello", text: "\"Revenue is the only validation\" should be tattooed on every pitch deck." },
    { by: "grace_lim", text: "Deciding your shutdown line early is the most underrated advice here. It protects your savings and your mental health." },
  ],
  "Third UPSC attempt: how I'm handling burnout": [
    { by: "meera_subramanian", text: "If you choose teaching someday, our profession will be lucky to have you." },
    { by: "rahul_dev", text: "One day off a week is great. Add a 20-minute walk daily too, it helps focus more than people think." },
    { by: "zoya_sheikh", text: "Sending strength. The fixed-hours rule works for thesis writing too." },
  ],
  "Hyderabadi vs Ambur vs Kolkata biryani: a nutritionist settles nothing": [
    { by: "vikram_rao", text: "Hyderabadi. This is not a discussion, this is a fact." },
    { by: "tanvir_ahmed", text: "The potato is correct. Thank you for your service, Divya.", replies: [{ by: "divya_raghavan", text: "Finally, someone with taste @tanvir_ahmed" }] },
    { by: "karthik_s", text: "Ambur biryani is so underrated outside Tamil Nadu. Seeraga samba rice hits different." },
  ],
  "What 35 years in banking taught me about SIPs and patience": [
    { by: "grace_lim", text: "Every financial planner agrees with this post. The boring strategy wins." },
    { by: "nikhil_joshi", text: "Starting a small SIP this month because of this. Thank you, uncle." },
  ],
  "Dune: Part Two proves big sci-fi can still be an auteur's film": [
    { by: "sravani_r", text: "The desert shots are a masterclass in scale. We studied them at work." },
    { by: "emily_carter", text: "Best since Empire is bold. I'll allow it." },
  ],
  "Rajinikanth or Kamal Haasan: who shaped Tamil cinema more?": [
    { by: "meera_subramanian", text: "\"Rajini shaped how it's celebrated, Kamal shaped how it's made.\" I'm stealing this for class." },
    { by: "aditya_kumar", text: "From Telugu land: both are loved here equally. Don't make us choose." },
    { by: "divya_raghavan", text: "My whole family is split down the middle on this. Festival dinners are dangerous." },
  ],
  "Should OTT platforms release regional films with dubbed audio by default?": [
    { by: "lakshmi_prasad", text: "Please keep dubs. At my age, reading subtitles for two hours is tiring." },
    { by: "sofia_ramirez", text: "In Spain we grew up with dubbing. I switched to subtitles in my twenties and never went back. Both should exist." },
  ],
  "What A. R. Rahman taught a generation about sound": [
    { by: "karthik_s", text: "Roja on cassette in my father's car is my earliest memory of music." },
    { by: "neha_gupta", text: "Taal. Every dance student I've taught has danced to it at least once." },
    { by: "kenji_watanabe", text: "His Slumdog Millionaire score is how many people abroad first heard him. Then we discovered the Tamil albums." },
  ],
  "Is it okay to walk out of a film halfway?": [
    { by: "jake_morrison", text: "Never. I've sat through terrible films out of stubbornness. It's a character flaw." },
    { by: "rohan_mehta", text: "Your time is worth more than the ticket price. Walk out guilt-free." },
  ],
  "How do you explain your tech job to your grandparents?": [
    { by: "chidi_eze", text: "I told my grandmother I build the \"inside part\" of apps. She tells everyone I build phones." },
    { by: "sravani_r", text: "My nani thinks I \"make the explosions in movies\". Honestly, close enough." },
    { by: "lakshmi_prasad", text: "As a grandparent: we understand more than you think. We just enjoy hearing you explain." },
  ],
  "Vijay stepping into politics: what it means for Tamil cinema": [
    { by: "aditya_kumar", text: "It could open space for mid-budget films. When one star carries the calendar, smaller films get squeezed." },
    { by: "priya_nair", text: "Good call keeping the thread about the industry. Kerala went through something similar when stars moved into production." },
  ],
  "What's one dish from your state that deserves national fame?": [
    { by: "harpreet_kaur", text: "Punjab: pinni. Winter sweet, perfect with chai, criminally unknown outside the north." },
    { by: "tanvir_ahmed", text: "Bengal: kosha mangsho. Slow-cooked mutton that makes grown men emotional." },
    { by: "sravani_r", text: "Andhra: gongura pickle. Sour, spicy, and goes with everything." },
    { by: "neha_gupta", text: "Rajasthan: ker sangri. Desert beans and berries, and it's delicious." },
  ],
  "Retired at 60, learning to code at 63": [
    { by: "ananya_iyer", text: "This is the most wholesome thing on Klyro today. Please post your garden program!" },
    { by: "chidi_eze", text: "Error messages are not personal insults. Printing this for my desk." },
  ],
  "Which movie did you expect to hate but ended up loving?": [
    { by: "zoya_sheikh", text: "A long silent-ish art film my professor forced us to watch. It's now my favourite film." },
    { by: "grace_lim", text: "A romantic comedy I watched on a flight. I cried in seat 34C." },
    { by: "vikram_rao", text: "A cricket documentary about a team I hate. Now I respect them. Annoying." },
  ],
  "Teaching 90s Bollywood choreography to Gen Z: a field report": [
    { by: "farhan_q", text: "The 90s were peak shoulder choreography. Glad it's being preserved." },
    { by: "rahul_dev", text: "\"Cardio, but make it cinema\" is the best fitness slogan I've heard." },
  ],
};
