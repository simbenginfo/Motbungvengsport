import { Match, Player, Team, Standing, BlogPost, Admin, Tournament, TeamCategory } from "../types";
import { INITIAL_MATCHES, INITIAL_PLAYERS, INITIAL_TEAMS, INITIAL_STANDINGS, INITIAL_BLOGS, FOOTBALL_RULES, VOLLEYBALL_RULES } from "../constants";

// IMPORTANT: This must be the 'Web App URL' with 'Who has access' set to 'Anyone'
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyWEoHtWpXMGt2pTKzMSZgGO7F74Zhra1jRoK4wDqbuiPPrvM_tgLMZIVCLVWk0ctGx/exec'; 

interface AuthResponse {
  success: boolean;
  name?: string;
  mustChangePassword?: boolean;
  message?: string;
}

interface GenericResponse {
  success: boolean;
  message: string;
}

interface AdminListResponse {
  success: boolean;
  admins: Admin[];
}

// Helper to send all requests as POST with retry logic
const postToBackend = async <T>(payload: any, retries = 2): Promise<T> => {
  try {
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      redirect: 'follow', 
      credentials: 'omit', 
      // Using simple text/plain ensures that modern browsers skip the preflight OPTIONS request for simple POSTs
      // This is crucial because GAS Web Apps can be finicky with CORS preflights
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
       throw new Error(`HTTP Error: ${response.status}`);
    }
    
    const text = await response.text();
    try {
        const data = JSON.parse(text);
        return data as T;
    } catch (e) {
        console.error("Failed to parse backend response:", text);
        throw new Error("Backend returned non-JSON response. Check Script Logs.");
    }
  } catch (error) {
    if (retries > 0) {
        console.warn(`Retrying action ${payload.action}... (${retries} attempts left)`);
        await new Promise(res => setTimeout(res, 1000)); // Wait 1s before retry
        return postToBackend(payload, retries - 1);
    }
    console.error(`Post failed for action ${payload.action}:`, error);
    // Return a safe fallback error object
    return { success: false, message: 'Network Error: Check API URL and Permissions' } as any;
  }
};

