
import React from 'react';
import { User } from '../../types';

interface UserProfileProps {
  user: User;
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  return (
    <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
      <div className="text-right hidden sm:block">
        <p className="text-[9px] font-black text-slate-800 uppercase leading-none">{user.displayName}</p>
        <p className="text-[7px] font-bold text-blue-500 uppercase mt-1 tracking-tighter">{user.position || user.role}</p>
      </div>
      <div className="relative group cursor-pointer">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center font-black text-blue-400 text-sm shadow-lg overflow-hidden border-2 border-white ring-1 ring-slate-200 transition-all group-hover:ring-blue-400 group-hover:scale-105 active:scale-95">
          {user.photo ? (
            <img src={user.photo} className="w-full h-full object-cover" alt={user.displayName} />
          ) : (
            <span>{user.displayName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
      </div>
    </div>
  );
};

export default UserProfile;
