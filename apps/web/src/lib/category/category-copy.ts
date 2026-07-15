/**
 * Unique intro copy for category landing pages.
 * Prefer specific outcome language over a shared “Browse apps in X” template.
 */
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  action:
    "Action web games for Meta Ray-Ban Display turn dodging obstacles, chasing scores, and hitting targets into quick D-pad challenges.",
  adventure:
    "Explore compact worlds and story-driven quests in adventure web games built for short sessions on Meta Ray-Ban Display.",
  board:
    "Board web games on Meta Ray-Ban Display bring turn-based play and quick decisions to a compact, glanceable screen.",
  business:
    "Business web apps for Meta Ray-Ban Display keep key status, notes, and work prompts in view without reaching for a phone.",
  card: "Play poker, solitaire-style games, and quick hands with simple D-pad controls in card web games for Meta Ray-Ban Display.",
  casual:
    "Casual web games made for Meta Ray-Ban Display offer simple controls and short sessions that fit a spare minute.",
  "developer-tools":
    "Developer-tool web apps on Meta Ray-Ban Display put references, system status, and compact technical utilities within a glance.",
  education:
    "Education web apps for Meta Ray-Ban Display make flashcards, drills, and study prompts easy to practice at a glance.",
  entertainment:
    "Find entertainment web apps for Meta Ray-Ban Display, from lightweight diversions to media companions for everyday moments.",
  family:
    "Family web games for Meta Ray-Ban Display pair approachable play with simple controls and short sessions for all ages.",
  finance:
    "Finance web apps on Meta Ray-Ban Display cover tip splitting, quick totals, and everyday money calculations at a glance.",
  "health-fitness":
    "Health and fitness web apps for Meta Ray-Ban Display provide timers, cues, and workout prompts while you stay focused on movement.",
  lifestyle:
    "Lifestyle web apps made for Meta Ray-Ban Display keep recipes, lists, and everyday prompts visible while your hands stay on the task.",
  music:
    "Music web apps on Meta Ray-Ban Display keep tabs, cues, and practice prompts in view while your hands stay on the instrument.",
  navigation:
    "Navigation web apps for Meta Ray-Ban Display deliver compact directions and wayfinding cues while your attention stays on the route.",
  news: "Scan headlines and compact feeds in a few quick glances with news web apps designed for Meta Ray-Ban Display.",
  "photo-video":
    "Photo and video web apps for Meta Ray-Ban Display offer capture guides and compact media utilities for a wearable screen.",
  productivity:
    "Get things done with productivity web apps for Meta Ray-Ban Display that keep lists, timers, and task prompts visible.",
  puzzle:
    "Puzzle web games on Meta Ray-Ban Display let you solve spatial challenges, clear lines, and think through D-pad-friendly rounds.",
  racing:
    "Racing web games built for Meta Ray-Ban Display pack short tracks and reflex challenges into quick D-pad sessions.",
  reference:
    "Reference web apps on Meta Ray-Ban Display put facts, conversions, and useful answers within reach without pulling you from the moment.",
  "role-playing":
    "Build a character and take on compact adventures in role-playing web games made for Meta Ray-Ban Display.",
  simulation:
    "Simulation web games for Meta Ray-Ban Display invite you to experiment with compact systems and scenarios in short sessions.",
  social:
    "Social web apps for Meta Ray-Ban Display surface lightweight updates and communication prompts without opening a full-size screen.",
  sports:
    "Check scores, tackle quick challenges, and use training helpers in sports web apps for Meta Ray-Ban Display.",
  strategy:
    "Plan moves, manage compact systems, and test tactics with D-pad controls in strategy web games for Meta Ray-Ban Display.",
  travel:
    "Travel web apps on Meta Ray-Ban Display keep itineraries, conversions, and useful trip details ready while you are on the move.",
  trivia:
    "Trivia web games made for Meta Ray-Ban Display test your knowledge through quick questions and bite-sized challenges.",
  utilities:
    "Utilities for Meta Ray-Ban Display include web apps for calculators, converters, and other everyday tools on the compact screen.",
  weather:
    "Weather web apps bring current conditions and short forecasts to Meta Ray-Ban Display while you are out and about.",
  word: "Solve spelling and language puzzles in quick, D-pad-friendly rounds with word web games for Meta Ray-Ban Display.",
};

/** SEO/description copy for a category slug; falls back to a device-aware generic line. */
export function categoryDescription(slug: string, name: string): string {
  return (
    CATEGORY_DESCRIPTIONS[slug] ??
    `Discover ${name} web apps and web games made for the Meta Ray-Ban Display&apos;s 600×600 screen and D-pad controls.`
  );
}
