{round.matches.map(match => {
  const deck1 = getDeckById(match.deck1Id);
  const deck2 = getDeckById(match.deck2Id);
  const deck1Stats = getDeckStats(match.deck1Id);
  const deck2Stats = getDeckStats(match.deck2Id);
  const isBye = !match.deck2Id;
  const winnerId = match.winnerId;
  const loserId = match.loserId;
  const hasUpset = match.status === 'completed' && !isBye ? isUpset(winnerId, loserId) : false;

  return (
    <div key={match.matchId} onClick={() => handleMatchClick(match)}
      style={{
        backgroundColor:'white',
        border:match.status==='pending'?'3px solid #3b82f6':'2px solid #d1d5db',
        borderRadius:12, padding:16, boxShadow: match.status==='pending'?'0 4px 12px rgba(59,130,246,0.3)':'0 2px 4px rgba(0,0,0,0.1)',
        cursor:(match.status==='pending' && deck1 && deck2)?'pointer':'default', position:'relative'
      }}>
      {match.status==='pending' && deck1 && deck2 && <div style={{position:'absolute',top:-12,right:12,backgroundColor:'#3b82f6',color:'white',padding:'4px 12px',borderRadius:12,fontSize:12,fontWeight:'bold'}}>クリックして入力</div>}
      {hasUpset && <div style={{position:'absolute',top:-12,left:12,backgroundColor:'#f59e0b',color:'white',padding:'4px 12px',borderRadius:12,fontSize:12,fontWeight:'bold'}}>🔥 番狂わせ！</div>}

      {/* デッキ1 */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:12, borderRadius:8, backgroundColor: winnerId===deck1?.id?'#d1fae5':'#f9fafb', border: winnerId===deck1?.id?'2px solid #10b981':'1px solid #e5e7eb', marginBottom:8 }}>
        {deck1?.imageUrl && (
          <img 
            src={deck1.imageUrl} 
            alt={deck1.name}
            style={{ width:50, height:50, borderRadius:8, objectFit:'cover', border:'2px solid #ddd' }}
          />
        )}
        <div style={{flex:1}}>
          <div style={{fontWeight:'bold', fontSize:16}}>{deck1 ? deck1.name : <span style={{ fontStyle:'italic', color:'#9ca3af' }}>シード待ち</span>}</div>
          {deck1Stats && (
            <div style={{fontSize:12, color:'#666', marginTop:4}}>
              <span style={{marginRight:10}}>⭐ レート: {deck1Stats.rating}</span>
              <span style={{marginRight:10}}>🎯 勝率: {getWinRate(deck1.id)}%</span>
              <span>🏆 {deck1Stats.wins}勝{deck1Stats.losses}敗</span>
            </div>
          )}
        </div>
        {winnerId===deck1?.id && <span style={{fontSize:24}}>🏆</span>}
      </div>

      <div style={{ textAlign:'center', color:'#9ca3af', fontWeight:'bold', fontSize:14, margin:'4px 0' }}>VS</div>

      {/* デッキ2 */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:12, borderRadius:8, backgroundColor: winnerId===deck2?.id?'#d1fae5':'#f9fafb', border: winnerId===deck2?.id?'2px solid #10b981':'1px solid #e5e7eb' }}>
        {deck2?.imageUrl && (
          <img 
            src={deck2.imageUrl} 
            alt={deck2.name}
            style={{ width:50, height:50, borderRadius:8, objectFit:'cover', border:'2px solid #ddd' }}
          />
        )}
        <div style={{flex:1}}>
          <div style={{fontWeight:'bold', fontSize:16}}>{deck2 ? deck2.name : <span style={{ fontStyle:'italic', color:'#9ca3af' }}>シード待ち</span>}</div>
          {deck2Stats && (
            <div style={{fontSize:12, color:'#666', marginTop:4}}>
              <span style={{marginRight:10}}>⭐ レート: {deck2Stats.rating}</span>
              <span style={{marginRight:10}}>🎯 勝率: {getWinRate(deck2.id)}%</span>
              <span>🏆 {deck2Stats.wins}勝{deck2Stats.losses}敗</span>
            </div>
          )}
        </div>
        {winnerId===deck2?.id && <span style={{fontSize:24}}>🏆</span>}
      </div>

      {isBye && match.status === 'completed' && <div style={{ fontSize:12, color:'#f59e0b', marginTop:4, textAlign:'center' }}>※ 不戦勝で次回戦へ</div>}
    </div>
  );
})}
