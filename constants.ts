import { BlogPost, Match, Player, Standing, Team } from "./types";

// Production initial states - Data should be fetched from the backend
export const INITIAL_TEAMS: Team[] = [];
export const INITIAL_MATCHES: Match[] = [];
export const INITIAL_PLAYERS: Player[] = [];
export const INITIAL_STANDINGS: Standing[] = [];
export const INITIAL_BLOGS: BlogPost[] = [];

export const FOOTBALL_RULES = [
  "Matches are 90 minutes (45 mins per half).",
  "Substitutions: 5 per team.",
  "Yellow card = Warning, Red card = Ejection.",
  "Offside rule applies.",
  "In knockout stages, penalties decide the winner after extra time."
];

export const VOLLEYBALL_RULES = [
  "Best of 5 sets.",
  "First 4 sets to 25 points, tie-break to 15.",
  "Rotation is mandatory.",
  "Libero cannot serve or block.",
  "Maximum 3 hits per side."
];