import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CrtOverlay } from '../components/CrtOverlay';
import { PokerTable } from '../components/PokerTable';
import { ActionPanel } from '../components/ActionPanel';
import { useAccountStore } from '../store/account';
import { useRoomStore } from '../store/room';
import { useGameStore } from '../store/game';
import { connect } from '../lib/socket';
import { useScreenShake } from '../hooks/useScreenShake';
import { ResultBanner } from '../components/ResultBanner';

export function RoomPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const account = useAccountStore((s) => s.account);
  const clear = useAccountStore((s) => s.clear);
  const {
    currentRoom,
    error,
    joinRoom,
    leaveRoom,
    takeSeat,
    standUp,
    toggleReady,
    startGame,
    setRoom,
    subscribe,
    refreshLobby,
  } = useRoomStore();
  const subscribeGame = useGameStore((s) => s.subscribe);
  const gameState = useGameStore((s) => s.state);
  const shakeRef = useScreenShake();

  // 拦截未登录 + 订阅推送
  useEffect(() => {
    connect();
    subscribe();
    subscribeGame();
    if (!account) navigate('/');
  }, [account, navigate, subscribe, subscribeGame]);

  // 进入房间
  useEffect(() => {
    if (!roomId) return;
    if (!currentRoom || currentRoom.id !== roomId) {
      joinRoom(roomId);
    }
  }, [roomId, currentRoom, joinRoom]);

  const handleLeave = async () => {
    await leaveRoom();
    setRoom(null);
    refreshLobby();
    navigate('/lobby');
  };

  if (!account) return null;

  // 优先用 game store 推送的 state，回退到 room 里的 state
  const activeGameState = gameState ?? currentRoom?.gameState ?? null;
  const inGame = activeGameState !== null;

  const seats = currentRoom?.seats ?? [];
  const mySeat = seats.find((s) => s.player?.id === account.id);
  const isHost = currentRoom?.hostPlayerId === account.id;
  const seatedCount = seats.filter((s) => s.player !== null).length;
  const readyCount = seats.filter((s) => s.player?.isReady).length;
  const minPlayers = currentRoom?.config.minPlayers ?? 2;

  return (
    <div className="w-full h-full bg-bg-deep flex flex-col overflow-hidden">
      <CrtOverlay />

      {/* 顶栏 */}
      <header className="flex items-center justify-between px-6 py-3 border-b-2 border-neon-purple/40 bg-bg-dark/60 shrink-0">
        <div className="flex items-center gap-4">
          <button className="pixel-btn text-xs" onClick={handleLeave}>
            ← 返回大厅
          </button>
          <h1 className="font-screen text-sm glow-cyan truncate max-w-xs">
            {currentRoom?.name ?? '房间'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-gray-400">
            座位 {seatedCount}/{currentRoom?.config.maxSeats ?? 6}
          </span>
          <span className="font-mono text-sm text-neon-yellow">
            {account.chips} CHIPS
          </span>
        </div>
      </header>

      {error && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 info-banner border-neon-red text-neon-red blink">
          {error}
        </div>
      )}

      {/* 主区域 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {inGame && activeGameState ? (
          /* 游戏进行中：牌桌占满上方，操作面板在下方独立区域 */
          <>
            <div ref={shakeRef} className="flex-1 relative min-h-[300px]">
              <ResultBanner />
              <PokerTable state={activeGameState} myPlayerId={account.id} />
            </div>
            <div className="shrink-0 px-2 pb-2 w-full flex justify-center">
              <ActionPanel state={activeGameState} />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-auto p-4 md:p-6 flex flex-col items-center justify-center gap-4">
            {/* 未开局：座位选择 */}
            <div className="pixel-panel p-6 w-full max-w-3xl">
              <h2 className="font-screen text-sm glow-purple mb-4 text-center">
                ◇ 选择座位坐下 ◇
              </h2>
              <div className="grid grid-cols-3 gap-3 justify-items-center">
                {seats.map((seat) => {
                  const occupied = seat.player !== null;
                  const isMe = seat.player?.id === account.id;
                  return (
                    <div
                      key={seat.index}
                      className={
                        'seat ' +
                        (occupied ? 'seat-occupied ' : 'seat-empty ') +
                        (isMe ? 'seat-self ' : '') +
                        (seat.player?.isReady ? 'seat-ready ' : '')
                      }
                    >
                      {occupied ? (
                        <>
                          <span className="font-screen text-xs glow-cyan">
                            {seat.player!.username}
                          </span>
                          <span className="font-mono text-base text-neon-yellow">
                            {seat.player!.chips}
                          </span>
                          <span className="seat-status font-screen text-[9px]">
                            {seat.player!.isReady ? '✓ 已准备' : '准备中…'}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-mono text-base text-gray-600">空座</span>
                          <button
                            className="pixel-btn pixel-btn-cyan text-[10px]"
                            onClick={() => takeSeat(seat.index)}
                          >
                            坐下
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 操作区 */}
            <div className="flex flex-wrap gap-3 justify-center">
              {mySeat && (
                <>
                  <button
                    className={
                      'pixel-btn ' +
                      (mySeat.player?.isReady ? 'pixel-btn-green' : 'pixel-btn-cyan')
                    }
                    onClick={toggleReady}
                  >
                    {mySeat.player?.isReady ? '✓ 已准备 · 取消' : '准备开始'}
                  </button>
                  <button className="pixel-btn text-xs" onClick={standUp}>
                    站起
                  </button>
                </>
              )}
              {isHost && (
                <button
                  className="pixel-btn pixel-btn-pink"
                  onClick={startGame}
                  disabled={seatedCount < minPlayers}
                >
                  ▶ 开局 {seatedCount < minPlayers ? `(需${minPlayers}人)` : ''}
                </button>
              )}
            </div>

            {/* 状态提示 */}
            <div className="text-center">
              <p className="font-mono text-base text-gray-400">
                已准备 {readyCount}/{seatedCount} · 最低开局 {minPlayers} 人
              </p>
              {!isHost && seatedCount >= minPlayers && (
                <p className="font-mono text-sm text-gray-500 mt-1">等待房主开局…</p>
              )}
              {isHost && seatedCount < minPlayers && (
                <p className="font-mono text-sm text-neon-yellow mt-1 blink">
                  ▢ 等待更多玩家加入 ▢
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 底部账户信息 */}
      <footer className="px-6 py-2 border-t border-neon-purple/20 bg-bg-dark/40 flex justify-between items-center shrink-0">
        <span className="font-mono text-xs text-gray-500">ID: {account.id}</span>
        <button
          className="pixel-btn pixel-btn-pink text-[10px]"
          onClick={() => {
            clear();
            navigate('/');
          }}
        >
          登出
        </button>
      </footer>
    </div>
  );
}
