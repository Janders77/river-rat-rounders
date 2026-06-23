import React from 'react';
import PlayerSignUp from '@/components/home/PlayerSignUp';
import { useAuth } from '@/lib/AuthContext';

const UserNotRegisteredError = () => {
  const { logout } = useAuth();

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ background: "linear-gradient(to bottom, #0a0a0a 0%, #1a0000 100%)" }}>
      <img src="/logo.png" alt="River Rat Rounders" className="w-32 h-32 object-contain mb-6" />
      <h1 className="text-white text-2xl font-bold mb-1 text-center">Not Registered Yet</h1>
      <p className="text-gray-400 text-base text-center mb-8">
        You're not in the system yet. Fill out the form below to request access.
      </p>
      <div className="w-full max-w-sm">
        <PlayerSignUp defaultExpanded />
      </div>
      <button
        onClick={() => logout(true)}
        className="mt-8 text-gray-500 text-sm hover:text-gray-300 transition-colors"
      >
        Sign out and use a different account
      </button>
    </div>
  );
};

export default UserNotRegisteredError;
