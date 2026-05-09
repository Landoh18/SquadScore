import { shooterShots, shooterScore, longestStreak } from '../lib/scoring';

const HIT_COLOR = '#97C459';
const MISS_COLOR = '#F09595';
const UNSHOT_COLOR = '#2C2C2A';
const CELL_BORDER = '#2C2C2A';
const PAPER_BG = '#FFFFFF';
const PAPER_EDGE = '#B4B2A9';
const TEXT = '#2C2C2A';
const TERTIARY = '#999';

function formatDate(iso) {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${datePart} · ${timePart}`;
}

function buildShooterRow(round, shooterIdx) {
  const shooter = round.shooters[shooterIdx];
  const shots = shooterShots(round, shooterIdx);
  const path = [];
  for (let n = 1; n <= 5; n++) {
    path.push(((shooter.startingPost - 1 + n - 1) % 5) + 1);
  }
  const cells = [];
  for (let i = 0; i < 25; i++) {
    if (i < shots.length) {
      cells.push({ kind: shots[i].hit ? 'hit' : 'miss' });
    } else {
      cells.push({ kind: 'unshot' });
    }
  }
  const { hits } = shooterScore(round, shooterIdx);
  const longest = longestStreak(shots);
  const isLeft = shooter.leftAfterShot != null;
  return { path, cells, hits, longest, isLeft };
}

function CellGroup({ cells }) {
  return (
    <div style={{ display: 'flex' }}>
      {cells.map((c, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 10,
            background:
              c.kind === 'hit'
                ? HIT_COLOR
                : c.kind === 'miss'
                ? MISS_COLOR
                : UNSHOT_COLOR,
            border: `0.5px solid ${CELL_BORDER}`,
          }}
        />
      ))}
    </div>
  );
}

function CircledNumber({ value, isLeft }) {
  if (isLeft || value < 19) {
    return (
      <span style={{ fontSize: 9, fontWeight: 500, color: TEXT }}>{value}</span>
    );
  }
  if (value === 25) {
    return (
      <span
        style={{
          display: 'inline-block',
          fontSize: 9,
          fontWeight: 500,
          color: TEXT,
          border: `0.5px solid ${TEXT}`,
          borderRadius: '50%',
          padding: '1px 4px',
          boxShadow: `0 0 0 1px ${PAPER_BG}, 0 0 0 1.5px ${TEXT}`,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 9,
        fontWeight: 500,
        color: TEXT,
        border: `0.5px solid ${TEXT}`,
        borderRadius: '50%',
        padding: '1px 4px',
        lineHeight: 1,
      }}
    >
      {value}
    </span>
  );
}

export default function PdfPreviewMock({ round, rosterById }) {
  const sortedShooters = round.shooters
    .map((shooter, idx) => ({ shooter, idx }))
    .sort((a, b) => a.shooter.startingPost - b.shooter.startingPost);

  const scorerEntry = rosterById[round.scorerId];
  const scorerName = scorerEntry
    ? `${scorerEntry.firstName} ${scorerEntry.lastName}`
    : 'Scorer';

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 md:px-12 flex flex-col items-center">
      <div
        className="mb-3 text-center"
        style={{
          color: 'var(--color-text-tertiary)',
          fontSize: 11,
          fontStyle: 'italic',
        }}
      >
        Mock preview · final wiring in progress
      </div>

      <div className="mb-3 text-center">
        <div
          style={{
            color: 'var(--color-text-primary)',
            fontSize: 22,
            fontWeight: 500,
          }}
        >
          Round summary
        </div>
        <div
          style={{
            color: 'var(--color-text-tertiary)',
            fontSize: 12,
            marginTop: 2,
          }}
        >
          Printable scorecard
        </div>
      </div>

      <div
        style={{
          background: PAPER_BG,
          border: `0.5px solid ${PAPER_EDGE}`,
          borderRadius: 2,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          padding: 12,
          width: 320,
          maxWidth: '100%',
          color: TEXT,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: `1px solid ${TEXT}`,
            paddingBottom: 6,
            marginBottom: 6,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontFamily: 'Georgia, serif' }}>
              Trap round scorecard
            </div>
            <div style={{ fontSize: 8, color: TERTIARY, marginTop: 2 }}>
              {formatDate(round.date)}
            </div>
            <div style={{ fontSize: 8, color: TERTIARY }}>
              Scored by {scorerName}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 8, color: TERTIARY }}>
            <div>
              {round.shooters.length} shooter
              {round.shooters.length === 1 ? '' : 's'} · 25 shots each
            </div>
            <div>Listed by starting post</div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 7,
            color: TERTIARY,
            marginBottom: 4,
          }}
        >
          <div style={{ width: 50 }} />
          <div style={{ flex: 1 }} />
          <div style={{ width: 24, textAlign: 'right' }}>Total</div>
          <div style={{ width: 24, textAlign: 'right' }}>Streak</div>
        </div>

        {sortedShooters.map(({ shooter, idx }) => {
          const row = buildShooterRow(round, idx);
          const firstName = rosterById[shooter.rosterId]?.firstName ?? '?';
          return (
            <div key={idx} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: 50 }} />
                <div style={{ display: 'flex', gap: 4 }}>
                  {row.path.map((n, i) => (
                    <div
                      key={i}
                      style={{
                        width: 40,
                        textAlign: 'center',
                        fontSize: 7,
                        color: TERTIARY,
                        lineHeight: 1,
                      }}
                    >
                      {n}
                    </div>
                  ))}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: 1,
                }}
              >
                <div style={{ width: 50, fontSize: 9, fontWeight: 500 }}>
                  {firstName}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2, 3, 4].map((g) => (
                    <CellGroup
                      key={g}
                      cells={row.cells.slice(g * 5, g * 5 + 5)}
                    />
                  ))}
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ width: 24, textAlign: 'right' }}>
                  <CircledNumber value={row.hits} isLeft={row.isLeft} />
                </div>
                <div
                  style={{
                    width: 24,
                    textAlign: 'right',
                    fontSize: 9,
                    fontWeight: 500,
                  }}
                >
                  {row.longest}
                </div>
              </div>
            </div>
          );
        })}

        <div
          style={{
            borderTop: `0.5px solid ${TEXT}`,
            paddingTop: 4,
            marginTop: 4,
            fontSize: 7,
            color: TERTIARY,
            textAlign: 'center',
          }}
        >
          ✓ hit · ✗ miss · ▪ unshot · single-circled total = 19+ ·
          double-circled total = 25/25
        </div>

        <div
          style={{
            fontSize: 7,
            color: TERTIARY,
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: 6,
          }}
        >
          Generated by Trap Score · trapscore.app
        </div>
      </div>

      <button
        disabled
        style={{
          marginTop: 16,
          background: '#D85A30',
          color: 'white',
          fontSize: 16,
          fontWeight: 500,
          padding: '14px 32px',
          borderRadius: 12,
          border: 'none',
          opacity: 0.5,
          cursor: 'not-allowed',
        }}
      >
        Download PDF
      </button>
      <div
        style={{
          fontSize: 11,
          color: 'var(--color-text-tertiary)',
          marginTop: 8,
          fontStyle: 'italic',
        }}
      >
        Download wires up in stage 5
      </div>
    </div>
  );
}