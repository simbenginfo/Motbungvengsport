import React from 'react';
import { Match, Team } from '../types';
import { Calendar, MapPin } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  homeTeam?: Team;
  awayTeam?: Team;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, homeTeam, awayTeam }) => {
  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'LIVE';

  const dateObj = new Date(match.date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-brand-gray border border-neutral-800 rounded-lg p-5 hover:border-brand-red/50 transition-all duration-300 group relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute top-0 left-0 w-1 h-full bg-brand-red opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex justify-between items-center mb-4 text-xs text-gray-400 font-medium tracking-wide">
        <span className="bg-neutral-900 px-2 py-1 rounded border border-neutral-700">{match.category}</span>
        <div className="flex items-center gap-1">
            {isLive && <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />}
            <span className={isLive ? "text-red-500 font-bold" : ""}>{match.status}</span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        {/* Home Team */}
        <div className="flex flex-col items-center flex-1">
          <div className="w-12 h-12 rounded-full bg-neutral-700 flex items-center justify-center mb-2 border border-neutral-600">
             <span className="text-xl font-display font-bold text-white">{homeTeam?.name.substring(0, 1)}</span>
          </div>
          <span className="text-center font-semibold text-sm">{homeTeam?.name || 'Unknown'}</span>
        </div>

        {/* Score/VS */}
        <div className="px-4 text-center">
          {isFinished || isLive ? (
            <div className="text-3xl font-display font-bold text-white tracking-widest">
              {match.scoreHome} - {match.scoreAway}
            </div>
          ) : (
            <div className="text-2xl font-display font-bold text-neutral-500">VS</div>
          )}
        </div>

        {/* Away Team */}
        <div className="flex flex-col items-center flex-1">
          <div className="w-12 h-12 rounded-full bg-neutral-700 flex items-center justify-center mb-2 border border-neutral-600">
             <span className="text-xl font-display font-bold text-white">{awayTeam?.name.substring(0, 1)}</span>
          </div>
          <span className="text-center font-semibold text-sm">{awayTeam?.name || 'Unknown'}</span>
        </div>
      </div>

      <div className="border-t border-neutral-800 pt-3 flex justify-between items-center text-sm text-gray-500">
        <div className="flex items-center gap-2">
            <Calendar size={14} />
            <span>{formattedDate} • {formattedTime}</span>
        </div>
        <div className="flex items-center gap-2">
            <MapPin size={14} />
            <span>{match.location}</span>
        </div>
      </div>
    </div>
  );
};
