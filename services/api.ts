import { Match, Player, Team, Standing, BlogPost, Admin, Tournament, TeamCategory, Comment } from "../types";
import { INITIAL_MATCHES, INITIAL_PLAYERS, INITIAL_TEAMS, INITIAL_STANDINGS, INITIAL_BLOGS, FOOTBALL_RULES, VOLLEYBALL_RULES, GENERAL_RULES } from "../constants";

// IMPORTANT: This must be the 'Web App URL' with 'Who has access' set to 'Anyone'
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxgyZKWs4kyIuY_KBCdPGIVviJ2dN4lrzLLwLIydU2Rf73b_nGyL9xDnjzrype5sr-0/exec'; 

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
        return result.matches.map(m => ({
            id: m.matchId,
            tournamentId: m.tournamentId,
            tournamentName: m.tournamentName,
            sport: m.sport,
            categoryId: m.categoryId,
            categoryName: m.categoryName,
            teamA: { id: m.teamA.id, name: m.teamA.name, score: m.teamA.score },
            teamB: { id: m.teamB.id, name: m.teamB.name, score: m.teamB.score },
            date: m.matchDate,
            time: m.matchTime,
            venue: m.venue,
            status: m.status
        })); 
    }
    return INITIAL_MATCHES;
  },

  upsertMatch: (match: Match) => {
    // New backend logic has distinct create/update actions
    if (!match.id || match.id.startsWith('M')) { // 'M' is client-side temp ID
        return postToBackend<GenericResponse>({
            action: 'createMatch',
            tournamentId: match.tournamentId,
            tournamentName: match.tournamentName,
            sport: match.sport,
            categoryId: match.categoryId,
            categoryName: match.categoryName,
            teamAId: match.teamA?.id || '',
            teamAName: match.teamA?.name || '',
            teamBId: match.teamB?.id || '',
            teamBName: match.teamB?.name || '',
            matchDate: match.date,
            matchTime: match.time,
            venue: match.venue
        });
    } else {
        return postToBackend<GenericResponse>({
            action: 'updateMatch',
            matchId: match.id,
            matchDate: match.date,
            matchTime: match.time,
            venue: match.venue,
            teamAScore: match.teamA?.score,
            teamBScore: match.teamB?.score,
            status: match.status
        });
    }
  },
  
  deleteMatch: (id: string) => postToBackend<GenericResponse>({ action: 'deleteMatch', matchId: id }),

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
        return result.standings.map(s => ({
            teamId: s.teamId,
            teamName: s.teamName,
            played: s.played,
            won: s.wins, // Map backend 'wins' to frontend 'won'
            drawn: s.draws,
            lost: s.losses,
            goalsFor: s.goalsFor,
            goalsAgainst: s.goalsAgainst,
            goalDifference: s.goalDifference,
            points: s.points,
            category: s.categoryName, // Using categoryName from backend as category identifier
            lastUpdated: s.lastUpdated
        }));
    }
    return INITIAL_STANDINGS;
  },
  
  // New function to manually trigger calc
  recalculateStandings: () => postToBackend<GenericResponse>({ action: 'recalculateStandings' }),
  
  // Deprecated manual upsert (backend now auto-calculates)
  upsertStanding: (standing: Standing) => postToBackend<GenericResponse>({ action: 'recalculateStandings' }),
  
  deleteStanding: (teamId: string, category: string) => postToBackend<GenericResponse>({ action: 'recalculateStandings' }),

  // Blogs
  getBlogPosts: async (): Promise<BlogPost[]> => {
    // Calling the new backend action 'getBlogs'
    const result = await postToBackend<{success: boolean, blogs: any[]}>({ action: 'getBlogs' });
    if (result.success && Array.isArray(result.blogs)) {
        // Map backend response (postId, content, etc.) to frontend interface
        return result.blogs.map(b => ({
            id: b.postId,
            title: b.title,
            content: b.content,
            image: b.coverImageUrl,
            author: b.createdBy,
            date: b.createdAt
        }));
    }
    return INITIAL_BLOGS;
  },
  upsertBlogPost: (blog: BlogPost) => {
    // Determine if Create or Update based on ID presence and format
    // Frontend IDs for new items typically start with 'B' via Date.now() in component, backend IDs are 'blog_'
    if (!blog.id || blog.id.startsWith('B') || !blog.id.startsWith('blog_')) {
        return postToBackend<GenericResponse>({ 
            action: 'createBlog', 
            title: blog.title,
            content: blog.content,
            coverImageUrl: blog.image
        });
    } else {
        return postToBackend<GenericResponse>({ 
            action: 'updateBlog', 
            postId: blog.id,
            title: blog.title,
            content: blog.content,
            coverImageUrl: blog.image
        });
    }
  },
  deleteBlogPost: (id: string) => postToBackend<GenericResponse>({ action: 'deleteBlog', postId: id }),

  // Comments
  addComment: (blogId: string, name: string, comment: string) => postToBackend<GenericResponse>({ action: 'addComment', blogId, name, comment }),
  
  getComments: async (blogId: string): Promise<Comment[]> => {
    const result = await postToBackend<{success: boolean, comments: any[]}>({ action: 'getComments', blogId });
    if (result.success && Array.isArray(result.comments)) {
      return result.comments.map(c => ({
        id: c.commentId,
        user: c.name,
        text: c.comment,
        timestamp: c.createdAt
      }));
    }
    return [];
  },

  // Rules
  getRules: async (): Promise<{general: string[], football: string[], volleyball: string[]}> => {
    const result = await postToBackend<{success: boolean, general: string[], football: string[], volleyball: string[]}>({ action: 'getRules' });
    if (result.success) {
        // Use backend data if it exists and has items, otherwise fallback to constants
        // This prevents an empty backend (initially) from hiding the default rules
        return { 
            general: (result.general && result.general.length > 0) ? result.general : GENERAL_RULES,
            football: (result.football && result.football.length > 0) ? result.football : FOOTBALL_RULES, 
            volleyball: (result.volleyball && result.volleyball.length > 0) ? result.volleyball : VOLLEYBALL_RULES 
        };
    }
    return { general: GENERAL_RULES, football: FOOTBALL_RULES, volleyball: VOLLEYBALL_RULES };
  },
  saveRules: (general: string[], football: string[], volleyball: string[]) => postToBackend<GenericResponse>({ action: 'saveRules', general, football, volleyball }),
  
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