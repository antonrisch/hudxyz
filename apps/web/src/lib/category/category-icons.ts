import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpen,
  Boxes,
  Briefcase,
  Camera,
  Car,
  Cloud,
  Code2,
  Compass,
  Crown,
  Folder,
  GraduationCap,
  Grid3x3,
  HelpCircle,
  Layers,
  ListTodo,
  Map,
  Music,
  Newspaper,
  Plane,
  Puzzle,
  Smile,
  Sparkles,
  Swords,
  Tv,
  Type,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

import type { ListingType } from "@/db/schema";

const APP_CATEGORY_ICONS: Record<string, LucideIcon> = {
  business: Briefcase,
  "developer-tools": Code2,
  education: GraduationCap,
  entertainment: Tv,
  finance: Wallet,
  "health-fitness": Activity,
  lifestyle: Sparkles,
  music: Music,
  navigation: Map,
  news: Newspaper,
  "photo-video": Camera,
  productivity: ListTodo,
  reference: BookOpen,
  social: Users,
  sports: Activity,
  travel: Plane,
  utilities: Wrench,
  weather: Cloud,
};

const GAME_CATEGORY_ICONS: Record<string, LucideIcon> = {
  action: Swords,
  adventure: Compass,
  board: Grid3x3,
  card: Layers,
  casual: Smile,
  family: Users,
  puzzle: Puzzle,
  racing: Car,
  "role-playing": BookOpen,
  simulation: Boxes,
  sports: Activity,
  strategy: Crown,
  trivia: HelpCircle,
  word: Type,
};

export function getCategoryIcon(listingType: ListingType, slug: string): LucideIcon {
  const icons = listingType === "game" ? GAME_CATEGORY_ICONS : APP_CATEGORY_ICONS;
  return icons[slug] ?? Folder;
}
