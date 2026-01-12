export enum SportType {
  FOOTBALL = 'Football',
  VOLLEYBALL = 'Volleyball'
}

export enum TeamCategory {
  FOOTBALL_A = 'Football A',
  FOOTBALL_B = 'Football B',
  VOLLEYBALL_MEN = 'Volleyball Men',
  VOLLEYBALL_WOMEN = 'Volleyball Women'
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  fatherName: string;
  jerseyNumber: number;
  image?: string;
}

export interface Tournament {
  id: string;
  name: string;
  sport: string;
  categoryId: string;
  categoryName: string;
}

export interface Team {
  id: string;
  name: string;
  category: TeamCategory;
  tournamentId?: string;
  logo?: string;
  // Metadata required for player creation in backend
  sport?: string;
  categoryId?: string;
  categoryName?: string;
}

export interface MatchTeam {
  id: string;
  name: string;
  score?: string | number;
}

export interface Match {
  id: string;
  tournamentId: string;
  tournamentName: string;
  sport: string;
  categoryId: string;
  categoryName: string;
  
  teamA: MatchTeam;
  teamB: MatchTeam;
  
  date: string; // ISO string for Date
  time: string; // HH:MM String
  venue: string;
  status: 'Upcoming' | 'Live' | 'Completed';
}

export interface Standing {
  teamId: string;
  teamName: string; 
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  category: string; 
  lastUpdated?: string; // Added timestamp
}

export interface BlogPost {
  id: string;
  title: string;
  content: string; // Changed from summary to content
  date: string;
  author: string;
  image: string;
}

export interface Comment {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

export interface Admin {
  adminId: string;
  name: string;
  email: string;
  mustChangePassword?: boolean;
  createdAt: string;
}

export type ViewState = 'HOME' | 'PLAYERS' | 'RULES' | 'STANDINGS' | 'MATCHES' | 'ADMIN';