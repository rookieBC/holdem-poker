import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CrtOverlay } from '../components/CrtOverlay';
import { useAccountStore } from '../store/account';
import { connect } from '../lib/socket';

export function LoginPage() {
  const navigate = useNavigate();
  const { account, status, error, login, loadToken, clear } = useAccountStore();
  const [touched, setTouched] = useState(false);

  // 自动登录：若有本地 token，尝试登录
  useEffect(() => {
    loadToken();
    const token = localStorage.getItem('holdem_token');
    if (token) {
      setTouched(true);
      connect();
      login().then((ok) => {
        if (ok) navigate('/lobby');
      });
    }
  }, [loadToken, login, navigate]);

  // 已登录则跳走
  useEffect(() => {
    if (status === 'authed' && account) navigate('/lobby');
  }, [status, account, navigate]);

  const handleLogin = async () => {
    setTouched(true);
    connect();
    const ok = await login();
    if (ok) navigate('/lobby');
  };

  return (
    <div className="w-full h-full bg-bg-deep flex flex-col items-center justify-center gap-8 p-4">
      <CrtOverlay />

      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="title-font text-4xl md:text-6xl glow-pink mb-3">HOLD&apos;EM</h1>
        <p className="font-screen text-sm md:text-base glow-cyan tracking-widest">
          ★ 德州扑克 · TEXAS HOLD&apos;EM ★
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col items-center gap-4"
      >
        <p className="font-mono text-lg text-neon-cyan/80">无需密码 · 一键进入牌桌</p>
        <button
          className="pixel-btn pixel-btn-green text-lg"
          onClick={handleLogin}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? '连接中…' : '▶ 一键登录'}
        </button>
        {status === 'error' && touched && (
          <p className="font-mono text-neon-red text-base blink">{error ?? '登录失败'}</p>
        )}
        {account && (
          <p className="font-mono text-sm text-gray-400">
            已登录: {account.username} · 点此
            <button className="text-neon-pink underline ml-1" onClick={() => { clear(); setTouched(false); }}>
              切换账号
            </button>
          </p>
        )}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="font-mono text-xs text-gray-500"
      >
        ▣ 复古像素风 · 真人同桌 · 道具加持 ▣
      </motion.p>
    </div>
  );
}
