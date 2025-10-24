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
  imageUrl?: string;  // デッキの画像URL
  createdAt: Date;
  projectId: string;
}

// Battle型（1戦ずつの記録）
export interface Battle {
  id: string;
  deck1Id: string;
  deck2Id: string;
  deck1Wins: number;        // 1 or 0 (1戦の勝敗)
  deck2Wins: number;        // 1 or 0 (1戦の勝敗)
  deck1GoingFirst: number;  // 1 or 0 (先攻かどうか)
  deck2GoingFirst: number;  // 1 or 0 (先攻かどうか)
  memo: string;
  date: Date;
  projectId: string;
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
  battles?: Battle[];  // ← この行を追加しました！おすすめ対戦機能のために必要です
  onBattleAdd: (battle: Battle) => void;
  onCancel: () => void;
}

// デッキ詳細画面のProps
export interface DeckDetailProps {
  deck: Deck;
  battles: Battle[];
  allDecks: Deck[];
  onBack: () => void;
  onBattleDelete?: (battleId: string) => void;
  onDeckUpdate?: (updatedDeck: Deck) => void;  // デッキ情報更新用
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
