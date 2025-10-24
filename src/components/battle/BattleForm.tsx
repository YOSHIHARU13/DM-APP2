import React, { useState, useMemo } from 'react';
import { Battle, BattleFormProps } from '../../types';

interface MatchupSuggestion {
  deck1Id: string;
  deck2Id: string;
  deck1Name: string;
  deck2Name: string;
  totalGames: number;
  reason: 'unplayed' | 'few_games' | 'losing_streak';
  priority: number;
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
    const analysis: Record<string, Record<string, { games: number; wins: number; losses: number }>> = {};
    
    // 初期化
    decks.forEach(deck => {
      analysis[deck.id] = {};
      decks.forEach(opponent => {
        if (deck.id !== opponent.id) {
          analysis[deck.id][opponent.id] = { games: 0, wins: 0, losses: 0 };
        }
      });
    });

    // 対戦データを集計
    if (battles) {
      battles.forEach(battle => {
        if (analysis[battle.deck1Id] && analysis[battle.deck1Id][battle.deck2Id]) {
          analysis[battle.deck1Id][battle.deck2Id].games += battle.deck1Wins + battle.deck2Wins;
          analysis[battle.deck1Id][battle.deck2Id].wins += battle.deck1Wins;
          analysis[battle.deck1Id][battle.deck2Id].losses += battle.deck2Wins;
        }
        if (analysis[battle.deck2Id] && analysis[battle.deck2Id][battle.deck1Id]) {
          analysis[battle.deck2Id][battle.deck1Id].games += battle.deck1Wins + battle.deck2Wins;
          analysis[battle.deck2Id][battle.deck1Id].wins += battle.deck2Wins;
          analysis[battle.deck2Id][battle.deck1Id].losses += battle.deck1Wins;
        }
      });
    }

