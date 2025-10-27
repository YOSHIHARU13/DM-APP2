// ユーザー情報の型
export interface User {
  id: string;
  username: string;
  createdAt: Date;
}

// ログインフォームのProps
export interface LoginFormProps {
  onLogin: (user: User) => void;
}

// プロジェクト情報の型
export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  userId: string;
}

// プロジェクト管理のProps
export interface ProjectManagerProps {
  user: User;
  onProjectSelect: (project: Project) => void;
}

// プロジェクト追加フォームのProps
export interface ProjectFormProps {
  onProjectAdd: (project: Project) => void;
  onCancel: () => void;
}

// デッキ情報の型
export interface Deck {
  id: string;
  name: string;
  colors: string[];
  imageUrl?: string;
  createdAt: Date;
  projectId: string;
  tournamentTitles?: TournamentTitle[];  // トーナメント戦績を追加
}

// トーナメント称号の型
export interface TournamentTitle {
  tournamentId: string;
  tournamentName: string;
  rank: 1 | 2 | 3;
  date: Date;
}

// Battle型（1戦ずつの記録）
export interface Battle {
  id: string;
  deck1Id: string;
  deck2Id: string;
  deck1Wins: number;
  deck2Wins: number;
  deck1GoingFirst: number;
  deck2GoingFirst: number;
  memo: string;
  date: Date;
  projectId: string;
  tournamentId?: string;  // トーナメント戦かどうかを判別
}

// トーナメント情報の型
export interface Tournament {
  id: string;
  projectId: string;
  name: string;
  format: 'single' | 'double';
  matchType: 'best_of_1' | 'best_of_3';
  participantDeckIds: string[];
  status: 'setup' | 'in_progress' | 'completed';
  createdAt: Date;
  completedAt?: Date;
  winnerId?: string;
  runnerUpId?: string;
  thirdPlaceIds?: string[];
  bracket: TournamentBracket;
}

// トーナメント関連の型定義
export type TournamentFormat = 'single' | 'double';
export type MatchType = 'best_of_1' | 'best_of_3';
export type MatchStatus = 'pending' | 'in_progress' | 'completed';
export type TournamentStatus = 'setup' | 'in_progress' | 'completed';

// トーナメントブラケット構造
export interface TournamentBracket {
  winnersBracket: Round[];
  losersBracket?: Round[];
  thirdPlaceMatch?: Match;
  grandFinal?: Match;
}

// ラウンド情報
export interface Round {
  roundNumber: number;
  roundName: string;
  matches: Match[];
}

// 試合情報
export interface Match {
  matchId: string;
  deck1Id: string | null;
  deck2Id: string | null;
  deck1Wins: number;
  deck2Wins: number;
  winnerId: string | null;
  loserId: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  battleId?: string;
}

// デッキ一覧画面のProps
export interface DeckListProps {
  project: Project;
  onBackToProject: () => void;
}

// デッキ追加フォームのProps
export interface DeckFormProps {
  projectId: string;
  onDeckAdd: (deck: Deck) => void;
  onCancel: () => void;
}

// 対戦登録フォームのProps
export interface BattleFormProps {
  projectId: string;
  decks: Deck[];
  battles?: Battle[];
  onBattleAdd: (battle: Omit<Battle, 'id'>) => void;
  onCancel: () => void;
}

// デッキ詳細画面のProps
export interface DeckDetailProps {
  deck: Deck;
  battles: Battle[];
  allDecks: Deck[];
  onBack: () => void;
  onBattleDelete?: (battleId: string) => void;
  onDeckUpdate?: (updatedDeck: Deck) => void;
}

// 分析画面のProps
export interface AnalysisProps {
  project: Project;
  decks: Deck[];
  battles: Battle[];
  onBack: () => void;
}

// 相性データの型
export interface CompatibilityData {
  [deckId: string]: {
    [opponentId: string]: {
      wins: number;
      losses: number;
      winRate: number;
      totalGames: number;
    };
  };
}

// 三すくみデータの型
export interface TriangleData {
  deck1: Deck;
  deck2: Deck;
  deck3: Deck;
  relationships: {
    deck1VsDeck2: number;
    deck2VsDeck3: number;
    deck3VsDeck1: number;
  };
}

// トーナメント作成フォームのProps
export interface TournamentFormProps {
  projectId: string;
  decks: Deck[];
  onTournamentCreate: (tournament: Omit<Tournament, 'id' | 'createdAt' | 'status' | 'bracket'>) => void;
  onCancel: () => void;
}

// トーナメント詳細画面のProps
export interface TournamentDetailProps {
  tournament: Tournament;
  decks: Deck[];
  onBack: () => void;
  onMatchComplete: (tournamentId: string, matchId: string, battle: Omit<Battle, 'id'>) => void;
  onTournamentComplete: (tournamentId: string) => void;
}

// トーナメント一覧のProps
export interface TournamentListProps {
  tournaments: Tournament[];
  decks: Deck[];
  onTournamentSelect: (tournament: Tournament) => void;
  onCreateNew: () => void;
}
