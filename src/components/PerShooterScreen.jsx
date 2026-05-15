// src/components/PerShooterScreen.jsx
//
// The real per-shooter end-of-round screen. Renders screens 2..N of the
// EndOfRound carousel, one per shooter in starting-post order.
//
// Edit mode: when editMode=true, station rows that have shots become tappable
// buttons that fire onStationTap(stationN). The parent (EndOfRound) opens the
// StationEditor for that station. "Did not shoot" rows stay non-tappable.

import { IconStar, IconFlame } from '@tabler/icons-react';
import {
  shooterShots,
  shooterScore,
  longestStreak,
  physicalPostOf,
  leaveContext,
} from '../lib/scoring';

function buildStations(round, shooterIdx) {
  const shooter = round.shooters[shooterIdx];
  const shots = shooterShots(round, shooterIdx);
  const totalShots = shooter.leftAfterShot ?? 25;
  const stations = [];

  for (let stationN = 1; stationN <= 5; stationN++) {
    const physicalPost = physicalPostOf(shooter.startingPost, stationN);
    const startIdx = (stationN - 1) * 5;
    const stationShots = shots.slice(startIdx, startIdx + 5);
    const expected = Math.max(0, Math.min(5, totalShots - startIdx));

    if (expected === 0) {
      stations.push({ stationN, post: physicalPost, kind: 'didNotShoot' });
    } else if (expected < 5) {
      const hits = stationShots.filter((s) => s.hit).length;
      stations.push({
        stationN,
        post: physicalPost,
        kind: 'partial',
        shots: stationShots,
        unshot: 5 - stationShots.length,
        hits,
        total: stationShots.length,
      });
    } else {
      const hits = stationShots.filter((s) => s.hit).length;
      stations.push({
        stationN,
        post: physicalPost,
        kind: 'full',
        shots: stationShots,
        hits,
        total: 5,
      });
    }
  }
  return stations;
}

export default function PerShooterScreen({
  round,
  rosterById,
  shooterIdx,
  editMode = false,
  onStationTap,
}) {
  const shooter = round.shooters[shooterIdx];
  const firstName = rosterById[shooter.rosterId]?.firstName ?? '?';
  const allShots = shooterShots(round, shooterIdx);
  const { hits, total } = shooterScore(round, shooterIdx);
  const isLeft = shooter.leftAfterShot != null;
  const isPerfect = !isLeft && hits === 25;
  const isVarsity = !isLeft && hits >= 19 && total === 25;
  const longest = longestStreak(allShots);
  const stations = buildStations(round, shooterIdx);
  const leave = leaveContext(round, shooterIdx);

  const scoreText = isLeft ? `${hits}/${total}` : `${hits}/25`;
  const scoreColor = isVarsity ? '#639922' : 'var(--color-text-primary)';

  let chipLabel = null;
  if (isPerfect) chipLabel = 'Perfect round';
  else if (longest >= 2) chipLabel = `Longest run · ${longest}`;

  const firstDnsIdx = stations.findIndex((s) => s.kind === 'didNotShoot');

  let dividerText = null;
  if (leave?.kind === 'clean') {
    dividerText = `left after station ${leave.stationsCompleted} of 5`;
  } else if (leave?.kind === 'mid-station') {
    dividerText = `left during station ${leave.station} after ${leave.shotsTaken} shot${leave.shotsTaken === 1 ? '' : 's'}`;
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 md:px-12">
      {editMode && (
        <div
          className="mb-3 text-center"
          style={{
            color: 'var(--color-clay-orange)',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          Tap a station to edit its shots
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>
            Started on post {shooter.startingPost}
          </div>
          <div
            style={{
              color: 'var(--color-text-primary)',
              fontSize: 28,
              fontWeight: 500,
              lineHeight: 1.1,
            }}
          >
            {firstName}
          </div>
          {chipLabel && (
            <div
              className="inline-flex items-center gap-1 mt-2"
              style={{
                background: '#FAEEDA',
                color: '#854F0B',
                fontSize: 12,
                fontWeight: 500,
                padding: '4px 10px',
                borderRadius: 999,
              }}
            >
              <IconFlame size={13} />
              <span>{chipLabel}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isPerfect && <IconStar size={18} fill="#854F0B" color="#854F0B" />}
          <div style={{ color: scoreColor, fontSize: 24, fontWeight: 500 }}>{scoreText}</div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {stations.map((station, i) => (
          <div key={i}>
            {dividerText && i === firstDnsIdx && (
              <div className="flex items-center gap-2 my-2">
                <div
                  style={{
                    flex: 1,
                    height: 0.5,
                    background: 'var(--color-text-tertiary)',
                    opacity: 0.4,
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-tertiary)',
                    fontStyle: 'italic',
                  }}
                >
                  {dividerText}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 0.5,
                    background: 'var(--color-text-tertiary)',
                    opacity: 0.4,
                  }}
                />
              </div>
            )}
            <StationBox
              station={station}
              editMode={editMode}
              onTap={() => onStationTap && onStationTap(station.stationN)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function StationBox({ station, editMode, onTap }) {
  if (station.kind === 'didNotShoot') {
    return (
      <div
        className="flex items-center rounded-md"
        style={{
          padding: '12px 14px',
          background: 'transparent',
          border: '0.5px solid var(--color-text-tertiary)',
          opacity: 0.7,
        }}
      >
        <div
          style={{
            width: 70,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text-tertiary)',
          }}
        >
          Station {station.post}
        </div>
        <div
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--color-text-tertiary)',
          }}
        >
          Did not shoot
        </div>
      </div>
    );
  }

  const isPerfectStation = station.kind === 'full' && station.hits === 5;

  const content = (
    <>
      <div
        style={{
          width: 70,
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-text-primary)',
        }}
      >
        Station {station.post}
      </div>
      <div className="flex-1 flex items-center justify-center" style={{ gap: 8 }}>
        {station.shots.map((s, i) => (
          <div
            key={`s${i}`}
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: s.hit ? '#639922' : '#E24B4A',
            }}
          />
        ))}
        {station.kind === 'partial' &&
          Array.from({ length: station.unshot }).map((_, i) => (
            <div
              key={`u${i}`}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#2C2C2A',
              }}
            />
          ))}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: isPerfectStation ? '#639922' : 'var(--color-text-primary)',
        }}
      >
        {station.hits}/{station.total}
      </div>
    </>
  );

  const baseStyle = {
    padding: '12px 14px',
    background: isPerfectStation ? '#EAF3DE' : 'var(--color-background-secondary)',
    border: isPerfectStation ? '2px solid #639922' : 'none',
  };

  if (editMode) {
    return (
      <button
        onClick={onTap}
        className="w-full flex items-center rounded-md text-left"
        style={{ ...baseStyle, cursor: 'pointer' }}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center rounded-md" style={baseStyle}>
      {content}
    </div>
  );
}