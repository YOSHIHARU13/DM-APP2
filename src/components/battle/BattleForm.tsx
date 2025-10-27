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

const BattleForm: React.FC<BattleFormProps> = ({ projectId, decks, battles, onBattleAdd, onCancel }) => {
  const [deck1Id, setDeck1Id] = useState<string>('');
  const [deck2Id, setDeck2Id] = useState<string>('');
  const [winner, setWinner] = useState<'deck1' | 'deck2' | ''>('');
  const [goingFirst, setGoingFirst] = useState<'deck1' | 'deck2' | ''>('');
  const [memo, setMemo] = useState<string>('');
  const [continuousMode, setContinuousMode] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // 対戦データの分析
  const matchupAnalysis = useMemo(() => {
    const analysis: Record<string, Record<string, { 
      games: number; 
      wins: number; 
      losses: number;
      goingFirstCount: number; // 先行回数を追加
    }>> = {};
    
    // 初期化
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

    // 対戦データを集計
    if (battles) {
      battles.forEach(battle => {
        // deck1の視点でのデータ
        if (analysis[battle.deck1Id] && analysis[battle.deck1Id][battle.deck2Id]) {
          analysis[battle.deck1Id][battle.deck2Id].games += 1;
          analysis[battle.deck1Id][battle.deck2Id].wins += battle.deck1Wins || 0;
          analysis[battle.deck1Id][battle.deck2Id].losses += battle.deck2Wins || 0;
          if (battle.deck1GoingFirst === 1) {
            analysis[battle.deck1Id][battle.deck2Id].goingFirstCount += 1;
          }
        }
        
        // deck2の視点でのデータ
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

  // おすすめ対戦の生成（修正版）
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
        const data2 = matchupAnalysis[deck2.id]?.[deck1.id];
        
        // 絶対値の対戦数（各デッキ視点の対戦数は同じはず）
        const totalGames = data1?.games || 0;

        let reason: 'unplayed' | 'few_games' | 'unbalanced_winrate';
        let priority = 0;
        let winRate: number | undefined;

        // 1. 未対戦（最優先）
        if (totalGames === 0) {
          reason = 'unplayed';
          priority = 1000;
        }
        // 2. 5戦未満（次に優先）
        else if (totalGames < 5) {
          reason = 'few_games';
          priority = 500 + (5 - totalGames) * 50; // 少ないほど優先度高
        }
        // 3. 勝率が50%から離れている
        else {
          const deck1Wins = data1?.wins || 0;
          const deck1Losses = data1?.losses || 0;
          const totalDecisions = deck1Wins + deck1Losses;
          
          if (totalDecisions > 0) {
            winRate = (deck1Wins / totalDecisions) * 100;
            const deviation = Math.abs(winRate - 50);
            
            reason = 'unbalanced_winrate';
            priority = deviation * 10; // 50%から離れているほど優先度高
          } else {
            continue; // 勝敗データがない場合はスキップ
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

  // デッキ選択時に先行を自動設定（新機能）
  useEffect(() => {
    if (!deck1Id || !deck2Id) return;

    const data1 = matchupAnalysis[deck1Id]?.[deck2Id];
    const data2 = matchupAnalysis[deck2Id]?.[deck1Id];

    if (!data1 || !data2) return;

    const deck1GoingFirstCount = data1.goingFirstCount || 0;
    const deck2GoingFirstCount = data2.goingFirstCount || 0;

    // 先行回数が少ない方を先行に自動設定
    if (deck1GoingFirstCount < deck2GoingFirstCount) {
      setGoingFirst('deck1');
    } else if (deck2GoingFirstCount < deck1GoingFirstCount) {
      setGoingFirst('deck2');
    } else {
      // 同じ場合はリセット（手動選択に任せる）
      setGoingFirst('');
    }
  }, [deck1Id, deck2Id, matchupAnalysis]);

  // デッキ選択時の情報表示
  const getMatchupInfo = (deckId1: string, deckId2: string) => {
    if (!deckId1 || !deckId2) return null;
    
    const data1 = matchupAnalysis[deckId1]?.[deckId2];
    const totalGames = data1?.games || 0;
    
    // 先行情報も追加
    const deck1GoingFirstCount = data1?.goingFirstCount || 0;
    const data2 = matchupAnalysis[deckId2]?.[deckId1];
    const deck2GoingFirstCount = data2?.goingFirstCount || 0;
    
    if (totalGames === 0) {
      return { 
        type: 'unplayed', 
        message: '未対戦の組み合わせです！',
        goingFirstInfo: null
      };
    } else {
      const goingFirstInfo = `先行回数: ${getDeckName(deckId1)}=${deck1GoingFirstCount}回 / ${getDeckName(deckId2)}=${deck2GoingFirstCount}回`;
      
      if (totalGames < 3) {
        return { 
          type: 'few', 
          message: `対戦回数: ${totalGames}回（サンプル不足）`,
          goingFirstInfo
        };
      } else if (totalGames < 7) {
        return { 
          type: 'some', 
          message: `対戦回数: ${totalGames}回`,
          goingFirstInfo
        };
      } else {
        return { 
          type: 'many', 
          message: `対戦回数: ${totalGames}回（十分なデータ）`,
          goingFirstInfo
        };
      }
    }
  };

  const matchupInfo = getMatchupInfo(deck1Id, deck2Id);

  const getDeckName = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    return deck ? deck.name : '不明';
  };

  const handleSuggestionClick = (suggestion: MatchupSuggestion) => {
    setDeck1Id(suggestion.deck1Id);
    setDeck2Id(suggestion.deck2Id);
    setShowSuggestions(false);
  };

  const handleRandomSelect = (type: 'all' | 'deck1' | 'deck2' | 'suggested') => {
    if (type === 'suggested' && suggestions.length > 0) {
      // おすすめからランダム選択
      const randomSuggestion = suggestions[Math.floor(Math.random() * Math.min(3, suggestions.length))];
      setDeck1Id(randomSuggestion.deck1Id);
      setDeck2Id(randomSuggestion.deck2Id);
      return;
    }

    if (type === 'all') {
      // 優先度の高いペアを選出
      if (suggestions.length > 0) {
        const topSuggestions = suggestions.slice(0, Math.max(1, Math.ceil(suggestions.length * 0.3)));
        const selectedPair = topSuggestions[Math.floor(Math.random() * topSuggestions.length)];
        setDeck1Id(selectedPair.deck1Id);
        setDeck2Id(selectedPair.deck2Id);
      } else {
        // フォールバック: 完全ランダム
        const availableDecks = decks.filter(d => d.id !== deck2Id);
        if (availableDecks.length > 0) {
          const randomDeck = availableDecks[Math.floor(Math.random() * availableDecks.length)];
          setDeck1Id(randomDeck.id);
        }
      }
      return;
    }

    // 個別のデッキ選択（deck1またはdeck2）
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
      // 連続モード: 勝敗と先攻のみリセット
      setWinner('');
      setGoingFirst('');
      setMemo('');
    } else {
      // 通常モード: 全てリセット
      setDeck1Id('');
      setDeck2Id('');
      setWinner('');
      setGoingFirst('');
      setMemo('');
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

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: 'white', 
      border: '1px solid #ddd', 
      borderRadius: '8px',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h2 style={{ marginBottom: '20px' }}>対戦結果を入力</h2>
      
      {/* 連続入力モード切替 */}
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={continuousMode}
            onChange={(e) => setContinuousMode(e.target.checked)}
          />
          <span style={{ fontWeight: 'bold' }}>連続入力モード</span>
          <span style={{ fontSize: '12px', color: '#666' }}>
            （デッキ選択を保持して連続入力）
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
            backgroundColor: '#17a2b8', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          💡 おすすめ対戦 ({suggestions.length}件)
          <span style={{ fontSize: '14px' }}>{showSuggestions ? '▲' : '▼'}</span>
        </button>

        {showSuggestions && suggestions.length > 0 && (
          <div style={{ 
            marginTop: '10px', 
            border: '1px solid #17a2b8', 
            borderRadius: '6px',
            overflow: 'hidden'
          }}>
            {suggestions.map((suggestion, index) => (
              <div 
                key={`${suggestion.deck1Id}-${suggestion.deck2Id}`}
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  padding: '12px',
                  backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                  cursor: 'pointer',
                  borderBottom: index < suggestions.length - 1 ? '1px solid #dee2e6' : 'none',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : 'white'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{suggestion.deck1Name}</strong> vs <strong>{suggestion.deck2Name}</strong>
                  </div>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    backgroundColor: 
                      suggestion.reason === 'unplayed' ? '#ff9800' :
                      suggestion.reason === 'few_games' ? '#2196f3' :
                      '#9c27b0',
                    color: 'white'
                  }}>
                    {getReasonText(suggestion.reason, suggestion.winRate)}
                  </span>
                </div>
                {suggestion.totalGames > 0 && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
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
        gridTemplateColumns: '1fr 1fr', 
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
            fontSize: '14px'
          }}
        >
          🎲 おすすめからランダム
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
            fontSize: '14px'
          }}
        >
          ⭐ トップ3からランダム
        </button>
      </div>

      {/* デッキ選択 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            デッキ1:
          </label>
          <select 
            value={deck1Id} 
            onChange={(e) => setDeck1Id(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              marginBottom: '8px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            <option value="">選択してください</option>
            {decks.filter(d => d.id !== deck2Id).map(deck => (
              <option key={deck.id} value={deck.id}>
                {deck.name} ({deck.colors.join(', ')})
              </option>
            ))}
          </select>
          <button 
            onClick={() => handleRandomSelect('deck1')}
            style={{ 
              width: '100%',
              padding: '4px 8px', 
              backgroundColor: '#17a2b8', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🎲 ランダム選択
          </button>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            デッキ2:
          </label>
          <select 
            value={deck2Id} 
            onChange={(e) => setDeck2Id(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              marginBottom: '8px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            <option value="">選択してください</option>
            {decks.filter(d => d.id !== deck1Id).map(deck => (
              <option key={deck.id} value={deck.id}>
                {deck.name} ({deck.colors.join(', ')})
              </option>
            ))}
          </select>
          <button 
            onClick={() => handleRandomSelect('deck2')}
            style={{ 
              width: '100%',
              padding: '4px 8px', 
              backgroundColor: '#17a2b8', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🎲 ランダム選択
          </button>
        </div>
      </div>

      {/* 対戦情報の表示（先行情報も追加） */}
      {matchupInfo && (
        <div style={{
          padding: '10px',
          marginBottom: '15px',
          borderRadius: '6px',
          backgroundColor: 
            matchupInfo.type === 'unplayed' ? '#fff3e0' :
            matchupInfo.type === 'few' ? '#e3f2fd' :
            matchupInfo.type === 'some' ? '#f1f8e9' :
            '#e8f5e9',
          border: `1px solid ${
            matchupInfo.type === 'unplayed' ? '#ffb74d' :
            matchupInfo.type === 'few' ? '#64b5f6' :
            matchupInfo.type === 'some' ? '#aed581' :
            '#81c784'
          }`,
          fontSize: '14px',
          textAlign: 'center'
        }}>
          {matchupInfo.type === 'unplayed' && '🆕 '}
          {matchupInfo.type === 'few' && '📊 '}
          {matchupInfo.type === 'many' && '✅ '}
          {matchupInfo.message}
          {matchupInfo.goingFirstInfo && (
            <div style={{ fontSize: '12px', marginTop: '4px', color: '#666' }}>
              {matchupInfo.goingFirstInfo}
            </div>
          )}
        </div>
      )}

      {deck1Id && deck2Id && (
        <>
          {/* 勝者選択 */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              勝者:
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '10px 15px',
                border: `2px solid ${winner === 'deck1' ? '#28a745' : '#ddd'}`,
                borderRadius: '8px',
                backgroundColor: winner === 'deck1' ? '#d4edda' : 'white',
                cursor: 'pointer',
                flex: 1,
                justifyContent: 'center'
              }}>
                <input
                  type="radio"
                  name="winner"
                  checked={winner === 'deck1'}
                  onChange={() => setWinner('deck1')}
                />
                <strong>{getDeckName(deck1Id)}</strong>
              </label>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '10px 15px',
                border: `2px solid ${winner === 'deck2' ? '#28a745' : '#ddd'}`,
                borderRadius: '8px',
                backgroundColor: winner === 'deck2' ? '#d4edda' : 'white',
                cursor: 'pointer',
                flex: 1,
                justifyContent: 'center'
              }}>
                <input
                  type="radio"
                  name="winner"
                  checked={winner === 'deck2'}
                  onChange={() => setWinner('deck2')}
                />
                <strong>{getDeckName(deck2Id)}</strong>
              </label>
            </div>
          </div>

          {/* 先攻選択（自動チェック対応） */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              先攻:
              {goingFirst && (
                <span style={{ 
                  marginLeft: '8px', 
                  fontSize: '12px', 
                  color: '#17a2b8',
                  fontWeight: 'normal'
                }}>
                  （自動選択されました）
                </span>
              )}
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '10px 15px',
                border: `2px solid ${goingFirst === 'deck1' ? '#007bff' : '#ddd'}`,
                borderRadius: '8px',
                backgroundColor: goingFirst === 'deck1' ? '#cce7ff' : 'white',
                cursor: 'pointer',
                flex: 1,
                justifyContent: 'center'
              }}>
                <input
                  type="radio"
                  name="goingFirst"
                  checked={goingFirst === 'deck1'}
                  onChange={() => setGoingFirst('deck1')}
                />
                {getDeckName(deck1Id)}
              </label>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '10px 15px',
                border: `2px solid ${goingFirst === 'deck2' ? '#007bff' : '#ddd'}`,
                borderRadius: '8px',
                backgroundColor: goingFirst === 'deck2' ? '#cce7ff' : 'white',
                cursor: 'pointer',
                flex: 1,
                justifyContent: 'center'
              }}>
                <input
                  type="radio"
                  name="goingFirst"
                  checked={goingFirst === 'deck2'}
                  onChange={() => setGoingFirst('deck2')}
                />
                {getDeckName(deck2Id)}
              </label>
            </div>
          </div>

          {/* 結果プレビュー */}
          {winner && goingFirst && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '6px', 
              marginBottom: '15px',
              textAlign: 'center',
              border: '1px solid #90caf9'
            }}>
              <strong>
                🏆 {getDeckName(winner === 'deck1' ? deck1Id : deck2Id)} の勝利
              </strong>
              <div style={{ fontSize: '14px', marginTop: '4px', color: '#555' }}>
                先攻: {getDeckName(goingFirst === 'deck1' ? deck1Id : deck2Id)}
              </div>
            </div>
          )}
        </>
      )}
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          メモ (省略可):
        </label>
        <textarea
          value={memo}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMemo(e.target.value)}
          placeholder="対戦の感想、特記事項など"
          style={{ 
            width: '100%', 
            padding: '8px', 
            height: '60px', 
            fontSize: '14px', 
            border: '1px solid #ddd', 
            borderRadius: '4px', 
            resize: 'vertical' 
          }}
        />
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={handleSubmit} 
          disabled={!deck1Id || !deck2Id || !winner || !goingFirst}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: (!deck1Id || !deck2Id || !winner || !goingFirst) ? '#6c757d' : '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: (!deck1Id || !deck2Id || !winner || !goingFirst) ? 'not-allowed' : 'pointer',
            flex: 1
          }}
        >
          {continuousMode ? '登録して次へ' : '登録'}
        </button>
        <button 
          onClick={onCancel}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          キャンセル
        </button>
      </div>

      {continuousMode && (
        <div style={{ 
          marginTop: '10px', 
          padding: '8px', 
          backgroundColor: '#fff3cd', 
          borderRadius: '4px', 
          fontSize: '14px',
          color: '#856404'
        }}>
          💡 連続入力モード：登録後もデッキ選択を保持し、勝敗・先攻のみリセットされます
        </div>
      )}
    </div>
  );
};

export default BattleForm;