    return analysis;
  }, [decks, battles]);

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
        const data2 = matchupAnalysis[deck2.id]?.[deck1.id];
        const totalGames = (data1?.games || 0) + (data2?.games || 0);

        let reason: 'unplayed' | 'few_games' | 'losing_streak' | null = null;
        let priority = 0;

        // 未対戦（最優先）
        if (totalGames === 0) {
          reason = 'unplayed';
          priority = 100;
        }
        // 対戦回数が少ない（5戦未満）
        else if (totalGames < 5) {
          reason = 'few_games';
          priority = 50 - totalGames * 5; // 少ないほど優先度高
        }
        // どちらかが3連敗以上している
        else {
          const recentBattles = battles
            ?.filter(b => 
              (b.deck1Id === deck1.id && b.deck2Id === deck2.id) ||
              (b.deck1Id === deck2.id && b.deck2Id === deck1.id)
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5) || [];

          // deck1の視点で連敗チェック
          let deck1LosingStreak = 0;
          for (const battle of recentBattles) {
            if (battle.deck1Id === deck1.id && battle.deck1Wins === 0) deck1LosingStreak++;
            else if (battle.deck2Id === deck1.id && battle.deck2Wins === 0) deck1LosingStreak++;
            else break;
          }

          // deck2の視点で連敗チェック
          let deck2LosingStreak = 0;
          for (const battle of recentBattles) {
            if (battle.deck1Id === deck2.id && battle.deck1Wins === 0) deck2LosingStreak++;
            else if (battle.deck2Id === deck2.id && battle.deck2Wins === 0) deck2LosingStreak++;
            else break;
          }

          if (deck1LosingStreak >= 3 || deck2LosingStreak >= 3) {
            reason = 'losing_streak';
            priority = 30 + Math.max(deck1LosingStreak, deck2LosingStreak);
          }
        }

        if (reason) {
          suggestions.push({
            deck1Id: deck1.id,
            deck2Id: deck2.id,
            deck1Name: deck1.name,
            deck2Name: deck2.name,
            totalGames,
            reason,
            priority
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 5);
  }, [decks, battles, matchupAnalysis]);

  // デッキ選択時の情報表示
  const getMatchupInfo = (deckId1: string, deckId2: string) => {
    if (!deckId1 || !deckId2) return null;
    
    const data1 = matchupAnalysis[deckId1]?.[deckId2];
    const data2 = matchupAnalysis[deckId2]?.[deckId1];
    const totalGames = (data1?.games || 0) + (data2?.games || 0);
    
    if (totalGames === 0) {
      return { type: 'unplayed', message: '未対戦の組み合わせです！' };
    } else if (totalGames < 3) {
      return { type: 'few', message: `対戦回数: ${totalGames}回（サンプル不足）` };
    } else if (totalGames < 7) {
      return { type: 'some', message: `対戦回数: ${totalGames}回` };
    } else {
      return { type: 'many', message: `対戦回数: ${totalGames}回（十分なデータ）` };
    }
  };

  const matchupInfo = getMatchupInfo(deck1Id, deck2Id);

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
      // 対戦数が少ないペアを優先的に選出
      const pairCandidates: Array<{ deck1: any; deck2: any; totalGames: number }> = [];
      
      for (let i = 0; i < decks.length; i++) {
        for (let j = i + 1; j < decks.length; j++) {
          const deck1 = decks[i];
          const deck2 = decks[j];
          
          const data1 = matchupAnalysis[deck1.id]?.[deck2.id];
          const data2 = matchupAnalysis[deck2.id]?.[deck1.id];
          const totalGames = (data1?.games || 0) + (data2?.games || 0);
          
          pairCandidates.push({
            deck1,
            deck2,
            totalGames
          });
        }
      }
      
      // 対戦数が少ない順にソート
      pairCandidates.sort((a, b) => a.totalGames - b.totalGames);
      
      // 上位20%からランダムに選択（完全に最小だけだと毎回同じになるため）
      const topCandidates = pairCandidates.slice(0, Math.max(1, Math.ceil(pairCandidates.length * 0.2)));
      const selectedPair = topCandidates[Math.floor(Math.random() * topCandidates.length)];
      
      if (selectedPair) {
        setDeck1Id(selectedPair.deck1.id);
        setDeck2Id(selectedPair.deck2.id);
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

    const newBattle: Battle = {
      id: `battle_${Date.now()}_${Math.random()}`,
      deck1Id,
      deck2Id,
      deck1Wins: winner === 'deck1' ? 1 : 0,
      deck2Wins: winner === 'deck2' ? 1 : 0,
      deck1GoingFirst: goingFirst === 'deck1' ? 1 : 0,
      deck2GoingFirst: goingFirst === 'deck2' ? 1 : 0,
      memo: memo.trim(),
      date: new Date(),
      projectId
    };

    onBattleAdd(newBattle);

    // 連続入力モードの場合、フォームをリセット（デッキ選択は保持）
    if (continuousMode) {
      setWinner('');
      setGoingFirst('');
      setMemo('');
    } else {
      // 通常モードの場合、すべてリセット
      setDeck1Id('');
      setDeck2Id('');
      setWinner('');
      setGoingFirst('');
      setMemo('');
    }
  };

  const getDeckName = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    return deck ? deck.name : '';
  };

  const swapDecks = () => {
    const temp = deck1Id;
    setDeck1Id(deck2Id);
    setDeck2Id(temp);
    
    // 勝者と先攻も入れ替え
    if (winner === 'deck1') setWinner('deck2');
    else if (winner === 'deck2') setWinner('deck1');
    
    if (goingFirst === 'deck1') setGoingFirst('deck2');
    else if (goingFirst === 'deck2') setGoingFirst('deck1');
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'unplayed': return '未対戦';
      case 'few_games': return '対戦少';
      case 'losing_streak': return '連敗中';
      default: return '';
    }
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'unplayed': return '#ff9800';
      case 'few_games': return '#2196f3';
      case 'losing_streak': return '#f44336';
      default: return '#666';
    }
  };

  return (
    <div style={{ 
      border: '1px solid #ccc', 
      padding: '20px', 
      margin: '10px 0', 
      borderRadius: '8px', 
      backgroundColor: '#f9f9f9' 
    }}>
      <h3>対戦結果を登録（1戦ずつ）</h3>
      
      {/* おすすめ対戦表示 */}
      {suggestions.length > 0 && (
        <div style={{ 
          marginBottom: '15px',
          padding: '15px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          border: '1px solid #90caf9'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <h4 style={{ margin: 0, color: '#1976d2' }}>
              💡 おすすめ対戦
            </h4>
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              style={{
                padding: '4px 12px',
                backgroundColor: 'white',
                border: '1px solid #90caf9',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {showSuggestions ? '閉じる' : '表示'}
            </button>
          </div>
          
          {showSuggestions && (
            <div style={{ display: 'grid', gap: '8px' }}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.deck1Id}-${suggestion.deck2Id}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  style={{
                    padding: '12px',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: '2px solid transparent',
                    transition: 'all 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#1976d2';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 'bold' }}>
                      {suggestion.deck1Name}
                    </span>
                    <span style={{ margin: '0 8px', color: '#666' }}>vs</span>
                    <span style={{ fontWeight: 'bold' }}>
                      {suggestion.deck2Name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      backgroundColor: getReasonColor(suggestion.reason),
                      color: 'white'
                    }}>
                      {getReasonLabel(suggestion.reason)}
                    </span>
                    {suggestion.totalGames > 0 && (
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {suggestion.totalGames}戦
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button 
          onClick={() => handleRandomSelect('suggested')}
          disabled={suggestions.length === 0}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: suggestions.length > 0 ? '#2196f3' : '#ccc',
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: suggestions.length > 0 ? 'pointer' : 'not-allowed'
          }}
        >
          ⭐ おすすめから選択
        </button>

        <button 
          onClick={() => handleRandomSelect('all')}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#ffc107', 
            color: '#212529', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer'
          }}
        >
          🎲 対戦数が少ないペアを選択
        </button>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <input
            type="checkbox"
            checked={continuousMode}
            onChange={(e) => setContinuousMode(e.target.checked)}
          />
          連続入力モード
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '15px', marginBottom: '20px', alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            デッキ1:
          </label>
          {deck1Id && decks.find(d => d.id === deck1Id)?.imageUrl && (
            <div style={{ marginBottom: '8px' }}>
              <img 
                src={decks.find(d => d.id === deck1Id)?.imageUrl} 
                alt="デッキ1"
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '6px',
                  objectFit: 'cover',
                  border: '2px solid #007bff'
                }}
              />
            </div>
          )}
          {deck1Id && decks.find(d => d.id === deck1Id)?.imageUrl && (
            <div style={{ marginBottom: '8px', textAlign: 'center' }}>
              <img 
                src={decks.find(d => d.id === deck1Id)?.imageUrl} 
                alt={decks.find(d => d.id === deck1Id)?.name}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '2px solid #007bff'
                }}
              />
            </div>
          )}
          <select
            value={deck1Id}
            onChange={(e) => setDeck1Id(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              fontSize: '14px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              marginBottom: '8px'
            }}
          >
            <option value="">デッキを選択</option>
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

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={swapDecks}
            disabled={!deck1Id || !deck2Id}
            style={{
              padding: '8px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: deck1Id && deck2Id ? 'pointer' : 'not-allowed',
              opacity: deck1Id && deck2Id ? 1 : 0.5
            }}
          >
            ⇄
          </button>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>入れ替え</div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            デッキ2:
          </label>
          {deck2Id && decks.find(d => d.id === deck2Id)?.imageUrl && (
            <div style={{ marginBottom: '8px' }}>
              <img 
                src={decks.find(d => d.id === deck2Id)?.imageUrl} 
                alt="デッキ2"
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '6px',
                  objectFit: 'cover',
                  border: '2px solid #007bff'
                }}
              />
            </div>
          )}
          {deck2Id && decks.find(d => d.id === deck2Id)?.imageUrl && (
            <div style={{ marginBottom: '8px', textAlign: 'center' }}>
              <img 
                src={decks.find(d => d.id === deck2Id)?.imageUrl} 
                alt={decks.find(d => d.id === deck2Id)?.name}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '2px solid #007bff'
                }}
              />
            </div>
          )}
          <select
            value={deck2Id}
            onChange={(e) => setDeck2Id(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              fontSize: '14px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              marginBottom: '8px'
            }}
          >
            <option value="">デッキを選択</option>
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

      {/* 対戦情報の表示 */}
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

          {/* 先攻選択 */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              先攻:
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
