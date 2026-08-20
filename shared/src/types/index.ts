// ============================================================
// 德州扑克 - 共享类型定义
// ============================================================

// ---- 牌 ----
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  /** 点数权重 2-14（A=14） */
  value: number;
  /** 用于唯一标识/比较 */
  id: string;
}

// ---- 牌型 ----
export enum HandRank {
  HighCard = 0,      // 高牌
  Pair = 1,          // 一对
  TwoPair = 2,       // 两对
  ThreeOfAKind = 3,  // 三条
  Straight = 4,      // 顺子
  Flush = 5,         // 同花
  FullHouse = 6,     // 葫芦
  FourOfAKind = 7,   // 四条
  StraightFlush = 8, // 同花顺
  RoyalFlush = 9,    // 皇家同花顺
}

export interface HandEvaluation {
  rank: HandRank;
  /** 用于比较的权重数组，逐位比较 */
  tiebreakers: number[];
  /** 组成该牌型的5张牌 */
  bestFive: Card[];
  /** 牌型中文名 */
  name: string;
}

// ---- 游戏阶段 ----
export enum GameStage {
  Waiting = 'waiting',     // 等待玩家
  Ready = 'ready',         // 准备开始
  PreFlop = 'preflop',     // 翻牌前
  Flop = 'flop',           // 翻牌
  Turn = 'turn',           // 转牌
  River = 'river',         // 河牌
  Showdown = 'showdown',   // 摊牌
  Settled = 'settled',     // 结算完成
}

// ---- 玩家动作 ----
export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface PlayerAction {
  type: ActionType;
  amount?: number; // 加注/跟注金额
}

// ---- 座位与玩家 ----
export interface Seat {
  index: number;
  player: PublicPlayer | null; // null = 空座（等待加入）
}

export interface PublicPlayer {
  id: string;
  username: string;
  avatar: string;     // 像素头像标识
  chips: number;       // 总筹码
  isReady: boolean;    // 是否已准备
  isSeated: boolean;   // 是否已坐下
  /** 当前局状态 */
  inHand: boolean;     // 是否仍在牌局中（未弃牌）
  hasFolded: boolean;
  isAllIn: boolean;
  /** 本轮下注 */
  betThisRound: number;
  /** 本局累计投入（用于边池） */
  totalCommitted: number;
  /** 本局底牌（仅自己可见，他人为遮蔽） */
  holeCards: Card[] | null; // 2张
  /** 上一次动作（用于UI展示） */
  lastAction?: PlayerAction | null;
  /** 摊牌时的牌型名（仅 showdown/settled 阶段有值） */
  handName?: string | null;
}

// ---- 底池 ----
export interface Pot {
  amount: number;
  /** 有资格争夺该底池的玩家ID */
  eligiblePlayerIds: string[];
}

// ---- 游戏状态（服务端权威） ----
export interface GameState {
  stage: GameStage;
  deck: Card[];          // 牌堆（仅服务端，不广播）
  communityCards: Card[]; // 公共牌（0-5张）
  pots: Pot[];            // 主底池 + 边池
  currentPot: number;     // 当前底池总额（展示用）
  seats: Seat[];          // 座位列表
  dealerIndex: number;    // 庄家位置
  smallBlindIndex: number;
  bigBlindIndex: number;
  currentPlayerIndex: number; // 当前行动玩家
  currentBet: number;     // 当前轮最高下注额
  minRaise: number;       // 最小加注额
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  /** 倒计时（行动时限） */
  actionDeadline: number | null;
  /** 结算后的赢家列表（仅 settled 阶段有值） */
  winners?: WinnerInfo[];
}

/** 赢家信息 */
export interface WinnerInfo {
  playerId: string;
  username: string;
  /** 赢得的筹码 */
  amount: number;
  /** 牌型名（仅剩一人弃牌获胜时为 null） */
  handName: string | null;
}

// ---- 道具 ----
export type ItemId =
  | 'xray'          // 透视镜：偷看一张即将翻开的公共牌
  | 'peek-eye'      // 偷窥眼：偷看对手一张底牌
  | 'swap'          // 换牌术：替换自己一张底牌
  | 'reshuffle'     // 重洗牌：重新发当前阶段公共牌
  | 'insurance'     // 保险券：输牌返还50%
  | 'double-bounty';// 双倍赏金：赢牌额外100%

export interface InventoryItem {
  id: ItemId;
  name: string;
  description: string;
  count: number;
}

export interface ItemUseContext {
  itemId: ItemId;
  targetSeatIndex?: number;  // 偷窥眼目标
  targetCardIndex?: number;  // 换牌术/透视镜目标
}

// ---- 账户 ----
export interface Account {
  id: string;
  username: string;
  token: string;
  chips: number;
  inventory: InventoryItem[];
  stats: PlayerStats;
  createdAt: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  totalChipsWon: number;
  bestHand: string | null;
}

// ---- 房间 ----
export interface Room {
  id: string;
  name: string;
  seats: Seat[];
  gameState: GameState | null;
  config: RoomConfig;
  hostPlayerId: string | null;
  createdAt: number;
}

export interface RoomConfig {
  maxSeats: number;       // 6 或 9
  minPlayers: number;     // 开局最低人数（2）
  smallBlind: number;
  bigBlind: number;
  startingChips: number;
}

// ============================================================
// 事件协议（Socket.io）
// ============================================================

// 客户端 -> 服务端
export enum ClientEvent {
  AuthLogin = 'auth:login',       // 一键登录/注册
  LobbyList = 'lobby:list',       // 大厅房间列表
  RoomCreate = 'room:create',
  RoomJoin = 'room:join',
  RoomLeave = 'room:leave',
  SeatTake = 'seat:take',         // 坐下
  SeatStand = 'seat:stand',       // 站起
  ReadyToggle = 'ready:toggle',   // 准备/取消准备
  GameStart = 'game:start',       // 房主开局
  GameNext = 'game:next',         // 下一局（结算后清理，房主发起）
  Action = 'action',             // 下注动作
  ItemUse = 'item:use',           // 使用道具
}

// 服务端 -> 客户端
export enum ServerEvent {
  AuthResult = 'auth:result',
  LobbyList = 'lobby:list',
  RoomState = 'room:state',       // 房间完整状态
  GameState = 'game:state',      // 局面更新广播
  GameEvent = 'game:event',       // 动画事件（发牌/翻牌/筹码/胜负）
  Error = 'error',
  PlayerJoined = 'player:joined',
  PlayerLeft = 'player:left',
}

// 动画事件类型（驱动前端动效）
export type GameEventType =
  | 'deal-hole'      // 发底牌
  | 'deal-community' // 发公共牌
  | 'bet'            // 下注
  | 'fold'           // 弃牌
  | 'showdown'       // 摊牌
  | 'win'            // 胜利
  | 'item-used';     // 道具使用

export interface GameEventPayload {
  type: GameEventType;
  data: Record<string, unknown>;
}
