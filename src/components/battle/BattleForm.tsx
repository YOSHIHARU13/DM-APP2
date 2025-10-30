import React, { useState, useMemo, useEffect } from 'react';
import { Battle, BattleFormProps } from '../../types';

interface MatchupSuggestion {
  deck1Id: string;
  deck2Id: string;
  deck1Name: string;
  deck2Name: string;
  totalGames: number;
  reason: 'unplayed' | 'few_games' | 'unbalanced_winrate';
  priority: number;
  winRate?: number;
}

interface DeckStats {
  totalWins: number;
  totalLosses: number;
  winRate: number;
  rating: number;
}

// Eloレーティング計算（DeckDetailと同じ式）
const calculateEloRating = (currentRating: number, opponentRating: number, isWin: boolean, kFactor: number = 32): number => {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400));
  const actualScore = isWin ? 1 : 0;
  return Math.round(currentRating + kFactor * (actualScore - expectedScore));
};

const BattleForm: React.FC<BattleFormProps> = ({ projectId, decks, battles, onBattleAdd, onCancel }) => {
  const [deck1Id, setDeck1Id] = useState<string>('');
  const [deck2Id, setDeck2Id] = useState<string>('');
  const [winner, setWinner] = useState<'deck1' | 'deck2' | ''>('');
  const [goingFirst, setGoingFirst] = useState<'deck1' | 'deck2' | ''>('');
  const [memo, setMemo] = useState<string>('');
  const [continuousMode, setContinuousMode] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // デッキの全体統計を計算（Eloレーティングを使用）
  const deckStatsMap = useMemo((): Record<string, DeckStats> => {
    const stats: Record<string, DeckStats> = {};
    
    // 初期化
    decks.forEach(deck => {
      stats[deck.id] = {
        totalWins: 0,
        totalLosses: 0,
        winRate: 0,
        rating: 1500
      };
    });

    // 全デッキの初期レート設定
    const allRatings: {[deckId: string]: number} = {};
    decks.forEach(d => {
      allRatings[d.id] = 1500;
    });

    if (battles && battles.length > 0) {
      // 時系列順にソート
      const sortedBattles = [...battles].sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
        const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
        return dateA - dateB;
      });

      // 時系列順にレートを更新
      sortedBattles.forEach(battle => {
        const deck1Rating = allRatings[battle.deck1Id] || 1500;
        const deck2Rating = allRatings[battle.deck2Id] || 1500;
        const deck1Won = (battle.deck1Wins || 0) > (battle.deck2Wins || 0);
        
        // Eloレーティングを更新
        allRatings[battle.deck1Id] = calculateEloRating(deck1Rating, deck2Rating, deck1Won);
        allRatings[battle.deck2Id] = calculateEloRating(deck2Rating, deck1Rating, !deck1Won);

        // 勝敗カウント
        if (stats[battle.deck1Id]) {
          stats[battle.deck1Id].totalWins += battle.deck1Wins || 0;
          stats[battle.deck1Id].totalLosses += battle.deck2Wins || 0;
        }
        if (stats[battle.deck2Id]) {
          stats[battle.deck2Id].totalWins += battle.deck2Wins || 0;
          stats[battle.deck2Id].totalLosses += battle.deck1Wins || 0;
        }
      });

      // 最終レートと勝率を設定
      Object.keys(stats).forEach(deckId => {
        stats[deckId].rating = allRatings[deckId] || 1500;
        const total = stats[deckId].totalWins + stats[deckId].totalLosses;
        if (total > 0) {
          stats[deckId].winRate = (stats[deckId].totalWins / total) * 100;
        }
      });
    }

    return stats;
  }, [decks, battles]);

  // 対戦データの分析
  const matchupAnalysis = useMemo(() => {
    const analysis: Record<string, Record<string, { 
      games: number; 
      wins: number; 
      losses: number;
      goingFirstCount: number;
    }>> = {};
    
    decks.forEach(deck => {
      analysis[deck.id] = {};
      decks.forEach(opponent => {
        if (deck.id !== opponent.id) {
          analysis[deck.id][opponent.id] = { 
            games: 0, 
            wins: 0, 
            losses: 0,
            goingFirstCount: 0
          };
        }
      });
    });

    if (battles) {
      battles.forEach(battle => {
        if (analysis[battle.deck1Id] && analysis[battle.deck1Id][battle.deck2Id]) {
          analysis[battle.deck1Id][battle.deck2Id].games += 1;
          analysis[battle.deck1Id][battle.deck2Id].wins += battle.deck1Wins || 0;
          analysis[battle.deck1Id][battle.deck2Id].losses += battle.deck2Wins || 0;
          if (battle.deck1GoingFirst === 1) {
            analysis[battle.deck1Id][battle.deck2Id].goingFirstCount += 1;
          }
        }
        
        if (analysis[battle.deck2Id] && analysis[battle.deck2Id][battle.deck1Id]) {
          analysis[battle.deck2Id][battle.deck1Id].games += 1;
          analysis[battle.deck2Id][battle.deck1Id].wins += battle.deck2Wins || 0;
          analysis[battle.deck2Id][battle.deck1Id].losses += battle.deck1Wins || 0;
          if (battle.deck2GoingFirst === 1) {
            analysis[battle.deck2Id][battle.deck1Id].goingFirstCount += 1;
          }
        }
      });
    }

    return analysis;
  }, [decks, battles]);

  // 対面勝率の計算
  const getMatchupWinRate = (deckId1: string, deckId2: string): number | null => {
    const data = matchupAnalysis[deckId1]?.[deckId2];
    if (!data || data.games === 0) return null;
    
    const total = data.wins + data.losses;
    if (total === 0) return null;
    
    return (data.wins / total) * 100;
  };

  // おすすめ対戦の生成
  const suggestions = useMemo((): MatchupSuggestion[] => {
    const suggestions: MatchupSuggestion[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < decks.length; i++) {
      for (let j = i + 1; j < decks.length; j++) {
        const deck1 = decks[i];
        const deck2 = decks[j];
        const key = `${deck1.id}-${deck2.id}`;
        
        if (processed.has(key)) continue;
        processed.add(key);

        const data1 = matchupAnalysis[deck1.id]?.[deck2.id];
        const totalGames = data1?.games || 0;

        let reason: 'unplayed' | 'few_games' | 'unbalanced_winrate';
        let priority = 0;
        let winRate: number | undefined;

        if (totalGames === 0) {
          reason = 'unplayed';
          priority = 1000;
        } else if (totalGames < 5) {
          reason = 'few_games';
          priority = 500 + (5 - totalGames) * 50;
        } else {
          const deck1Wins = data1?.wins || 0;
          const deck1Losses = data1?.losses || 0;
          const totalDecisions = deck1Wins + deck1Losses;
          
          if (totalDecisions > 0) {
            winRate = (deck1Wins / totalDecisions) * 100;
            const deviation = Math.abs(winRate - 50);
            
            reason = 'unbalanced_winrate';
            priority = deviation * 10;
          } else {
            continue;
          }
        }

        suggestions.push({
          deck1Id: deck1.id,
          deck2Id: deck2.id,
          deck1Name: deck1.name,
          deck2Name: deck2.name,
          totalGames,
          reason,
          priority,
          winRate
        });
      }
    }

    return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 5);
  }, [decks, battles, matchupAnalysis]);

  // デッキ選択時に先行を自動設定
  useEffect(() => {
    if (!deck1Id || !deck2Id) return;

    const data1 = matchupAnalysis[deck1Id]?.[deck2Id];
    const data2 = matchupAnalysis[deck2Id]?.[deck1Id];

    if (!data1 || !data2) return;

    const deck1GoingFirstCount = data1.goingFirstCount || 0;
    const deck2GoingFirstCount = data2.goingFirstCount || 0;

    if (deck1GoingFirstCount < deck2GoingFirstCount) {
      setGoingFirst('deck1');
    } else if (deck2GoingFirstCount < deck1GoingFirstCount) {
      setGoingFirst('deck2');
    } else {
      setGoingFirst('');
    }
  }, [deck1Id, deck2Id, matchupAnalysis]);

  const getDeckName = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    return deck ? deck.name : '不明';
  };

  const getDeck = (deckId: string) => {
    return decks.find(d => d.id === deckId);
  };

  const handleSuggestionClick = (suggestion: MatchupSuggestion) => {
    setDeck1Id(suggestion.deck1Id);
    setDeck2Id(suggestion.deck2Id);
    setShowSuggestions(false);
  };

  const handleRandomSelect = (type: 'all' | 'deck1' | 'deck2' | 'suggested') => {
    if (type === 'suggested' && suggestions.length > 0) {
      const randomSuggestion = suggestions[Math.floor(Math.random() * Math.min(3, suggestions.length))];
      setDeck1Id(randomSuggestion.deck1Id);
      setDeck2Id(randomSuggestion.deck2Id);
      return;
    }

    if (type === 'all') {
      if (suggestions.length > 0) {
        const topSuggestions = suggestions.slice(0, Math.max(1, Math.ceil(suggestions.length * 0.3)));
        const selectedPair = topSuggestions[Math.floor(Math.random() * topSuggestions.length)];
        setDeck1Id(selectedPair.deck1Id);
        setDeck2Id(selectedPair.deck2Id);
      } else {
        const availableDecks = decks.filter(d => d.id !== deck2Id);
        if (availableDecks.length > 0) {
          const randomDeck = availableDecks[Math.floor(Math.random() * availableDecks.length)];
          setDeck1Id(randomDeck.id);
        }
      }
      return;
    }

    const availableDecks = type === 'deck1' 
      ? decks.filter(d => d.id !== deck2Id)
      : type === 'deck2'
      ? decks.filter(d => d.id !== deck1Id)
      : decks;

    if (availableDecks.length === 0) return;

    const randomDeck = availableDecks[Math.floor(Math.random() * availableDecks.length)];
    
    if (type === 'deck1') {
      setDeck1Id(randomDeck.id);
    } else {
      setDeck2Id(randomDeck.id);
    }
  };

  const handleSubmit = () => {
    if (!deck1Id || !deck2Id) {
      alert('両方のデッキを選択してください');
      return;
    }

    if (deck1Id === deck2Id) {
      alert('異なるデッキを選択してください');
      return;
    }

    if (!winner) {
      alert('勝者を選択してください');
      return;
    }

    if (!goingFirst) {
      alert('先攻を選択してください');
      return;
    }

    const newBattle: Omit<Battle, 'id'> = {
      projectId,
      deck1Id,
      deck2Id,
      deck1Wins: winner === 'deck1' ? 1 : 0,
      deck2Wins: winner === 'deck2' ? 1 : 0,
      deck1GoingFirst: goingFirst === 'deck1' ? 1 : 0,
      deck2GoingFirst: goingFirst === 'deck2' ? 1 : 0,
      date: new Date(),
      memo: memo.trim()
    };

    onBattleAdd(newBattle);

    if (continuousMode) {
      // 連続モード: 勝敗と先攻とメモのみリセット（デッキは保持、フォームは開いたまま）
      setWinner('');
      setGoingFirst('');
      setMemo('');
      // deck1Idとdeck2Idは保持
      // onCancelを呼ばない = フォームは開いたまま
    } else {
      // 通常モード: 全てリセットしてフォームを閉じる
      setDeck1Id('');
      setDeck2Id('');
      setWinner('');
      setGoingFirst('');
      setMemo('');
      onCancel(); // フォームを閉じる
    }
  };

  const getReasonText = (reason: string, winRate?: number) => {
    switch (reason) {
      case 'unplayed':
        return '🆕 未対戦';
      case 'few_games':
        return '📊 対戦数少';
      case 'unbalanced_winrate':
        return `⚖️ 勝率偏り (${winRate?.toFixed(1)}%)`;
      default:
        return '';
    }
  };

  const getRatingRank = (rating: number): string => {
    if (rating >= 2000) return 'S';
    if (rating >= 1800) return 'A';
    if (rating >= 1600) return 'B';
    if (rating >= 1400) return 'C';
    return 'D';
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 2000) return '#ff1744';
    if (rating >= 1800) return '#ff9800';
    if (rating >= 1600) return '#ffc107';
    if (rating >= 1400) return '#4caf50';
    return '#9e9e9e';
  };

  const deck1 = getDeck(deck1Id);
  const deck2 = getDeck(deck2Id);
  const deck1Stats = deck1Id ? deckStatsMap[deck1Id] : null;
  const deck2Stats = deck2Id ? deckStatsMap[deck2Id] : null;
  const matchupWinRate1 = deck1Id && deck2Id ? getMatchupWinRate(deck1Id, deck2Id) : null;
  const matchupWinRate2 = deck1Id && deck2Id ? getMatchupWinRate(deck2Id, deck1Id) : null;

  return (
    <div style={{ 
      padding: '15px', 
      backgroundColor: '#1a1a2e', 
      border: '2px solid #16213e', 
      borderRadius: '12px',
      maxWidth: '100%',
      margin: '0 auto',
      color: '#ffffff',
      boxSizing: 'border-box'
    }}>
      <h2 style={{ 
        marginBottom: '20px', 
        textAlign: 'center',
        color: '#00d4ff',
        textShadow: '0 0 10px #00d4ff',
        fontSize: 'clamp(18px, 5vw, 24px)'
      }}>⚔️ BATTLE RECORD ⚔️</h2>
      
      {/* 連続入力モード切替 */}
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#0f3460', borderRadius: '6px', border: '1px solid #16213e' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={continuousMode}
            onChange={(e) => setContinuousMode(e.target.checked)}
          />
          <span style={{ fontWeight: 'bold', color: '#00d4ff', fontSize: 'clamp(12px, 3vw, 14px)' }}>連続入力モード</span>
          <span style={{ fontSize: 'clamp(10px, 2.5vw, 12px)', color: '#aaa' }}>
            （デッキ選択を保持）
          </span>
        </label>
      </div>

      {/* おすすめ対戦の表示 */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setShowSuggestions(!showSuggestions)}
          style={{ 
            width: '100%',
            padding: '12px', 
            backgroundColor: '#e94560', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer',
            fontSize: 'clamp(13px, 3.5vw, 16px)',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          💡 おすすめ対戦 ({suggestions.length}件)
          <span style={{ fontSize: 'clamp(12px, 3vw, 14px)' }}>{showSuggestions ? '▲' : '▼'}</span>
        </button>

        {showSuggestions && suggestions.length > 0 && (
          <div style={{ 
            marginTop: '10px', 
            border: '1px solid #e94560', 
            borderRadius: '6px',
            overflow: 'hidden',
            backgroundColor: '#0f3460'
          }}>
            {suggestions.map((suggestion, index) => (
              <div 
                key={`${suggestion.deck1Id}-${suggestion.deck2Id}`}
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  padding: '12px',
                  backgroundColor: index % 2 === 0 ? '#16213e' : '#0f3460',
                  cursor: 'pointer',
                  borderBottom: index < suggestions.length - 1 ? '1px solid #16213e' : 'none',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a4d6d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#16213e' : '#0f3460'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: 'clamp(11px, 3vw, 14px)' }}>
                    <strong>{suggestion.deck1Name}</strong> vs <strong>{suggestion.deck2Name}</strong>
                  </div>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: 'clamp(10px, 2.5vw, 12px)',
                    backgroundColor: 
                      suggestion.reason === 'unplayed' ? '#ff9800' :
                      suggestion.reason === 'few_games' ? '#2196f3' :
                      '#9c27b0',
                    color: 'white',
                    whiteSpace: 'nowrap'
                  }}>
                    {getReasonText(suggestion.reason, suggestion.winRate)}
                  </span>
                </div>
                {suggestion.totalGames > 0 && (
                  <div style={{ fontSize: 'clamp(10px, 2.5vw, 12px)', color: '#aaa', marginTop: '4px' }}>
                    対戦数: {suggestion.totalGames}回
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ランダム選択ボタン群 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
        gap: '10px', 
        marginBottom: '20px' 
      }}>
        <button 
          onClick={() => handleRandomSelect('all')}
          style={{ 
            padding: '10px', 
            backgroundColor: '#6f42c1', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: 'clamp(11px, 3vw, 13px)',
            whiteSpace: 'nowrap'
          }}
        >
          🎲 おすすめ
        </button>
        <button 
          onClick={() => handleRandomSelect('suggested')}
          style={{ 
            padding: '10px', 
            backgroundColor: '#20c997', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: 'clamp(11px, 3vw, 13px)',
            whiteSpace: 'nowrap'
          }}
        >
          ⭐ トップ3
        </button>
      </div>

      {/* スパロボ風デッキ選択エリア - 縦並びレイアウト */}
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: '15px', 
        marginBottom: '20px'
      }}>
        {/* デッキ1 */}
        <div style={{
          backgroundColor: '#0f3460',
          border: deck1Id ? '2px solid #00d4ff' : '2px solid #16213e',
          borderRadius: '8px',
          padding: '12px'
        }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#00d4ff', fontSize: 'clamp(12px, 3vw, 14px)' }}>
            DECK 1
          </label>
          <select 
            value={deck1Id} 
            onChange={(e) => setDeck1Id(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              marginBottom: '8px',
              fontSize: 'clamp(12px, 3vw, 14px)',
              backgroundColor: '#16213e',
              color: '#fff',
              border: '1px solid #00d4ff',
              borderRadius: '4px'
            }}
          >
            <option value="">選択してください</option>
            {decks.filter(d => d.id !== deck2Id).map(deck => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
          <button 
            onClick={() => handleRandomSelect('deck1')}
            style={{ 
              width: '100%',
              padding: '6px', 
              backgroundColor: '#533483', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontSize: 'clamp(11px, 2.5vw, 12px)',
              marginBottom: '10px'
            }}
          >
            🎲 ランダム
          </button>

          {/* デッキ1の情報表示 */}
          {deck1 && deck1Stats && (
            <div style={{ marginTop: '10px', fontSize: 'clamp(11px, 2.5vw, 13px)' }}>
              {/* デッキ画像 */}
              {deck1.imageUrl && (
                <div style={{ 
                  width: '100%', 
                  maxWidth: '200px',
                  height: '100px', 
                  backgroundColor: '#16213e',
                  borderRadius: '6px',
                  marginBottom: '10px',
                  overflow: 'hidden',
                  border: '1px solid #00d4ff',
                  margin: '0 auto 10px'
                }}>
                  <img 
                    src={deck1.imageUrl} 
                    alt={deck1.name}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover'
                    }}
                  />
                </div>
              )}
              
              {/* レート */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '6px',
                padding: '6px',
                backgroundColor: '#16213e',
                borderRadius: '4px'
              }}>
                <span style={{ color: '#aaa' }}>RATE:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ 
                    fontWeight: 'bold',
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    color: getRatingColor(deck1Stats.rating)
                  }}>
                    {getRatingRank(deck1Stats.rating)}
                  </span>
                  <span style={{ color: '#00d4ff', fontWeight: 'bold' }}>
                    {deck1Stats.rating.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* 全体勝率 */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '6px',
                padding: '6px',
                backgroundColor: '#16213e',
                borderRadius: '4px'
              }}>
                <span style={{ color: '#aaa' }}>全体勝率:</span>
                <span style={{ 
                  color: deck1Stats.winRate >= 50 ? '#4caf50' : '#f44336',
                  fontWeight: 'bold'
                }}>
                  {deck1Stats.winRate.toFixed(1)}%
                </span>
              </div>

              {/* 全体戦績 */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '6px',
                padding: '6px',
                backgroundColor: '#16213e',
                borderRadius: '4px'
              }}>
                <span style={{ color: '#aaa' }}>全体戦績:</span>
                <span style={{ color: '#fff' }}>
                  {deck1Stats.totalWins}勝 {deck1Stats.totalLosses}敗
                </span>
              </div>

              {/* 対面勝率 */}
              {deck2Id && matchupWinRate1 !== null && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '6px',
                  backgroundColor: '#1a4d6d',
                  borderRadius: '4px',
                  border: '1px solid #00d4ff'
                }}>
                  <span style={{ color: '#00d4ff', fontSize: 'clamp(10px, 2.5vw, 12px)' }}>vs {deck2?.name}:</span>
                  <span style={{ 
                    color: matchupWinRate1 >= 50 ? '#4caf50' : '#f44336',
                    fontWeight: 'bold'
                  }}>
                    {matchupWinRate1.toFixed(1)}%
                  </span>
                </div>
              )}

              {deck2Id && matchupWinRate1 === null && (
                <div style={{ 
                  padding: '6px',
                  backgroundColor: '#1a4d6d',
                  borderRadius: '4px',
                  border: '1px solid #ff9800',
                  textAlign: 'center',
                  color: '#ff9800',
                  fontSize: 'clamp(10px, 2.5vw, 12px)'
                }}>
                  未対戦
                </div>
              )}
            </div>
          )}
        </div>

        {/* VS表示 */}
        <div style={{ 
          fontSize: 'clamp(32px, 8vw, 48px)', 
          fontWeight: 'bold',
          color: '#e94560',
          textShadow: '0 0 20px #e94560',
          textAlign: 'center',
          padding: '10px 0'
        }}>
          VS
        </div>

        {/* デッキ2 */}
        <div style={{
          backgroundColor: '#0f3460',
          border: deck2Id ? '2px solid #e94560' : '2px solid #16213e',
          borderRadius: '8px',
          padding: '12px'
        }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#e94560', fontSize: 'clamp(12px, 3vw, 14px)' }}>
            DECK 2
          </label>
          <select 
            value={deck2Id} 
            onChange={(e) => setDeck2Id(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              marginBottom: '8px',
              fontSize: 'clamp(12px, 3vw, 14px)',
              backgroundColor: '#16213e',
              color: '#fff',
              border: '1px solid #e94560',
              borderRadius: '4px'
            }}
          >
            <option value="">選択してください</option>
            {decks.filter(d => d.id !== deck1Id).map(deck => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
          <button 
            onClick={() => handleRandomSelect('deck2')}
            style={{ 
              width: '100%',
              padding: '6px', 
              backgroundColor: '#533483', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontSize: 'clamp(11px, 2.5vw, 12px)',
              marginBottom: '10px'
            }}
          >
            🎲 ランダム
          </button>

          {/* デッキ2の情報表示 */}
          {deck2 && deck2Stats && (
            <div style={{ marginTop: '10px', fontSize: 'clamp(11px, 2.5vw, 13px)' }}>
              {/* デッキ画像 */}
              {deck2.imageUrl && (
                <div style={{ 
                  width: '100%', 
                  maxWidth: '200px',
                  height: '100px', 
                  backgroundColor: '#16213e',
                  borderRadius: '6px',
                  marginBottom: '10px',
                  overflow: 'hidden',
                  border: '1px solid #e94560',
                  margin: '0 auto 10px'
                }}>
                  <img 
                    src={deck2.imageUrl} 
                    alt={deck2.name}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover'
                    }}
                  />
                </div>
              )}
              
              {/* レート */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '6px',
                padding: '6px',
                backgroundColor: '#16213e',
                borderRadius: '4px'
              }}>
                <span style={{ color: '#aaa' }}>RATE:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ 
                    fontWeight: 'bold',
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    color: getRatingColor(deck2Stats.rating)
                  }}>
                    {getRatingRank(deck2Stats.rating)}
                  </span>
                  <span style={{ color: '#e94560', fontWeight: 'bold' }}>
                    {deck2Stats.rating.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* 全体勝率 */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '6px',
                padding: '6px',
                backgroundColor: '#16213e',
                borderRadius: '4px'
              }}>
                <span style={{ color: '#aaa' }}>全体勝率:</span>
                <span style={{ 
                  color: deck2Stats.winRate >= 50 ? '#4caf50' : '#f44336',
                  fontWeight: 'bold'
                }}>
                  {deck2Stats.winRate.toFixed(1)}%
                </span>
              </div>

              {/* 全体戦績 */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '6px',
                padding: '6px',
                backgroundColor: '#16213e',
                borderRadius: '4px'
              }}>
                <span style={{ color: '#aaa' }}>全体戦績:</span>
                <span style={{ color: '#fff' }}>
                  {deck2Stats.totalWins}勝 {deck2Stats.totalLosses}敗
                </span>
              </div>

              {/* 対面勝率 */}
              {deck1Id && matchupWinRate2 !== null && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '6px',
                  backgroundColor: '#4d1a3a',
                  borderRadius: '4px',
                  border: '1px solid #e94560'
                }}>
                  <span style={{ color: '#e94560', fontSize: 'clamp(10px, 2.5vw, 12px)' }}>vs {deck1?.name}:</span>
                  <span style={{ 
                    color: matchupWinRate2 >= 50 ? '#4caf50' : '#f44336',
                    fontWeight: 'bold'
                  }}>
                    {matchupWinRate2.toFixed(1)}%
                  </span>
                </div>
              )}

              {deck1Id && matchupWinRate2 === null && (
                <div style={{ 
                  padding: '6px',
                  backgroundColor: '#4d1a3a',
                  borderRadius: '4px',
                  border: '1px solid #ff9800',
                  textAlign: 'center',
                  color: '#ff9800',
                  fontSize: 'clamp(10px, 2.5vw, 12px)'
                }}>
                  未対戦
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 勝敗・先攻選択エリア */}
      {deck1Id && deck2Id && (
        <div style={{ 
          backgroundColor: '#0f3460', 
          padding: '15px', 
          borderRadius: '8px',
          border: '2px solid #16213e',
          marginBottom: '20px'
        }}>
          {/* 勝者選択 */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#00d4ff', fontSize: 'clamp(13px, 3.5vw, 15px)' }}>
              🏆 WINNER
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                border: `3px solid ${winner === 'deck1' ? '#00d4ff' : '#16213e'}`,
                borderRadius: '8px',
                backgroundColor: winner === 'deck1' ? '#1a4d6d' : '#16213e',
                cursor: 'pointer',
                flex: '1 1 120px',
                fontWeight: 'bold',
                fontSize: 'clamp(12px, 3vw, 14px)'
              }}>
                <input
                  type="radio"
                  name="winner"
                  checked={winner === 'deck1'}
                  onChange={() => setWinner('deck1')}
                  style={{ minWidth: '16px' }}
                />
                <span style={{ wordBreak: 'break-word' }}>{getDeckName(deck1Id)}</span>
              </label>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                border: `3px solid ${winner === 'deck2' ? '#e94560' : '#16213e'}`,
                borderRadius: '8px',
                backgroundColor: winner === 'deck2' ? '#4d1a3a' : '#16213e',
                cursor: 'pointer',
                flex: '1 1 120px',
                fontWeight: 'bold',
                fontSize: 'clamp(12px, 3vw, 14px)'
              }}>
                <input
                  type="radio"
                  name="winner"
                  checked={winner === 'deck2'}
                  onChange={() => setWinner('deck2')}
                  style={{ minWidth: '16px' }}
                />
                <span style={{ wordBreak: 'break-word' }}>{getDeckName(deck2Id)}</span>
              </label>
            </div>
          </div>

          {/* 先攻選択 */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#ffc107', fontSize: 'clamp(13px, 3.5vw, 15px)' }}>
              ⚡ 先攻
              {goingFirst && (
                <span style={{ 
                  marginLeft: '8px', 
                  fontSize: 'clamp(10px, 2.5vw, 12px)', 
                  color: '#aaa',
                  fontWeight: 'normal'
                }}>
                  （自動選択）
                </span>
              )}
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                border: `3px solid ${goingFirst === 'deck1' ? '#ffc107' : '#16213e'}`,
                borderRadius: '8px',
                backgroundColor: goingFirst === 'deck1' ? '#4d3b00' : '#16213e',
                cursor: 'pointer',
                flex: '1 1 120px',
                fontWeight: 'bold',
                fontSize: 'clamp(12px, 3vw, 14px)'
              }}>
                <input
                  type="radio"
                  name="goingFirst"
                  checked={goingFirst === 'deck1'}
                  onChange={() => setGoingFirst('deck1')}
                  style={{ minWidth: '16px' }}
                />
                <span style={{ wordBreak: 'break-word' }}>{getDeckName(deck1Id)}</span>
              </label>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                border: `3px solid ${goingFirst === 'deck2' ? '#ffc107' : '#16213e'}`,
                borderRadius: '8px',
                backgroundColor: goingFirst === 'deck2' ? '#4d3b00' : '#16213e',
                cursor: 'pointer',
                flex: '1 1 120px',
                fontWeight: 'bold',
                fontSize: 'clamp(12px, 3vw, 14px)'
              }}>
                <input
                  type="radio"
                  name="goingFirst"
                  checked={goingFirst === 'deck2'}
                  onChange={() => setGoingFirst('deck2')}
                  style={{ minWidth: '16px' }}
                />
                <span style={{ wordBreak: 'break-word' }}>{getDeckName(deck2Id)}</span>
              </label>
            </div>
          </div>

          {/* 結果プレビュー */}
          {winner && goingFirst && (
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#1a4d6d', 
              borderRadius: '8px',
              textAlign: 'center',
              border: '2px solid #00d4ff'
            }}>
              <div style={{ fontSize: 'clamp(15px, 4vw, 18px)', fontWeight: 'bold', color: '#00d4ff', marginBottom: '8px' }}>
                ⚔️ BATTLE RESULT ⚔️
              </div>
              <div style={{ fontSize: 'clamp(13px, 3.5vw, 16px)', marginBottom: '5px' }}>
                <span style={{ color: '#4caf50' }}>🏆 WINNER:</span>{' '}
                <strong style={{ color: '#fff' }}>
                  {getDeckName(winner === 'deck1' ? deck1Id : deck2Id)}
                </strong>
              </div>
              <div style={{ fontSize: 'clamp(12px, 3vw, 14px)', color: '#aaa' }}>
                <span style={{ color: '#ffc107' }}>⚡ 先攻:</span>{' '}
                {getDeckName(goingFirst === 'deck1' ? deck1Id : deck2Id)}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* メモ入力 */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#00d4ff', fontSize: 'clamp(12px, 3vw, 14px)' }}>
          📝 MEMO (省略可):
        </label>
        <textarea
          value={memo}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMemo(e.target.value)}
          placeholder="対戦の感想、特記事項など"
          style={{ 
            width: '100%', 
            padding: '10px', 
            height: '70px', 
            fontSize: 'clamp(12px, 3vw, 14px)', 
            backgroundColor: '#16213e',
            color: '#fff',
            border: '1px solid #0f3460', 
            borderRadius: '6px', 
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
      </div>
      
      {/* アクションボタン */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={handleSubmit} 
          disabled={!deck1Id || !deck2Id || !winner || !goingFirst}
          style={{ 
            padding: '15px 20px', 
            backgroundColor: (!deck1Id || !deck2Id || !winner || !goingFirst) ? '#6c757d' : '#4caf50', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: (!deck1Id || !deck2Id || !winner || !goingFirst) ? 'not-allowed' : 'pointer',
            flex: '1 1 150px',
            fontSize: 'clamp(13px, 3.5vw, 16px)',
            fontWeight: 'bold',
            boxShadow: (!deck1Id || !deck2Id || !winner || !goingFirst) ? 'none' : '0 0 15px #4caf50'
          }}
        >
          {continuousMode ? '✅ 登録して次へ' : '✅ 登録'}
        </button>
        <button 
          onClick={onCancel}
          style={{ 
            padding: '15px 20px', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer',
            fontSize: 'clamp(13px, 3.5vw, 16px)',
            fontWeight: 'bold',
            flex: '1 1 120px'
          }}
        >
          {continuousMode ? '🚪 完了' : '❌ キャンセル'}
        </button>
      </div>

      {continuousMode && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: '#4d3b00', 
          borderRadius: '6px', 
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          color: '#ffc107',
          border: '1px solid #ffc107'
        }}>
          💡 連続入力モード：登録後もデッキ選択を保持し、勝敗・先攻のみリセットされます
        </div>
      )}
    </div>
  );
};

export default BattleForm;
