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

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  date: string; // ISO string
  scoreHome?: number;
  scoreAway?: number;
  status: 'UPCOMING' | 'LIVE' | 'FINISHED';
  sport: SportType;
  category: TeamCategory;
  location: string;
}

export interface Standing {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  category: TeamCategory;
}

export interface BlogPost {
  id: string;
  title: string;
  summary: string;
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