export const api = {
  // Teams
  getTeams: async (): Promise<Team[]> => {
     const result = await postToBackend<{success: boolean, teams: any[]}>({ action: 'getTeams' });
     if (result.success && Array.isArray(result.teams)) {
        return result.teams.map(t => ({
           id: t.teamId,
           name: t.teamName,
           category: t.categoryName as TeamCategory,
           tournamentId: t.tournamentId,
           // Capture these fields for passing back to createPlayer
           sport: t.sport,
           categoryId: t.categoryId,
           categoryName: t.categoryName
        }));
     }
     return INITIAL_TEAMS;
  },

  createTeam: (teamName: string, tournamentId: string, sport: string, categoryId: string, categoryName: string) => 
     postToBackend<GenericResponse>({ action: 'createTeam', teamName, tournamentId, sport, categoryId, categoryName }),
  
  updateTeam: (teamId: string, teamName: string) => 
     postToBackend<GenericResponse>({ action: 'updateTeam', teamId, teamName }),
  
  deleteTeam: (teamId: string) => 
     postToBackend<GenericResponse>({ action: 'deleteTeam', teamId }),

  // Tournaments
  getTournaments: async (): Promise<Tournament[]> => {
     const result = await postToBackend<{success: boolean, tournaments: any[]}>({ action: 'getTournaments' });
     if (result.success && Array.isArray(result.tournaments)) {
        return result.tournaments.map(t => ({
           id: t.tournamentId,
           name: t.tournamentName,
           sport: t.sport,
           categoryId: t.categoryId,
           categoryName: t.categoryName
        }));
     }
     return [];
  },

  createTournament: (tournamentName: string, sport: string, categoryId: string, categoryName: string) =>
     postToBackend<GenericResponse>({ action: 'createTournament', tournamentName, sport, categoryId, categoryName }),

  deleteTournament: (tournamentId: string) =>
     postToBackend<GenericResponse>({ action: 'deleteTournament', tournamentId }),

  // Matches
  getMatches: async (): Promise<Match[]> => {
    const result = await postToBackend<{success: boolean, matches: any[]}>({ action: 'getMatches' });
    if (result.success && Array.isArray(result.matches)) {
        return result.matches; 
    }
    return INITIAL_MATCHES;
  },
  upsertMatch: (match: Match) => postToBackend<GenericResponse>({ action: 'upsertMatch', data: match }),
  deleteMatch: (id: string) => postToBackend<GenericResponse>({ action: 'deleteMatch', id }),

  // Players
  getPlayers: async (): Promise<Player[]> => {
    const result = await postToBackend<{success: boolean, players: any[]}>({ action: 'getPlayers' });
    if (result.success && Array.isArray(result.players)) {
        return result.players.map(p => ({
            id: p.playerId,
            name: p.playerName,
            teamId: p.teamId,
            fatherName: p.fatherName,
            jerseyNumber: p.jerseyNo,
            image: p.photoUrl // This is the Google Drive URL returned by backend
        }));
    }
    return INITIAL_PLAYERS;
  },

  upsertPlayer: (player: Player, teamContext?: Partial<Team>) => {
    // Determine if it is a Create or Update based on ID format
    // Frontend generated IDs start with 'P' (from Date.now()), Backend IDs start with 'pl_'
    const isNew = !player.id || player.id.startsWith('P') || !player.id.startsWith('pl_');
    
    // Only send base64 if it's actually a base64 string (starts with data:), otherwise it's a URL and we shouldn't send it to 'imageBase64' field
    const imagePayload = player.image && player.image.startsWith('data:') ? player.image : undefined;

    if (isNew) {
        return postToBackend<GenericResponse>({
            action: 'createPlayer',
            playerName: player.name,
            fatherName: player.fatherName,
            jerseyNo: player.jerseyNumber,
            teamId: player.teamId,
            teamName: teamContext?.name || '',
            tournamentId: teamContext?.tournamentId || '',
            sport: teamContext?.sport || '',
            categoryId: teamContext?.categoryId || '',
            categoryName: teamContext?.categoryName || '',
            imageBase64: imagePayload
        });
    } else {
        return postToBackend<GenericResponse>({
            action: 'updatePlayer',
            playerId: player.id,
            playerName: player.name,
            fatherName: player.fatherName,
            jerseyNo: player.jerseyNumber,
            imageBase64: imagePayload // Only updates image if this is provided
        });
    }
  },

  deletePlayer: (id: string) => postToBackend<GenericResponse>({ action: 'deletePlayer', playerId: id }),

  // Standings
  getStandings: async (): Promise<Standing[]> => {
    const result = await postToBackend<{success: boolean, standings: any[]}>({ action: 'getStandings' });
    if (result.success && Array.isArray(result.standings)) {
        return result.standings;
    }
    return INITIAL_STANDINGS;
  },
  upsertStanding: (standing: Standing) => postToBackend<GenericResponse>({ action: 'upsertStanding', data: standing }),
  deleteStanding: (teamId: string, category: string) => postToBackend<GenericResponse>({ action: 'deleteStanding', teamId, category }),

  // Blogs
  getBlogPosts: async (): Promise<BlogPost[]> => {
    const result = await postToBackend<{success: boolean, blogs: any[]}>({ action: 'getBlogPosts' });
    if (result.success && Array.isArray(result.blogs)) {
        return result.blogs;
    }
    return INITIAL_BLOGS;
  },
  upsertBlogPost: (blog: BlogPost) => postToBackend<GenericResponse>({ action: 'upsertBlogPost', data: blog }),
  deleteBlogPost: (id: string) => postToBackend<GenericResponse>({ action: 'deleteBlogPost', id }),

  // Rules
  getRules: async (): Promise<{football: string[], volleyball: string[]}> => {
    const result = await postToBackend<{success: boolean, football: string[], volleyball: string[]}>({ action: 'getRules' });
    if (result.success) {
        return { football: result.football, volleyball: result.volleyball };
    }
    return { football: FOOTBALL_RULES, volleyball: VOLLEYBALL_RULES };
  },
  saveRules: (football: string[], volleyball: string[]) => postToBackend<GenericResponse>({ action: 'saveRules', football, volleyball }),
  
  // Admin Authentication
  authenticateAdmin: async (email: string, password: string): Promise<AuthResponse> => {
    return postToBackend<AuthResponse>({ action: 'login', email, password });
  },

  logoutAdmin: async (): Promise<GenericResponse> => {
    return postToBackend<GenericResponse>({ action: 'logout' });
  },

  // Admin Management
  getAdmins: async (): Promise<Admin[]> => {
    const result = await postToBackend<AdminListResponse>({ action: 'getAdmins' });
    return result.success ? result.admins : [];
  },

  createAdmin: async (name: string, email: string, password: string): Promise<GenericResponse> => {
    return postToBackend<GenericResponse>({ action: 'createAdmin', name, email, password });
  },

  deleteAdmin: async (email: string): Promise<GenericResponse> => {
    return postToBackend<GenericResponse>({ action: 'deleteAdmin', email });
  },

  changePassword: async (email: string, oldPassword: string, newPassword: string): Promise<GenericResponse> => {
    return postToBackend<GenericResponse>({ action: 'changePassword', email, oldPassword, newPassword });
  }
};