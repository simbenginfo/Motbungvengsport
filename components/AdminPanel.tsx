import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Admin, Match, Player, Standing, BlogPost, Team, TeamCategory, Tournament } from '../types';
import { Loader2, Lock, Mail, User, Shield, Users, Trash2, Plus, LogOut, Edit2, Save, FileText, BarChart2, BookOpen, Trophy, Flag, Upload, Image as ImageIcon, AlertTriangle } from 'lucide-react';

type Tab = 'MATCHES' | 'PLAYERS' | 'STANDINGS' | 'BLOGS' | 'RULES' | 'ADMINS' | 'SECURITY' | 'TOURNAMENTS' | 'TEAMS';

export const AdminPanel: React.FC = () => {
  // Auth State
  const [auth, setAuth] = useState(false);
  const [currentUser, setCurrentUser] = useState<{name: string, email: string, mustChangePassword: boolean} | null>(null);
  
  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginStatus, setLoginStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // Dashboard State
  const [activeTab, setActiveTab] = useState<Tab>('MATCHES');
  const [actionStatus, setActionStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data States
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [rules, setRules] = useState<{football: string[], volleyball: string[]}>({ football: [], volleyball: [] });

  // Editing States
  const [editingMatch, setEditingMatch] = useState<Partial<Match> | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Partial<Player> | null>(null);
  const [editingStanding, setEditingStanding] = useState<Partial<Standing> | null>(null);
  const [editingBlog, setEditingBlog] = useState<Partial<BlogPost> | null>(null);
  const [editingTournament, setEditingTournament] = useState<Partial<Tournament> | null>(null);
  const [editingTeam, setEditingTeam] = useState<Partial<Team> & {categoryName?: string, categoryId?: string, sport?: string} | null>(null);
  
  // Admin Management Forms
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  
  // Security Forms
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Initial Data Load
  useEffect(() => {
    if (auth) {
        loadAllData();
    }
  }, [auth]);

  const loadAllData = async () => {
    setDataLoading(true);
    const [t, tourneys, m, p, s, b, r, a] = await Promise.all([
        api.getTeams(),
        api.getTournaments(),
        api.getMatches(),
        api.getPlayers(),
        api.getStandings(),
        api.getBlogPosts(),
        api.getRules(),
        api.getAdmins()
    ]);
    setTeams(t);
    setTournaments(tourneys);
    setMatches(m);
    setPlayers(p);
    setStandings(s);
    setBlogs(b);
    setRules(r);
    setAdmins(a);
    setDataLoading(false);
  };

  // --- UTILS ---
  const processImage = (file: File | undefined, callback: (base64: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            // Limit size to 300px to fit in Google Sheets cell limit easily
            const MAX_SIZE = 300; 
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }
            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);
            // Compress to JPEG 0.6 quality
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6); 
            callback(dataUrl);
        };
    };
    reader.readAsDataURL(file);
  };

  // --- AUTH HANDLERS ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginStatus('Verifying credentials...');
    
    const result = await api.authenticateAdmin(loginEmail, loginPassword);
    
    if (result.success) {
        setAuth(true);
        setCurrentUser({
          name: result.name || 'Admin',
          email: loginEmail,
          mustChangePassword: result.mustChangePassword || false
        });
        if (result.mustChangePassword) {
          setActiveTab('SECURITY');
        }
        setLoginStatus('');
    } else {
        setLoginStatus('Invalid Credentials or Server Error');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
      await api.logoutAdmin();
      setAuth(false);
      setCurrentUser(null);
      setLoginEmail('');
      setLoginPassword('');
  };

  // --- CRUD HANDLERS ---
  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTournament) return;
    setLoading(true);
    const res = await api.createTournament(
        editingTournament.name || '',
        editingTournament.sport || 'Football',
        editingTournament.categoryId || 'cat_1', 
        editingTournament.categoryName || 'General'
    );
    if (res.success) {
        setEditingTournament(null);
        loadAllData();
        setActionStatus('Tournament created');
    }
    setLoading(false);
    setTimeout(() => setActionStatus(''), 3000);
  };

  const handleDeleteTournament = async (id: string) => {
    if (!window.confirm('Delete this tournament?')) return;
    setLoading(true);
    await api.deleteTournament(id);
    loadAllData();
    setLoading(false);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingTeam) return;
      setLoading(true);

      const selectedTournament = tournaments.find(t => t.id === editingTeam.tournamentId);

      const res = await api.createTeam(
          editingTeam.name || '',
          editingTeam.tournamentId || '',
          selectedTournament?.sport || 'Football',
          selectedTournament?.categoryId || 'cat_1',
          selectedTournament?.categoryName || 'General'
      );
      if (res.success) {
          setEditingTeam(null);
          loadAllData();
          setActionStatus('Team created');
      }
      setLoading(false);
      setTimeout(() => setActionStatus(''), 3000);
  };

  const handleDeleteTeam = async (id: string) => {
      if (!window.confirm('Delete this team?')) return;
      setLoading(true);
      await api.deleteTeam(id);
      loadAllData();
      setLoading(false);
  };
  
  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;
    setLoading(true);
    const matchToSave = {
        ...editingMatch,
        id: editingMatch.id || `M${Date.now()}`,
        date: editingMatch.date || new Date().toISOString()
    } as Match;
    
    const res = await api.upsertMatch(matchToSave);
    if (res.success) {
        setEditingMatch(null);
        loadAllData();
        setActionStatus('Match saved successfully');
    } else {
        setActionStatus('Failed to save match');
    }
    setLoading(false);
    setTimeout(() => setActionStatus(''), 3000);
  };

  const handleDeleteMatch = async (id: string) => {
    if (!window.confirm('Delete this match?')) return;
    setLoading(true);
    await api.deleteMatch(id);
    loadAllData();
    setLoading(false);
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    
    if (!editingPlayer.teamId) {
        setActionStatus('Please select a team');
        return;
    }

    setLoading(true);
    const playerToSave = {
        ...editingPlayer,
        id: editingPlayer.id || `P${Date.now()}`,
        jerseyNumber: Number(editingPlayer.jerseyNumber),
        fatherName: editingPlayer.fatherName
    } as Player;
    
    const selectedTeam = teams.find(t => t.id === playerToSave.teamId);

    if (!selectedTeam) {
        setLoading(false);
        setActionStatus('Error: Selected team details not found.');
        return;
    }

    const res = await api.upsertPlayer(playerToSave, selectedTeam);
    
    if (res.success) {
        setEditingPlayer(null);
        loadAllData();
        setActionStatus('Player saved successfully');
    } else {
        if (res.message && res.message.includes('Authorization')) {
            alert("BACKEND PERMISSION ERROR:\n\nThe Google Apps Script needs to be authorized to use Google Drive for image uploads.\n\n1. Open your Google Script Editor.\n2. Select 'authorizeScript' from the dropdown.\n3. Click Run and accept permissions.");
        }
        setActionStatus('Failed: ' + (res.message || 'Error'));
    }
    setLoading(false);
    setTimeout(() => setActionStatus(''), 3000);
  };

  const handleDeletePlayer = async (id: string) => {
    if (!window.confirm('Delete this player?')) return;
    setLoading(true);
    await api.deletePlayer(id);
    loadAllData();
    setLoading(false);
  };

  const handleSaveStanding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStanding) return;
    setLoading(true);
    const res = await api.upsertStanding(editingStanding as Standing);
    if (res.success) {
        setEditingStanding(null);
        loadAllData();
        setActionStatus('Standing updated');
    }
    setLoading(false);
    setTimeout(() => setActionStatus(''), 3000);
  };

  const handleDeleteStanding = async (teamId: string, category: string) => {
     if (!window.confirm('Remove this team from standings?')) return;
     setLoading(true);
     await api.deleteStanding(teamId, category);
     loadAllData();
     setLoading(false);
  };

  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlog) return;
    setLoading(true);
    const blogToSave = {
        ...editingBlog,
        id: editingBlog.id || `B${Date.now()}`,
        date: editingBlog.date || new Date().toISOString()
    } as BlogPost;

    const res = await api.upsertBlogPost(blogToSave);
    if (res.success) {
        setEditingBlog(null);
        loadAllData();
        setActionStatus('Post saved');
    }
    setLoading(false);
    setTimeout(() => setActionStatus(''), 3000);
  };

  const handleDeleteBlog = async (id: string) => {
    if (!window.confirm('Delete this post?')) return;
    setLoading(true);
    await api.deleteBlogPost(id);
    loadAllData();
    setLoading(false);
  };

  const handleSaveRules = async () => {
    setLoading(true);
    const res = await api.saveRules(rules.football, rules.volleyball);
    if (res.success) setActionStatus('Rules updated');
    setLoading(false);
    setTimeout(() => setActionStatus(''), 3000);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await api.createAdmin(newAdminName, newAdminEmail, newAdminPassword);
    if (res.success) {
        setNewAdminName('');
        setNewAdminEmail('');
        setNewAdminPassword('');
        loadAllData();
        setActionStatus(res.message);
    }
    setLoading(false);
    setTimeout(() => setActionStatus(''), 3000);
  };

  const handleDeleteAdmin = async (email: string) => {
      if(!window.confirm(`Delete admin ${email}?`)) return;
      setLoading(true);
      await api.deleteAdmin(email);
      loadAllData();
      setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
          setActionStatus('Passwords do not match');
          return;
      }
      if (!currentUser) return;
      setLoading(true);
      const res = await api.changePassword(currentUser.email, oldPassword, newPassword);
      setLoading(false);
      setActionStatus(res.message);
      if (res.success) {
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setCurrentUser({...currentUser, mustChangePassword: false});
      }
  };

  // --- RENDER HELPERS ---
  
  if (!auth) {
    // LOGIN UI
    return (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="bg-brand-gray p-8 rounded-lg border border-neutral-800 max-w-sm w-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-red to-brand-green"></div>
                <h2 className="text-2xl font-display font-bold mb-2 text-center text-white">Admin Portal</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-500" size={16} />
                            <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full bg-black border border-neutral-700 rounded p-3 pl-10 text-white focus:border-brand-red outline-none text-sm" placeholder="admin@example.com" disabled={loading} required />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-500" size={16} />
                            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-black border border-neutral-700 rounded p-3 pl-10 text-white focus:border-brand-red outline-none text-sm" placeholder="••••••••" disabled={loading} required />
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-brand-red text-white py-3 rounded font-bold hover:bg-red-700 transition flex justify-center items-center gap-2 disabled:opacity-50 mt-4">
                        {loading && <Loader2 className="animate-spin" size={18} />} {loading ? 'VERIFYING...' : 'LOGIN'}
                    </button>
                </form>
                {loginStatus && <p className="mt-4 text-xs text-brand-green text-center">{loginStatus}</p>}
            </div>
        </div>
    );
  }

  return (
    <div className="py-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-neutral-800 pb-4 gap-4">
            <div>
                <h2 className="text-3xl font-display font-bold text-white border-l-4 border-brand-green pl-4">Admin Dashboard</h2>
                <p className="text-sm text-gray-400 mt-1 pl-5 flex items-center gap-2">
                    <User size={14} /> {currentUser?.name}
                </p>
            </div>
            <div className="flex gap-2">
                 {loading || dataLoading ? <div className="flex items-center gap-2 text-brand-green text-xs animate-pulse"><Loader2 size={14} className="animate-spin"/> Syncing...</div> : null}
                 <button onClick={handleLogout} className="text-xs text-red-500 hover:text-red-400 font-bold uppercase border border-red-500/30 px-3 py-2 rounded hover:bg-red-500/10 transition flex items-center gap-2">
                    <LogOut size={14} /> Logout
                </button>
            </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
            {[
                { id: 'TOURNAMENTS', icon: Trophy, label: 'Tournaments' },
                { id: 'TEAMS', icon: Flag, label: 'Teams' },
                { id: 'MATCHES', icon: Shield, label: 'Matches' },
                { id: 'PLAYERS', icon: Users, label: 'Players' },
                { id: 'STANDINGS', icon: BarChart2, label: 'Standings' },
                { id: 'BLOGS', icon: FileText, label: 'News' },
                { id: 'RULES', icon: BookOpen, label: 'Rules' },
                { id: 'ADMINS', icon: User, label: 'Admins' },
                { id: 'SECURITY', icon: Lock, label: 'Security' }
            ].map((tab) => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded font-bold uppercase tracking-wider text-xs transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-brand-green text-black' : 'bg-neutral-900 text-gray-400 hover:text-white'}`}
                >
                    <tab.icon size={14} /> {tab.label}
                </button>
            ))}
        </div>

        <div className="bg-brand-gray border border-neutral-800 rounded-lg p-6 min-h-[400px]">
            {/* TOURNAMENTS */}
            {activeTab === 'TOURNAMENTS' && (
                <div>
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">Tournaments</h3>
                        <button onClick={() => setEditingTournament({} as Tournament)} className="bg-brand-green text-black px-3 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-green-400"><Plus size={16}/> New Tournament</button>
                    </div>

                    {editingTournament && (
                        <div className="bg-neutral-900 p-6 rounded mb-6 border border-neutral-700 animate-fade-in">
                            <h4 className="font-bold text-gray-300 mb-4">{editingTournament.id ? 'Edit Tournament' : 'New Tournament'}</h4>
                            <form onSubmit={handleCreateTournament} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" placeholder="Tournament Name" value={editingTournament.name || ''} onChange={e => setEditingTournament({...editingTournament, name: e.target.value})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" required/>
                                <select value={editingTournament.sport || 'Football'} onChange={e => setEditingTournament({...editingTournament, sport: e.target.value})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm">
                                    <option value="Football">Football</option>
                                    <option value="Volleyball">Volleyball</option>
                                </select>
                                <input type="text" placeholder="Category Name (e.g. Football A)" value={editingTournament.categoryName || ''} onChange={e => setEditingTournament({...editingTournament, categoryName: e.target.value})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" />
                                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                                    <button type="button" onClick={() => setEditingTournament(null)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
                                    <button type="submit" className="bg-brand-red text-white px-4 py-2 rounded font-bold text-sm">Create Tournament</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                             <thead className="bg-neutral-900 text-xs uppercase font-bold text-gray-300">
                                <tr>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Sport</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {tournaments.map(t => (
                                    <tr key={t.id} className="hover:bg-neutral-800/50">
                                        <td className="px-4 py-3 font-bold text-white">{t.name}</td>
                                        <td className="px-4 py-3">{t.sport}</td>
                                        <td className="px-4 py-3">{t.categoryName}</td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <button onClick={() => handleDeleteTournament(t.id)} className="text-red-500 hover:text-red-400"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TEAMS */}
            {activeTab === 'TEAMS' && (
                <div>
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">Registered Teams</h3>
                        <button onClick={() => setEditingTeam({} as Team)} className="bg-brand-green text-black px-3 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-green-400"><Plus size={16}/> Register Team</button>
                    </div>

                    {editingTeam && (
                        <div className="bg-neutral-900 p-6 rounded mb-6 border border-neutral-700 animate-fade-in">
                            <h4 className="font-bold text-gray-300 mb-4">{editingTeam.id ? 'Edit Team' : 'New Team'}</h4>
                            <form onSubmit={handleCreateTeam} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" placeholder="Team Name" value={editingTeam.name || ''} onChange={e => setEditingTeam({...editingTeam, name: e.target.value})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" required/>
                                <select value={editingTeam.tournamentId || ''} onChange={e => setEditingTeam({...editingTeam, tournamentId: e.target.value})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" required>
                                    <option value="">Select Tournament</option>
                                    {tournaments.map(t => <option key={t.id} value={t.id}>{t.name} ({t.categoryName})</option>)}
                                </select>
                                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                                    <button type="button" onClick={() => setEditingTeam(null)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
                                    <button type="submit" className="bg-brand-red text-white px-4 py-2 rounded font-bold text-sm">Create Team</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                         <table className="w-full text-left text-sm text-gray-400">
                             <thead className="bg-neutral-900 text-xs uppercase font-bold text-gray-300">
                                <tr>
                                    <th className="px-4 py-3">Team Name</th>
                                    <th className="px-4 py-3">Tournament</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {teams.map(t => (
                                    <tr key={t.id} className="hover:bg-neutral-800/50">
                                        <td className="px-4 py-3 font-bold text-white">{t.name}</td>
                                        <td className="px-4 py-3">{tournaments.find(trn => trn.id === t.tournamentId)?.name || '-'}</td>
                                        <td className="px-4 py-3">{t.category}</td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <button onClick={() => handleDeleteTeam(t.id)} className="text-red-500 hover:text-red-400"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MATCHES */}
            {activeTab === 'MATCHES' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">Match Management</h3>
                        <button onClick={() => setEditingMatch({} as Match)} className="bg-brand-green text-black px-3 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-green-400"><Plus size={16}/> New Match</button>
                    </div>

                    {editingMatch && (
                        <div className="bg-neutral-900 p-6 rounded mb-6 border border-neutral-700 animate-fade-in">
                            <h4 className="font-bold text-gray-300 mb-4">{editingMatch.id ? 'Edit Match' : 'New Match'}</h4>
                            <form onSubmit={handleSaveMatch} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <select value={editingMatch.homeTeamId || ''} onChange={e => setEditingMatch({...editingMatch, homeTeamId: e.target.value})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm">
                                    <option value="">Select Home Team</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
                                </select>
                                <select value={editingMatch.awayTeamId || ''} onChange={e => setEditingMatch({...editingMatch, awayTeamId: e.target.value})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm">
                                    <option value="">Select Away Team</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
                                </select>
                                <input type="number" placeholder="Home Score" value={editingMatch.scoreHome ?? ''} onChange={e => setEditingMatch({...editingMatch, scoreHome: Number(e.target.value)})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" />
                                <input type="number" placeholder="Away Score" value={editingMatch.scoreAway ?? ''} onChange={e => setEditingMatch({...editingMatch, scoreAway: Number(e.target.value)})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" />
                                <select value={editingMatch.status || 'UPCOMING'} onChange={e => setEditingMatch({...editingMatch, status: e.target.value as any})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm">
                                    <option value="UPCOMING">Upcoming</option>
                                    <option value="LIVE">Live</option>
                                    <option value="FINISHED">Finished</option>
                                </select>
                                <input type="datetime-local" value={editingMatch.date ? new Date(editingMatch.date).toISOString().slice(0, 16) : ''} onChange={e => setEditingMatch({...editingMatch, date: new Date(e.target.value).toISOString()})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" />
                                <input type="text" placeholder="Location" value={editingMatch.location || ''} onChange={e => setEditingMatch({...editingMatch, location: e.target.value})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" />
                                <select value={editingMatch.category || ''} onChange={e => setEditingMatch({...editingMatch, category: e.target.value as TeamCategory})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm">
                                    <option value="">Select Category</option>
                                    {Object.values(TeamCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                                    <button type="button" onClick={() => setEditingMatch(null)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
                                    <button type="submit" className="bg-brand-red text-white px-4 py-2 rounded font-bold text-sm">Save Match</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-neutral-900 text-xs uppercase font-bold text-gray-300">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Matchup</th>
                                    <th className="px-4 py-3">Score</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {matches.map(m => (
                                    <tr key={m.id} className="hover:bg-neutral-800/50">
                                        <td className="px-4 py-3">{new Date(m.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-white">
                                            {teams.find(t => t.id === m.homeTeamId)?.name} vs {teams.find(t => t.id === m.awayTeamId)?.name}
                                        </td>
                                        <td className="px-4 py-3">{m.scoreHome} - {m.scoreAway}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${m.status === 'LIVE' ? 'bg-red-600 text-white' : m.status === 'FINISHED' ? 'bg-neutral-700' : 'bg-blue-900 text-blue-200'}`}>{m.status}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <button onClick={() => setEditingMatch(m)} className="text-blue-400 hover:text-blue-300"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDeleteMatch(m.id)} className="text-red-500 hover:text-red-400"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* PLAYERS */}
            {activeTab === 'PLAYERS' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">Player Roster</h3>
                        <button onClick={() => setEditingPlayer({} as Player)} className="bg-brand-green text-black px-3 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-green-400"><Plus size={16}/> Add Player</button>
                    </div>

                    {editingPlayer && (
                        <div className="bg-neutral-900 p-6 rounded mb-6 border border-neutral-700 animate-fade-in">
                            <h4 className="font-bold text-gray-300 mb-4">{editingPlayer.id ? 'Edit Player' : 'New Player'}</h4>
                            <form onSubmit={handleSavePlayer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" placeholder="Full Name" value={editingPlayer.name || ''} onChange={e => setEditingPlayer({...editingPlayer, name: e.target.value})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" required/>
                                <select value={editingPlayer.teamId || ''} onChange={e => setEditingPlayer({...editingPlayer, teamId: e.target.value})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" required>
                                    <option value="">Select Team</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({t.categoryName || t.category}) - {t.sport}
                                        </option>
                                    ))}
                                </select>
                                <input type="number" placeholder="Jersey Number" value={editingPlayer.jerseyNumber || ''} onChange={e => setEditingPlayer({...editingPlayer, jerseyNumber: Number(e.target.value)})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" />
                                <input type="text" placeholder="Father's Name" value={editingPlayer.fatherName || ''} onChange={e => setEditingPlayer({...editingPlayer, fatherName: e.target.value})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" />
                                
                                {/* Image Upload */}
                                <div className="md:col-span-2">
                                    <label className="text-xs text-gray-500 mb-1 block">Player Photo</label>
                                    <div className="flex gap-2 items-center bg-black border border-neutral-700 rounded p-2">
                                        {editingPlayer.image && editingPlayer.image.startsWith('data:') ? (
                                            <div className="relative group">
                                                <img src={editingPlayer.image} alt="Preview" className="h-10 w-10 object-cover rounded border border-neutral-700" />
                                            </div>
                                        ) : editingPlayer.image ? (
                                            editingPlayer.image.startsWith('Error') ? 
                                                <div className="text-xs text-red-500 font-bold flex items-center gap-2"><AlertTriangle size={16}/> {editingPlayer.image}</div> 
                                                : <div className="flex items-center gap-2 text-xs text-gray-400 truncate max-w-[200px]"><ImageIcon size={16} /> <span>Existing Image</span></div>
                                        ) : (
                                            <div className="h-10 w-10 bg-neutral-800 rounded flex items-center justify-center text-neutral-600">
                                                <User size={20} />
                                            </div>
                                        )}
                                        
                                        <div className="flex-1 text-xs text-gray-500 px-2">
                                            {editingPlayer.image && editingPlayer.image.startsWith('data:') 
                                                ? 'New image selected (Save to apply)' 
                                                : 'Upload a new photo to update'}
                                        </div>

                                        <label className="cursor-pointer bg-neutral-800 text-white px-3 py-2 rounded border border-neutral-700 hover:bg-neutral-700 flex items-center gap-2 transition-colors">
                                            <Upload size={16} />
                                            <span className="text-xs font-bold">Upload</span>
                                            <input 
                                                ref={fileInputRef}
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        processImage(file, (base64) => {
                                                            setEditingPlayer(prev => ({...prev!, image: base64}));
                                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                                        });
                                                    }
                                                }} 
                                            />
                                        </label>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1">Supported: JPG, PNG. Images are compressed automatically.</p>
                                </div>

                                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                                    <button type="button" onClick={() => setEditingPlayer(null)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
                                    <button type="submit" className="bg-brand-red text-white px-4 py-2 rounded font-bold text-sm">Save Player</button>
                                </div>
                            </form>
                        </div>
                    )}
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                             <thead className="bg-neutral-900 text-xs uppercase font-bold text-gray-300">
                                <tr>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Team</th>
                                    <th className="px-4 py-3">Jersey</th>
                                    <th className="px-4 py-3">Father's Name</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {players.map(p => (
                                    <tr key={p.id} className="hover:bg-neutral-800/50">
                                        <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                                            {p.image && !p.image.startsWith('Error') ? 
                                                <img src={p.image} className="w-6 h-6 rounded-full object-cover" /> 
                                                : <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-xs text-gray-500"><User size={12}/></div>}
                                            {p.name}
                                            {p.image && p.image.startsWith('Error') && <span className="text-[10px] text-red-500 ml-2 border border-red-500/50 px-1 rounded">Error</span>}
                                        </td>
                                        <td className="px-4 py-3">{teams.find(t => t.id === p.teamId)?.name}</td>
                                        <td className="px-4 py-3">#{p.jerseyNumber}</td>
                                        <td className="px-4 py-3">{p.fatherName}</td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <button onClick={() => setEditingPlayer(p)} className="text-blue-400 hover:text-blue-300"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDeletePlayer(p.id)} className="text-red-500 hover:text-red-400"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {/* STANDINGS */}
            {activeTab === 'STANDINGS' && (
                <div>
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">Standings Management</h3>
                        <button onClick={() => setEditingStanding({} as Standing)} className="bg-brand-green text-black px-3 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-green-400"><Plus size={16}/> Add/Update Entry</button>
                    </div>

                    {editingStanding && (
                        <div className="bg-neutral-900 p-6 rounded mb-6 border border-neutral-700 animate-fade-in">
                            <h4 className="font-bold text-gray-300 mb-4">Update Team Statistics</h4>
                            <form onSubmit={handleSaveStanding} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <select value={editingStanding.teamId || ''} onChange={e => setEditingStanding({...editingStanding, teamId: e.target.value})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" required>
                                    <option value="">Select Team</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <select value={editingStanding.category || ''} onChange={e => setEditingStanding({...editingStanding, category: e.target.value as TeamCategory})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" required>
                                    <option value="">Select Category</option>
                                    {Object.values(TeamCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <div className="md:col-span-3 grid grid-cols-5 gap-2">
                                    <input type="number" placeholder="Played" value={editingStanding.played ?? ''} onChange={e => setEditingStanding({...editingStanding, played: Number(e.target.value)})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" />
                                    <input type="number" placeholder="Won" value={editingStanding.won ?? ''} onChange={e => setEditingStanding({...editingStanding, won: Number(e.target.value)})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" />
                                    <input type="number" placeholder="Drawn" value={editingStanding.drawn ?? ''} onChange={e => setEditingStanding({...editingStanding, drawn: Number(e.target.value)})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" />
                                    <input type="number" placeholder="Lost" value={editingStanding.lost ?? ''} onChange={e => setEditingStanding({...editingStanding, lost: Number(e.target.value)})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" />
                                    <input type="number" placeholder="Points" value={editingStanding.points ?? ''} onChange={e => setEditingStanding({...editingStanding, points: Number(e.target.value)})} className="bg-black border border-neutral-700 text-white p-2 rounded text-sm" />
                                </div>
                                <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                                    <button type="button" onClick={() => setEditingStanding(null)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
                                    <button type="submit" className="bg-brand-red text-white px-4 py-2 rounded font-bold text-sm">Save Entry</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                             <thead className="bg-neutral-900 text-xs uppercase font-bold text-gray-300">
                                <tr>
                                    <th className="px-4 py-3">Team</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3 text-center">P</th>
                                    <th className="px-4 py-3 text-center">W</th>
                                    <th className="px-4 py-3 text-center">D</th>
                                    <th className="px-4 py-3 text-center">L</th>
                                    <th className="px-4 py-3 text-center">Pts</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {standings.map(s => (
                                    <tr key={`${s.teamId}-${s.category}`} className="hover:bg-neutral-800/50">
                                        <td className="px-4 py-3 font-bold text-white">{teams.find(t => t.id === s.teamId)?.name}</td>
                                        <td className="px-4 py-3 text-xs">{s.category}</td>
                                        <td className="px-4 py-3 text-center">{s.played}</td>
                                        <td className="px-4 py-3 text-center text-green-400">{s.won}</td>
                                        <td className="px-4 py-3 text-center">{s.drawn}</td>
                                        <td className="px-4 py-3 text-center text-red-400">{s.lost}</td>
                                        <td className="px-4 py-3 text-center font-bold text-white">{s.points}</td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <button onClick={() => setEditingStanding(s)} className="text-blue-400 hover:text-blue-300"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDeleteStanding(s.teamId, s.category)} className="text-red-500 hover:text-red-400"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* BLOGS */}
            {activeTab === 'BLOGS' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">News & Updates</h3>
                        <button onClick={() => setEditingBlog({} as BlogPost)} className="bg-brand-green text-black px-3 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-green-400"><Plus size={16}/> New Post</button>
                    </div>

                    {editingBlog && (
                        <div className="bg-neutral-900 p-6 rounded mb-6 border border-neutral-700 animate-fade-in">
                            <h4 className="font-bold text-gray-300 mb-4">{editingBlog.id ? 'Edit Post' : 'New Post'}</h4>
                            <form onSubmit={handleSaveBlog} className="space-y-4">
                                <input type="text" placeholder="Title" value={editingBlog.title || ''} onChange={e => setEditingBlog({...editingBlog, title: e.target.value})} className="w-full bg-black border border-neutral-700 text-white p-2 rounded text-sm" required/>
                                <textarea placeholder="Summary/Content" value={editingBlog.summary || ''} onChange={e => setEditingBlog({...editingBlog, summary: e.target.value})} className="w-full bg-black border border-neutral-700 text-white p-2 rounded text-sm h-24" required/>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" placeholder="Author" value={editingBlog.author || ''} onChange={e => setEditingBlog({...editingBlog, author: e.target.value})} className="w-full bg-black border border-neutral-700 text-white p-2 rounded text-sm" />
                                    <div className="flex gap-2 items-center">
                                        <input type="text" placeholder="Image URL or Upload" value={editingBlog.image || ''} onChange={e => setEditingBlog({...editingBlog, image: e.target.value})} className="flex-1 bg-black border border-neutral-700 text-white p-2 rounded text-sm" />
                                        <label className="cursor-pointer bg-neutral-800 text-white px-3 py-2 rounded border border-neutral-700 hover:bg-neutral-700 flex items-center gap-2">
                                            <Upload size={16} />
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => processImage(e.target.files?.[0], (base64) => setEditingBlog({...editingBlog, image: base64}))} />
                                        </label>
                                    </div>
                                </div>
                                {editingBlog.image && <div className="mt-2"><img src={editingBlog.image} alt="Preview" className="h-20 w-auto rounded border border-neutral-700"/></div>}
                                <div className="flex justify-end gap-2 mt-2">
                                    <button type="button" onClick={() => setEditingBlog(null)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
                                    <button type="submit" className="bg-brand-red text-white px-4 py-2 rounded font-bold text-sm">Publish</button>
                                </div>
                            </form>
                        </div>
                    )}
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {blogs.map(b => (
                            <div key={b.id} className="bg-neutral-900 p-4 rounded border border-neutral-800 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-bold text-white text-lg">{b.title}</h4>
                                    <p className="text-xs text-gray-500 mb-2">{new Date(b.date).toLocaleDateString()} by {b.author}</p>
                                    <p className="text-sm text-gray-400 line-clamp-3">{b.summary}</p>
                                </div>
                                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-neutral-800">
                                     <button onClick={() => setEditingBlog(b)} className="text-blue-400 hover:text-blue-300 text-xs font-bold uppercase">Edit</button>
                                     <button onClick={() => handleDeleteBlog(b.id)} className="text-red-500 hover:text-red-400 text-xs font-bold uppercase">Delete</button>
                                </div>
                            </div>
                        ))}
                     </div>
                </div>
            )}
            
            {/* RULES */}
            {activeTab === 'RULES' && (
                <div>
                     <h3 className="text-xl font-bold text-white mb-6">Tournament Rules</h3>
                     <div className="grid md:grid-cols-2 gap-8">
                        <div>
                             <h4 className="text-brand-red font-bold mb-2">Football Rules</h4>
                             <p className="text-xs text-gray-500 mb-2">One rule per line.</p>
                             <textarea 
                                value={rules.football.join('\n')} 
                                onChange={e => setRules({...rules, football: e.target.value.split('\n')})}
                                className="w-full h-64 bg-black border border-neutral-700 p-3 rounded text-sm text-white focus:border-brand-red outline-none"
                             />
                        </div>
                        <div>
                             <h4 className="text-brand-green font-bold mb-2">Volleyball Rules</h4>
                             <p className="text-xs text-gray-500 mb-2">One rule per line.</p>
                             <textarea 
                                value={rules.volleyball.join('\n')} 
                                onChange={e => setRules({...rules, volleyball: e.target.value.split('\n')})}
                                className="w-full h-64 bg-black border border-neutral-700 p-3 rounded text-sm text-white focus:border-brand-green outline-none"
                             />
                        </div>
                     </div>
                     <div className="mt-4 flex justify-end">
                         <button onClick={handleSaveRules} className="bg-white text-black px-6 py-2 rounded font-bold hover:bg-gray-200 transition">Save Rules</button>
                     </div>
                </div>
            )}

            {/* ADMINS */}
            {activeTab === 'ADMINS' && (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                       <h3 className="text-lg font-bold text-white mb-4">Existing Administrators</h3>
                       <div className="overflow-x-auto">
                         <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-neutral-900 uppercase text-xs font-bold text-gray-300">
                               <tr>
                                  <th className="px-4 py-3">Name</th>
                                  <th className="px-4 py-3">Email</th>
                                  <th className="px-4 py-3 text-right">Action</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                               {admins.map(admin => (
                                 <tr key={admin.email} className="hover:bg-neutral-800/50">
                                    <td className="px-4 py-3 font-medium text-white">{admin.name}</td>
                                    <td className="px-4 py-3">{admin.email}</td>
                                    <td className="px-4 py-3 text-right">
                                       {admin.email !== currentUser?.email && (
                                         <button onClick={() => handleDeleteAdmin(admin.email)} className="text-red-500 hover:text-red-400 p-1">
                                            <Trash2 size={16} />
                                         </button>
                                       )}
                                    </td>
                                 </tr>
                               ))}
                            </tbody>
                         </table>
                       </div>
                    </div>

                    <div className="bg-neutral-900 p-6 rounded border border-neutral-800 h-fit">
                       <h3 className="text-lg font-bold text-brand-green mb-4">Add Admin</h3>
                       <form onSubmit={handleCreateAdmin} className="space-y-4">
                          <input type="text" value={newAdminName} onChange={e => setNewAdminName(e.target.value)} required className="w-full bg-black border border-neutral-700 rounded p-2 text-sm text-white" placeholder="Name"/>
                          <input type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} required className="w-full bg-black border border-neutral-700