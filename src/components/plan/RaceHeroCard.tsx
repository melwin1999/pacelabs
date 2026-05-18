{/* Queued block banner */}
          {queuedBlock && (
            <div style={{
              marginTop: '20px', padding: '9px 14px',
              background: 'rgba(249,115,22,0.05)',
              border: '1px solid rgba(249,115,22,0.12)',
              borderRadius: '8px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: '9px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Next up</p>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#f5f5f5' }}>{queuedBlock.name}</p>
              </div>
              <p style={{ fontSize: '12px', color: '#F97316', fontWeight: 600 }}>
                Starts {queuedBlock.start_date
                  ? new Date(queuedBlock.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                  : 'soon'}
              </p>
            </div>
          )}