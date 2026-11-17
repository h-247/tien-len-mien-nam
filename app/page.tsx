'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthenticatedUser } from '@/lib/server/auth';
import { ClientRoomState } from '@/lib/server/game-service';
import { Navbar } from '@/components/Navbar';
import { RegistrationView } from '@/components/RegistrationView';
import { LobbyView } from '@/components/LobbyView';
import { CreateRoomDialog } from '@/components/CreateRoomDialog';
import { WaitingRoomView } from '@/components/WaitingRoomView';
import { GameTableView } from '@/components/GameTableView';
import { LeaderboardView } from '@/components/LeaderboardView';
import { WalletView } from '@/components/WalletView';
import { RulesView } from '@/components/RulesView';
import { AdminView } from '@/components/AdminView';

export default function Home() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lobby');

  // Active room state
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<ClientRoomState | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Load authenticated user
  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = (await res.json()) as any;
      setUser(data.user || null);
    } catch (e) {
      console.error('Failed to fetch user:', e);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Fetch active room state
  const fetchRoomState = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (res.ok) {
        const state: ClientRoomState = await res.json();
        setRoomState(state);
      } else if (res.status === 400 || res.status === 404) {
        // Left room or room closed
        setActiveRoomId(null);
        setRoomState(null);
      }
    } catch (e) {
      console.error('Failed to poll room state:', e);
    }
  }, []);

  // Server-authoritative polling for active room
  useEffect(() => {
    if (!activeRoomId) return;

    fetchRoomState(activeRoomId);

    const interval = setInterval(() => {
      // Don't poll rapidly if tab is hidden
      if (!document.hidden) {
        fetchRoomState(activeRoomId);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeRoomId, fetchRoomState]);

  // Handle room actions
  const handleRoomAction = async (actionData: any) => {
    if (!activeRoomId) return;

    const res = await fetch(`/api/rooms/${activeRoomId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actionData),
    });

    const data = (await res.json()) as any;
    if (!res.ok) {
      throw new Error(data.error || 'Thao tác không thành công.');
    }

    if (data.state) {
      setRoomState(data.state);
    } else {
      await fetchRoomState(activeRoomId);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    setActiveRoomId(roomId);
  };

  const handleLeaveRoom = async () => {
    if (activeRoomId) {
      try {
        await handleRoomAction({ action: 'leave' });
      } catch (e) {
        // ignore
      }
      setActiveRoomId(null);
      setRoomState(null);
      fetchUser(); // refresh balance
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#212121] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-white text-black font-extrabold flex items-center justify-center text-xl animate-pulse mb-3">
          TL
        </div>
        <p className="text-xs text-neutral-400 font-medium">Đang kết nối hệ thống Tiến Lên Miền Nam...</p>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-[#212121] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white text-black font-black flex items-center justify-center text-3xl shadow-xl mb-4">
          TL
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
          Tiến Lên Miền Nam Online
        </h1>
        <p className="text-sm text-neutral-400 max-w-sm mb-6 leading-relaxed">
          Đấu bài trực tuyến cùng bạn bè hoặc luyện tập với AI Bot. Vui lòng đăng nhập qua ChatGPT để bắt đầu.
        </p>
        <a
          href="/signin-with-chatgpt?return_to=/"
          className="px-6 py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-sm shadow-md transition-colors"
        >
          Đăng nhập bằng ChatGPT
        </a>
      </div>
    );
  }

  // If user is not yet approved
  if (user.status !== 'approved') {
    return (
      <div className="min-h-screen bg-[#212121] flex flex-col">
        <Navbar
          user={user}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRefresh={fetchUser}
        />
        <main className="flex-1 px-4 py-6">
          <RegistrationView user={user} onSuccess={fetchUser} />
        </main>
      </div>
    );
  }

  // User is APPROVED
  return (
    <div className="min-h-screen bg-[#212121] flex flex-col">
      <Navbar
        user={user}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (activeRoomId && tab !== 'lobby') {
            // keep room active if navigating
          }
        }}
        onRefresh={fetchUser}
        onCreateRoomClick={() => setCreateDialogOpen(true)}
      />

      <main className="flex-1 px-3 sm:px-6 py-4 sm:py-6">
        {/* If user is currently in a room */}
        {activeRoomId && roomState ? (
          roomState.room.status === 'playing' || roomState.room.status === 'finished' ? (
            <GameTableView
              state={roomState}
              onAction={handleRoomAction}
              onLeaveRoom={handleLeaveRoom}
            />
          ) : (
            <WaitingRoomView
              state={roomState}
              onAction={handleRoomAction}
              onLeaveRoom={handleLeaveRoom}
            />
          )
        ) : (
          /* General Views */
          <>
            {activeTab === 'lobby' && (
              <LobbyView
                onJoinRoom={handleJoinRoom}
                onCreateRoomClick={() => setCreateDialogOpen(true)}
              />
            )}

            {activeTab === 'leaderboard' && <LeaderboardView />}

            {activeTab === 'wallet' && <WalletView />}

            {activeTab === 'rules' && <RulesView />}

            {activeTab === 'admin' && user.role === 'admin' && <AdminView />}
          </>
        )}
      </main>

      <CreateRoomDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={(newRoomId) => {
          setActiveRoomId(newRoomId);
        }}
      />
    </div>
  );
}
