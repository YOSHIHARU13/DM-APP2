import React, { useState } from 'react';
import { TournamentDetailProps, Match, Deck } from '../../types';

const TournamentDetail: React.FC<TournamentDetailProps> = ({ 
  tournament, 
  decks, 
  onBack,
  onMatchComplete,
  onTournamentComplete
}) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [winner, setWinner] = useState<'deck1' | 'deck2' | ''>('');
  const [deck1Score, setDeck1Score] = useState<number>(0);
  const [deck2Score, setDeck2Score] = useState<number>(0);

  const getDeckById = (deckId: string | null): Deck | undefined => {
    if (!deckId) return undefined;
    return decks.find(d => d.id === deckId);
  };

  const handleMatchClick = (match: Match) => {
    if (match.status === 'completed' || !match.deck1Id || !match.deck2Id) return;
    setSelectedMatch(match);
    setWinner('');
    setDeck1Score(0);
    setDeck2Score(0);
  };

  const handleMatchSubmit = () => {
    if (!selectedMatch || !winner) {
      alert('勝者を選択してください');
      return;
    }

    const maxWins = tournament.matchType === 'best_of_3' ? 2 : 1;
    const deck1Wins = winner === 'deck1' ? maxWins : deck1Score;
    const deck2Wins = winner === 'deck2' ? maxWins : deck2Score;

    if (tournament.matchType === 'best_of_3') {
      if (deck1Wins < 0 || deck1Wins > 2 || deck2Wins < 0 || deck2Wins > 2) {
        alert('スコアは0-2の範囲で入力してください');
        return;
      }
      if (deck1Wins === deck2Wins || (deck1Wins < 2 && deck2Wins < 2)) {
        alert('どちらかが2勝するまで入力してください');
        return;
      }
    }

    const winnerId = winner === 'deck1' ? selectedMatch.deck1Id! : selectedMatch.deck2Id!;
    const loserId = winner === 'deck1' ? selectedMatch.deck2Id! : selectedMatch.deck1Id!;

    const battle = {
      deck1Id: selectedMatch.deck1Id!,
      deck2Id: selectedMatch.deck2Id!,
      deck1Wins,
      deck2Wins,
      deck1GoingFirst: 0,
      deck2GoingFirst: 0,
      memo: `${tournament.name} - ${selectedMatch.matchId}`,
      date: new Date(),
      projectId: tournament.projectId,
      tournamentId: tournament.id
    };

    onMatchComplete(tournament.id, selectedMatch.matchId, battle);
    setSelectedMatch(null);
  };

  const handleCompleteTournament = () => {
    if (!confirm('トーナメントを完了しますか？完了後は試合結果を変更できません。')) {
      return;
    }
    onTournamentComplete(tournament.id);
  };

  const isAllMatchesComplete = (): boolean => {
    const allMatches: Match[] = [];
    
    tournament.bracket.winnersBracket.forEach(round => {
      allMatches.push(...round.matches);
    });
    
    if (tournament.format === 'single' && tournament.bracket.thirdPlaceMatch) {
      allMatches.push(tournament.bracket.thirdPlaceMatch);
    }
    
    if (tournament.format === 'double') {
      tournament.bracket.losersBracket?.forEach(round => {
        allMatches.push(...round.matches);
      });
      if (tournament.bracket.grandFinal) {
        allMatches.push(tournament.bracket.grandFinal);
      }
    }

    return allMatches
      .filter(m => m.deck1Id && m.deck2Id)
      .every(m => m.status === 'completed');
  };

  const renderMatch = (match: Match, roundName: string) => {
    const deck1 = getDeckById(match.deck1Id);
    const deck2 = getDeckById(match.deck2Id);
    
    const isClickable = match.status !== 'completed' && match.deck1Id && match.deck2Id;

    return (
      <div
        key={match.matchId}
        onClick={() => isClickable && handleMatchClick(match)}
        style={{
          padding: '12px',
          border: `2px solid ${
            match.status === 'completed' ? '#28a745' :
            isClickable ? '#007bff' :
            '#ddd'
          }`,
          borderRadius: '6px',
          backgroundColor: 
            match.status === 'completed' ? '#d4edda' :
            isClickable ? '#e7f3ff' :
            '#f8f9fa',
          cursor: isClickable ? 'pointer' : 'default',
          transition: 'all 0.2s',
          marginBottom: '10px'
        }}
      >
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>
          {roundName} - {match.matchId}
        </div>
        
        {/* デッキ1 */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '6px',
          backgroundColor: match.winnerId === match.deck1Id ? '#c3e6cb' : 'transparent',
          borderRadius: '4px',
          marginBottom: '4px'
        }}>
          {deck1?.imageUrl && (
            <img 
              src={deck1.imageUrl} 
              alt={deck1.name}
              style={{ 
                width: '40px', 
                height: '40px', 
                objectFit: 'cover', 
                borderRadius: '4px'
              }}
            />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold' }}>
              {deck1?.name || 'シード待ち'}
            </div>
            {deck1 && (
              <div style={{ fontSize: '11px', color: '#666' }}>
                {deck1.colors.join(', ')}
              </div>
            )}
          </div>
          {match.status === 'completed' && (
            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
              {match.deck1Wins}
            </div>
          )}
          {match.winnerId === match.deck1Id && <span>🏆</span>}
        </div>

        <div style={{ 
          textAlign: 'center', 
          fontSize: '12px', 
          color: '#999',
          margin: '4px 0'
        }}>
          VS
        </div>

        {/* デッキ2 */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '6px',
          backgroundColor: match.winnerId === match.deck2Id ? '#c3e6cb' : 'transparent',
          borderRadius: '4px'
        }}>
          {deck2?.imageUrl && (
            <img 
              src={deck2.imageUrl} 
              alt={deck2.name}
              style={{ 
                width: '40px', 
                height: '40px', 
                objectFit: 'cover', 
                borderRadius: '4px'
              }}
            />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold' }}>
              {deck2?.name || 'シード待ち'}
            </div>
            {deck2 && (
              <div style={{ fontSize: '11px', color: '#666' }}>
                {deck2.colors.join(', ')}
              </div>
            )}
          </div>
          {match.status === 'completed' && (
            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
              {match.deck2Wins}
            </div>
          )}
          {match.winnerId === match.deck2Id && <span>🏆</span>}
        </div>

        {isClickable && (
          <div style={{ 
            marginTop: '8px', 
            textAlign: 'center', 
            color: '#007bff',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            クリックして結果を入力
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <h2>{tournament.name}</h2>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {tournament.format === 'single' ? 'シングルエリミネーション' : 'ダブルエリミネーション'} / 
            {tournament.matchType === 'best_of_1' ? ' 1本勝負' : ' 3本中2本先取'}
          </div>
          <div style={{ 
            marginTop: '8px',
            padding: '4px 12px',
            backgroundColor: 
              tournament.status === 'completed' ? '#d4edda' :
              tournament.status === 'in_progress' ? '#fff3cd' :
              '#e7f3ff',
            color:
              tournament.status === 'completed' ? '#155724' :
              tournament.status === 'in_progress' ? '#856404' :
              '#004085',
            borderRadius: '12px',
            display: 'inline-block',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {tournament.status === 'completed' ? '✅ 完了' :
             tournament.status === 'in_progress' ? '⚡ 進行中' :
             '📝 準備中'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {tournament.status === 'in_progress' && isAllMatchesComplete() && (
            <button
              onClick={handleCompleteTournament}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              トーナメント完了
            </button>
          )}
          <button
            onClick={onBack}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            戻る
          </button>
        </div>
      </div>

      {/* ブラケット表示 */}
      <div style={{ marginBottom: '30px' }}>
        <h3>トーナメント表</h3>
        
        {/* 勝者側ブラケット */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#007bff' }}>
            {tournament.format === 'double' ? '勝者側ブラケット' : 'メインブラケット'}
          </h4>
          <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
            {tournament.bracket.winnersBracket.map(round => (
              <div key={round.roundNumber} style={{ minWidth: '250px' }}>
                <h5 style={{ 
                  position: 'sticky', 
                  top: 0, 
                  backgroundColor: '#f8f9fa',
                  padding: '8px',
                  margin: '0 0 10px 0',
                  borderRadius: '4px'
                }}>
                  {round.roundName}
                </h5>
                {round.matches.map(match => renderMatch(match, round.roundName))}
              </div>
            ))}
          </div>
        </div>

        {/* 3位決定戦（シングルエリミネーション） */}
        {tournament.format === 'single' && tournament.bracket.thirdPlaceMatch && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#ff9800' }}>3位決定戦</h4>
            <div style={{ maxWidth: '300px' }}>
              {renderMatch(tournament.bracket.thirdPlaceMatch, '3位決定戦')}
            </div>
          </div>
        )}

        {/* 敗者側ブラケット（ダブルエリミネーション） */}
        {tournament.format === 'double' && tournament.bracket.losersBracket && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#dc3545' }}>敗者側ブラケット</h4>
            <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
              {tournament.bracket.losersBracket.map(round => (
                <div key={round.roundNumber} style={{ minWidth: '250px' }}>
                  <h5 style={{ 
                    position: 'sticky', 
                    top: 0, 
                    backgroundColor: '#f8f9fa',
                    padding: '8px',
                    margin: '0 0 10px 0',
                    borderRadius: '4px'
                  }}>
                    {round.roundName}
                  </h5>
                  {round.matches.map(match => renderMatch(match, round.roundName))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* グランドファイナル（ダブルエリミネーション） */}
        {tournament.format === 'double' && tournament.bracket.grandFinal && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#ffc107' }}>グランドファイナル</h4>
            <div style={{ maxWidth: '300px' }}>
              {renderMatch(tournament.bracket.grandFinal, 'グランドファイナル')}
            </div>
          </div>
        )}
      </div>

      {/* 試合結果入力モーダル */}
      {selectedMatch && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginBottom: '20px' }}>試合結果を入力</h3>

            {/* デッキ情報 */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <strong>{getDeckById(selectedMatch.deck1Id)?.name}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {getDeckById(selectedMatch.deck1Id)?.colors.join(', ')}
                </div>
              </div>
              <div style={{ textAlign: 'center', margin: '10px 0', color: '#999' }}>VS</div>
              <div>
                <strong>{getDeckById(selectedMatch.deck2Id)?.name}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {getDeckById(selectedMatch.deck2Id)?.colors.join(', ')}
                </div>
              </div>
            </div>

            {/* 勝者選択 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                勝者を選択:
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <label style={{
                  flex: 1,
                  padding: '12px',
                  border: `2px solid ${winner === 'deck1' ? '#28a745' : '#ddd'}`,
                  borderRadius: '6px',
                  backgroundColor: winner === 'deck1' ? '#d4edda' : 'white',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}>
                  <input
                    type="radio"
                    name="winner"
                    checked={winner === 'deck1'}
                    onChange={() => setWinner('deck1')}
                    style={{ marginRight: '8px' }}
                  />
                  {getDeckById(selectedMatch.deck1Id)?.name}
                </label>
                <label style={{
                  flex: 1,
                  padding: '12px',
                  border: `2px solid ${winner === 'deck2' ? '#28a745' : '#ddd'}`,
                  borderRadius: '6px',
                  backgroundColor: winner === 'deck2' ? '#d4edda' : 'white',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}>
                  <input
                    type="radio"
                    name="winner"
                    checked={winner === 'deck2'}
                    onChange={() => setWinner('deck2')}
                    style={{ marginRight: '8px' }}
                  />
                  {getDeckById(selectedMatch.deck2Id)?.name}
                </label>
              </div>
            </div>

            {/* 3本勝負の場合のスコア入力 */}
            {tournament.matchType === 'best_of_3' && (
              <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                  詳細スコア（オプション）:
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    value={deck1Score}
                    onChange={(e) => setDeck1Score(parseInt(e.target.value) || 0)}
                    style={{ width: '60px', padding: '8px', textAlign: 'center' }}
                  />
                  <span>-</span>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    value={deck2Score}
                    onChange={(e) => setDeck2Score(parseInt(e.target.value) || 0)}
                    style={{ width: '60px', padding: '8px', textAlign: 'center' }}
                  />
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
                  勝者は自動的に2勝として記録されます
                </div>
              </div>
            )}

            {/* ボタン */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleMatchSubmit}
                disabled={!winner}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: winner ? '#28a745' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: winner ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold'
                }}
              >
                確定
              </button>
              <button
                onClick={() => setSelectedMatch(null)}
                style={{
                  padding: '12px 20px',
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
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentDetail;
