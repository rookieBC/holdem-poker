import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CrtOverlay } from '../components/CrtOverlay';
import { useAccountStore } from '../store/account';
import { useRoomStore } from '../store/room';
import { connect } from '../lib/socket';

export function LobbyPage() {
  const navigate = useNavigate();
  const account = useAccountStore((s) => s.account);
  const clear = useAccountStore((s) => s.clear);
  const { lobbyRooms, loading, error, refreshLobby, createRoom, joinRoom } = useRoomStore();
  const [creating, setCreating] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [joinId, setJoinId] = useState('');

  // 未登录拦截
  useEffect(() => {
    connect();
    if (!account) navigate('/');
  }, [account, navigate]);

  // 拉取房间列表
  useEffect(() => {
    refreshLobby();
    const t = setInterval(refreshLobby, 5000);
    return () => clearInterval(t);
  }, [refreshLobby]);

  const handleCreate = async () => {
    const id = await createRoom(roomName || undefined);
    if (id) {
      const ok = await joinRoom(id);
      if (ok) navigate(`/room/${id}`);
    }
  };

  const handleJoin = async (input: string) => {
    const val = input.trim();
    if (!val) return;
    // 如果输入的是房间ID（r_开头），直接加入
    let targetId = val;
    // 否则按房间名在列表里匹配
    if (!val.startsWith('r_')) {
      const matched = lobbyRooms.find(
        (r) => r.name === val || r.id === val,
      );
      if (matched) {
        targetId = matched.id;
      } else {
        // 名字未精确匹配，尝试模糊匹配
        const fuzzy = lobbyRooms.find((r) => r.name.includes(val));
        if (fuzzy) targetId = fuzzy.id;
      }
    }
    const ok = await joinRoom(targetId);
    if (ok) navigate(`/room/${targetId}`);
  };

  return (
    <div className="w-full h-full bg-bg-deep flex flex-col overflow-hidden">
      <CrtOverlay />

      {/* 顶栏 */}
      <header className="flex items-center justify-between px-6 py-4 border-b-2 border-neon-purple/40 bg-bg-dark/60">
        <h1 className="title-font text-xl md:text-2xl glow-pink">HOLD&apos;EM · 大厅</h1>
        <div className="flex items-center gap-4">
          <div className="pixel-panel px-4 py-2 flex items-center gap-2">
            <span className="font-screen text-xs glow-cyan">{account?.username ?? '玩家'}</span>
            <span className="font-mono text-glow-yellow text-neon-yellow">
              {account?.chips ?? 0}
            </span>
            <span className="font-screen text-[10px] text-gray-400">CHIPS</span>
          </div>
          <button
            className="pixel-btn pixel-btn-pink text-xs"
            onClick={() => { clear(); navigate('/'); }}
          >
            登出
          </button>
        </div>
      </header>

      {/* 操作区 */}
      <div className="px-6 py-5 flex flex-wrap gap-4 items-end bg-bg-dark/30 border-b border-neon-purple/20">
        <div className="flex flex-col gap-1">
          <label className="font-screen text-[10px] glow-green">创建房间</label>
          <div className="flex gap-2">
            <input
              className="pixel-input"
              placeholder="房间名（可选）"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button className="pixel-btn pixel-btn-green" onClick={handleCreate} disabled={loading}>
              创建
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-screen text-[10px] glow-cyan">加入房间</label>
          <div className="flex gap-2">
            <input
              className="pixel-input"
              placeholder="房间名 或 房间ID (如 r_xxx)"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin(joinId)}
            />
            <button className="pixel-btn pixel-btn-cyan" onClick={() => handleJoin(joinId)}>
              加入
            </button>
          </div>
        </div>

        <button className="pixel-btn text-xs ml-auto" onClick={refreshLobby}>
          ⟳ 刷新
        </button>
      </div>

      {/* 房间列表 */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <h2 className="font-screen text-sm glow-purple mb-3">◇ 房间列表 ({lobbyRooms.length})</h2>

        {error && <p className="font-mono text-neon-red blink">{error}</p>}

        <AnimatePresence mode="popLayout">
          {lobbyRooms.length === 0 && !error ? (
            <motion.p
              key="empty"
              className="font-mono text-lg text-gray-500 text-center py-12"
            >
              ▢ 暂无房间 · 创建一个开始你的牌局 ▢
            </motion.p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {lobbyRooms.map((r) => (
                <motion.button
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="pixel-panel text-left p-4 hover:border-neon-cyan transition-colors cursor-pointer"
                  onClick={() => handleJoin(r.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-screen text-sm glow-cyan truncate">{r.name}</span>
                    {r.hasGame && (
                      <span className="font-screen text-[9px] glow-pink blink">● 进行中</span>
                    )}
                  </div>
                  <div className="font-mono text-base text-gray-300">
                    座位 {r.seatedCount}/{r.maxSeats}
                  </div>
                  <div className="font-mono text-xs text-gray-500 mt-1 truncate">ID: {r.id}</div>
                </motion.button>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
