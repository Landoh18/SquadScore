// src/lib/pdfGenerator.js
//
// Generates and downloads the printable scorecard for a completed (or partial)
// round. Letter landscape, black-and-white, per handoff #1's
// "The downloadable PDF itself" section.
//
// Marks (hit ✓ / miss ✗ / unshot square) are drawn geometrically with lines
// and filled rects rather than typed as Unicode glyphs — jsPDF's built-in
// fonts are Latin-1 only and can't render ✓/✗/▪. Geometric drawing is
// crisper at print size anyway and removes the font dependency.

import { jsPDF } from 'jspdf';
import {
  shooterShots,
  shooterScore,
  longestStreak,
  shootersByStartingPost,
  physicalPostOf,
} from './scoring.js';
import { TEAM_LOGO_PNG_BASE64 } from './logo.js';

// ---- Layout constants ------------------------------------------------------

const PAGE_W = 792;
const PAGE_H = 612;
const MARGIN_X = 36;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 24;

// Header band
const HEADER_TITLE_SIZE = 22;
const HEADER_META_SIZE = 10;
const HEADER_RULE_GAP = 8;
const HEADER_RULE_WEIGHT = 1;
const HEADER_BAND_BOTTOM_GAP = 14;

// Column widths (left to right)
const NAME_COL_W = 70;
const NAME_TO_CELLS_GAP = 8;
const CELLS_TO_TOTALS_GAP = 14;
const TOTAL_COL_W = 50;
const TOTALS_TO_STREAK_GAP = 6;
const STREAK_COL_W = 40;

// Cell geometry
const CELL_W = 20;
const CELL_H = 32;
const STATION_GROUP_GAP = 8;
const CELL_BORDER_W = 0.75;

// Mark geometry — drawn inside each cell, padding from the border
const MARK_STROKE = 1.6;
const MARK_PAD = 5;

// Per-shooter block geometry
const STATION_LABEL_SIZE = 9;
const STATION_LABEL_GAP = 4;
const NAME_SIZE = 13;
const TOTAL_SIZE = 14;
const STREAK_SIZE = 14;
const LEAVE_NOTE_GAP = 6;
const LEAVE_NOTE_SIZE = 8;

// Totals styling — looser padding + a wider double-circle gap so the perfect-
// round treatment reads instantly distinct from the single-circle 19+ treatment.
const CIRCLE_PAD_X = 5;
const CIRCLE_PAD_Y = 4;
const DOUBLE_CIRCLE_GAP = 4;

// Perfect-round bounding box geometry. On 25/25 rows, the row's cells are
// pushed down to make room for the station-path numbers above the box, then
// a thin rectangle is drawn around the name+cells+total+streak.
const BOX_BORDER_W = 0.75;
const BOX_PAD_X = 5;
const BOX_PAD_Y = 5;
const PATH_NUMBERS_CLEARANCE = 4;
// Vertical inset added to the cells-row position on perfect rows.
const PERFECT_CELLS_INSET = PATH_NUMBERS_CLEARANCE + BOX_PAD_Y;

// Legend + footer
const LEGEND_SIZE = 10;
const LEGEND_RULE_WEIGHT = 0.5;
const LEGEND_RULE_GAP = 6;
const FOOTER_SIZE = 9;
const FOOTER_GAP = 12;
const LEGEND_SWATCH_SIZE = 8;
const LEGEND_ITEM_GAP = 14;

// Logo (team-customized, drawn centered horizontally above the legend rule)
const LOGO_SIZE = 110;
const LOGO_GAP_FROM_LEGEND = 18;

// Colors
const BLACK = '#000000';
const UNSHOT_FILL = '#2C2C2A';
const META_GRAY = '#666666';

// ---- Public API ------------------------------------------------------------

export function generatePdf(round, rosterById) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'letter',
  });

  doc.setTextColor(BLACK);

  const headerEndY = drawHeader(doc, round, rosterById);
  const footerStartY = drawLegendAndFooter(doc);
  const bodyEndY = drawLogo(doc, footerStartY);
  drawBody(doc, round, rosterById, headerEndY, bodyEndY);

  const filename = buildFilename(round);
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({
      files: [file],
      title: 'Trap round scorecard',
    }).catch((err) => {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
        doc.save(filename);
      }
    });
  } else {
    doc.save(filename);
  }
}

// ---- Filename --------------------------------------------------------------

function buildFilename(round) {
  const d = new Date(round.date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${yyyy}-${mm}-${dd}-${h}-${min}${ampm}-squadscore.pdf`;
}

// ---- Header ----------------------------------------------------------------

function drawHeader(doc, round, rosterById) {
  let y = MARGIN_TOP;

  doc.setFont('times', 'normal');
  doc.setFontSize(HEADER_TITLE_SIZE);
  doc.text('Trap round scorecard', MARGIN_X, y + HEADER_TITLE_SIZE);
  const titleBottom = y + HEADER_TITLE_SIZE;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(HEADER_META_SIZE);
  const shooterCount = round.shooters.length;
  const shooterLabel = shooterCount === 1 ? 'shooter' : 'shooters';
  const metaLine1 = `${shooterCount} ${shooterLabel} · 25 shots each`;
  const metaLine2 = 'Listed by starting post';
  const meta1W = doc.getTextWidth(metaLine1);
  const meta2W = doc.getTextWidth(metaLine2);
  doc.text(metaLine1, PAGE_W - MARGIN_X - meta1W, y + HEADER_META_SIZE + 2);
  doc.text(metaLine2, PAGE_W - MARGIN_X - meta2W, y + HEADER_META_SIZE * 2 + 6);

  const date = new Date(round.date);
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const scorer = rosterById[round.scorerId];
  const scorerName = scorer ? `${scorer.firstName} ${scorer.lastName}` : 'Unknown';

  const subY1 = titleBottom + 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(HEADER_META_SIZE);
  doc.text(`${dateStr} · ${timeStr}`, MARGIN_X, subY1);
  const subY2 = subY1 + HEADER_META_SIZE + 2;
  doc.text(`Scored by ${scorerName}`, MARGIN_X, subY2);

  const ruleY = subY2 + HEADER_RULE_GAP;
  doc.setLineWidth(HEADER_RULE_WEIGHT);
  doc.setDrawColor(BLACK);
  doc.line(MARGIN_X, ruleY, PAGE_W - MARGIN_X, ruleY);

  return ruleY + HEADER_BAND_BOTTOM_GAP;
}

// ---- Logo ------------------------------------------------------------------

function drawLogo(doc, legendRuleY) {
  const logoX = (PAGE_W - LOGO_SIZE) / 2;
  const logoY = legendRuleY - LOGO_GAP_FROM_LEGEND - LOGO_SIZE;

  try {
    doc.addImage(
      TEAM_LOGO_PNG_BASE64,
      'PNG',
      logoX,
      logoY,
      LOGO_SIZE,
      LOGO_SIZE
    );
  } catch (err) {
    console.error('Logo embed failed:', err);
  }

  return logoY;
}

// ---- Legend + footer ------------------------------------------------------

function drawLegendAndFooter(doc) {
  const footerY = PAGE_H - MARGIN_BOTTOM;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(FOOTER_SIZE);
  const footerText = 'Generated by SquadScore · squadscore.app';
  const footerW = doc.getTextWidth(footerText);
  doc.text(footerText, (PAGE_W - footerW) / 2, footerY);

  const legendY = footerY - FOOTER_GAP - LEGEND_SIZE;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(LEGEND_SIZE);
  doc.setTextColor(BLACK);

  const items = [
    { kind: 'hit', label: 'hit' },
    { kind: 'miss', label: 'miss' },
    { kind: 'unshot', label: 'unshot' },
    { kind: 'text', label: 'single-circled = 19+' },
    { kind: 'text', label: 'double-circled = 25/25' },
  ];

  const itemWidths = items.map((it) => {
    const labelW = doc.getTextWidth(it.label);
    if (it.kind === 'text') return labelW;
    return LEGEND_SWATCH_SIZE + 4 + labelW;
  });
  const totalLegendW =
    itemWidths.reduce((a, b) => a + b, 0) + (items.length - 1) * LEGEND_ITEM_GAP;
  let cursorX = (PAGE_W - totalLegendW) / 2;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const w = itemWidths[i];
    if (it.kind === 'hit') {
      drawCheckmark(doc, cursorX, legendY - LEGEND_SWATCH_SIZE + 1, LEGEND_SWATCH_SIZE);
      doc.text(it.label, cursorX + LEGEND_SWATCH_SIZE + 4, legendY);
    } else if (it.kind === 'miss') {
      drawCross(doc, cursorX, legendY - LEGEND_SWATCH_SIZE + 1, LEGEND_SWATCH_SIZE);
      doc.text(it.label, cursorX + LEGEND_SWATCH_SIZE + 4, legendY);
    } else if (it.kind === 'unshot') {
      doc.setFillColor(UNSHOT_FILL);
      doc.rect(
        cursorX,
        legendY - LEGEND_SWATCH_SIZE + 1,
        LEGEND_SWATCH_SIZE,
        LEGEND_SWATCH_SIZE,
        'F'
      );
      doc.text(it.label, cursorX + LEGEND_SWATCH_SIZE + 4, legendY);
    } else {
      doc.text(it.label, cursorX, legendY);
    }
    cursorX += w + LEGEND_ITEM_GAP;
  }

  const ruleY = legendY - LEGEND_SIZE - LEGEND_RULE_GAP;
  doc.setLineWidth(LEGEND_RULE_WEIGHT);
  doc.setDrawColor(BLACK);
  doc.line(MARGIN_X, ruleY, PAGE_W - MARGIN_X, ruleY);

  return ruleY;
}

// ---- Mark drawing ---------------------------------------------------------

function drawCheckmark(doc, x, y, size) {
  const x1 = x + size * 0.18;
  const y1 = y + size * 0.55;
  const x2 = x + size * 0.42;
  const y2 = y + size * 0.82;
  const x3 = x + size * 0.85;
  const y3 = y + size * 0.18;
  doc.setLineWidth(MARK_STROKE);
  doc.setDrawColor(BLACK);
  doc.setLineCap('round');
  doc.setLineJoin('round');
  doc.line(x1, y1, x2, y2);
  doc.line(x2, y2, x3, y3);
}

function drawCross(doc, x, y, size) {
  doc.setLineWidth(MARK_STROKE);
  doc.setDrawColor(BLACK);
  doc.setLineCap('round');
  doc.line(x + size * 0.2, y + size * 0.2, x + size * 0.8, y + size * 0.8);
  doc.line(x + size * 0.8, y + size * 0.2, x + size * 0.2, y + size * 0.8);
}

// ---- Body (shooter blocks) -------------------------------------------------

function computeCellsAreaWidth() {
  return 5 * (5 * CELL_W) + 4 * STATION_GROUP_GAP;
}

function computeColumnPositions() {
  const cellsStartX = MARGIN_X + NAME_COL_W + NAME_TO_CELLS_GAP;
  const cellsAreaW = computeCellsAreaWidth();
  const totalColX = cellsStartX + cellsAreaW + CELLS_TO_TOTALS_GAP;
  const streakColX = totalColX + TOTAL_COL_W + TOTALS_TO_STREAK_GAP;
  return { cellsStartX, cellsAreaW, totalColX, streakColX };
}

function isPerfectRound(round, shooterIdx) {
  const shooter = round.shooters[shooterIdx];
  if (shooter.leftAfterShot != null) return false;
  const { hits } = shooterScore(round, shooterIdx);
  return hits === 25;
}

function drawBody(doc, round, rosterById, bodyStartY, bodyEndY) {
  const sortedShooters = shootersByStartingPost(round);
  const n = sortedShooters.length;

  // Base per-shooter block height (no perfect-row inset)
  const blockHBase =
    STATION_LABEL_SIZE +
    STATION_LABEL_GAP +
    CELL_H +
    LEAVE_NOTE_GAP +
    LEAVE_NOTE_SIZE;

  // Perfect rows are taller because the cells are pushed down to make room
  // for the path numbers above the bounding box.
  const blockHeights = sortedShooters.map(({ idx }) =>
    isPerfectRound(round, idx) ? blockHBase + PERFECT_CELLS_INSET : blockHBase
  );

  const { totalColX, streakColX } = computeColumnPositions();

  // Column-header row above the first shooter
  const headerLabelSize = 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(headerLabelSize);
  doc.setTextColor(META_GRAY);
  const totalLabel = 'Total';
  const streakLabel = 'Streak';
  const totalLabelW = doc.getTextWidth(totalLabel);
  const streakLabelW = doc.getTextWidth(streakLabel);
  doc.text(totalLabel, totalColX + TOTAL_COL_W - totalLabelW, bodyStartY + headerLabelSize);
  doc.text(streakLabel, streakColX + STREAK_COL_W - streakLabelW, bodyStartY + headerLabelSize);
  doc.setTextColor(BLACK);

  const bodyTop = bodyStartY + headerLabelSize + 4;

  const availableH = bodyEndY - bodyTop;
  const totalBlocksH = blockHeights.reduce((a, b) => a + b, 0);
  const remainingForGaps = availableH - totalBlocksH;
  const MIN_GAP = 10;
  const MAX_GAP = 36;
  let gap = n > 1 ? remainingForGaps / (n - 1) : 0;
  if (gap < MIN_GAP) gap = MIN_GAP;
  if (gap > MAX_GAP) gap = MAX_GAP;

  let cursorY = bodyTop;
  for (let i = 0; i < n; i++) {
    const { shooter, idx } = sortedShooters[i];
    drawShooterBlock(doc, round, shooter, idx, rosterById, cursorY);
    cursorY += blockHeights[i] + gap;
    if (cursorY > bodyEndY) break;
  }
}

function drawShooterBlock(doc, round, shooter, shooterIdx, rosterById, blockTopY) {
  const firstName = rosterById[shooter.rosterId]?.firstName ?? '?';
  const shots = shooterShots(round, shooterIdx);
  const isLeft = shooter.leftAfterShot != null;
  const totalShotsTaken = isLeft ? shooter.leftAfterShot : shots.length;
  const { hits } = shooterScore(round, shooterIdx);
  const longest = longestStreak(shots);
  const isPerfect = isPerfectRound(round, shooterIdx);

  const path = [];
  for (let n = 1; n <= 5; n++) {
    path.push(physicalPostOf(shooter.startingPost, n));
  }

  const { cellsStartX, totalColX, streakColX } = computeColumnPositions();

  // Path numbers row — always at block top. On perfect rows the row content
  // below is pushed down to make room for the box around it.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(STATION_LABEL_SIZE);
  doc.setTextColor(META_GRAY);
  for (let g = 0; g < 5; g++) {
    const groupX = cellsStartX + g * (5 * CELL_W + STATION_GROUP_GAP);
    const groupCenterX = groupX + (5 * CELL_W) / 2;
    const label = String(path[g]);
    const labelW = doc.getTextWidth(label);
    doc.text(label, groupCenterX - labelW / 2, blockTopY + STATION_LABEL_SIZE);
  }
  doc.setTextColor(BLACK);

  // Cells row y — pushed down on perfect rows so the box has clearance above.
  const cellsRowY = isPerfect
    ? blockTopY + STATION_LABEL_SIZE + PATH_NUMBERS_CLEARANCE + BOX_PAD_Y
    : blockTopY + STATION_LABEL_SIZE + STATION_LABEL_GAP;

  // Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(NAME_SIZE);
  doc.text(firstName, MARGIN_X, cellsRowY + CELL_H / 2 + NAME_SIZE / 3);
  doc.setFont('helvetica', 'normal');

  // 25 cells
  for (let g = 0; g < 5; g++) {
    const groupX = cellsStartX + g * (5 * CELL_W + STATION_GROUP_GAP);
    for (let c = 0; c < 5; c++) {
      const cellIdx = g * 5 + c;
      const cellX = groupX + c * CELL_W;
      const cellY = cellsRowY;

      doc.setLineWidth(CELL_BORDER_W);
      doc.setDrawColor(BLACK);
      doc.rect(cellX, cellY, CELL_W, CELL_H);

      const isUnshot = cellIdx >= totalShotsTaken;
      if (isUnshot) {
        doc.setFillColor(UNSHOT_FILL);
        doc.rect(
          cellX + CELL_BORDER_W / 2,
          cellY + CELL_BORDER_W / 2,
          CELL_W - CELL_BORDER_W,
          CELL_H - CELL_BORDER_W,
          'F'
        );
      } else {
        const shot = shots[cellIdx];
        const markBoxX = cellX + MARK_PAD;
        const markBoxY = cellY + MARK_PAD;
        const markBoxSize = Math.min(CELL_W, CELL_H) - MARK_PAD * 2;
        if (shot.hit) {
          drawCheckmark(doc, markBoxX, markBoxY, markBoxSize);
        } else {
          drawCross(doc, markBoxX, markBoxY, markBoxSize);
        }
      }
    }
  }

  drawTotal(doc, hits, totalShotsTaken, isLeft, totalColX, cellsRowY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(STREAK_SIZE);
  const streakStr = String(longest);
  const streakW = doc.getTextWidth(streakStr);
  doc.text(
    streakStr,
    streakColX + STREAK_COL_W - streakW,
    cellsRowY + CELL_H / 2 + STREAK_SIZE / 3
  );
  doc.setFont('helvetica', 'normal');

  if (isLeft) {
    const leaveText = buildLeaveNote(shooter.leftAfterShot);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(LEAVE_NOTE_SIZE);
    doc.setTextColor(META_GRAY);
    doc.text(leaveText, cellsStartX, cellsRowY + CELL_H + 10);
    doc.setTextColor(BLACK);
    doc.setFont('helvetica', 'normal');
  }

  // Perfect-round bounding box. Drawn last so it sits on top of everything
  // it wraps. Encloses name + cells + total + streak; path numbers above
  // are intentionally left outside.
  if (isPerfect) {
    const boxLeft = MARGIN_X - BOX_PAD_X;
    const boxRight = streakColX + STREAK_COL_W + BOX_PAD_X;
    const boxTop = cellsRowY - BOX_PAD_Y;
    const boxBottom = cellsRowY + CELL_H + BOX_PAD_Y;

    doc.setLineWidth(BOX_BORDER_W);
    doc.setDrawColor(BLACK);
    doc.rect(boxLeft, boxTop, boxRight - boxLeft, boxBottom - boxTop);
  }
}

function buildLeaveNote(leftAfterShot) {
  if (leftAfterShot % 5 === 0) {
    const stationsCompleted = leftAfterShot / 5;
    return `left after station ${stationsCompleted} of 5`;
  }
  const station = Math.floor(leftAfterShot / 5) + 1;
  const shotsTaken = leftAfterShot % 5;
  const shotLabel = shotsTaken === 1 ? 'shot' : 'shots';
  return `left during station ${station} after ${shotsTaken} ${shotLabel}`;
}

// ---- Totals (with optional single / double circle) ------------------------

function drawTotal(doc, hits, total, isLeft, colX, rowY) {
  const valueText = isLeft ? `${hits}/${total}` : String(hits);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(TOTAL_SIZE);
  const w = doc.getTextWidth(valueText);
  const textX = colX + TOTAL_COL_W - w;
  const textY = rowY + CELL_H / 2 + TOTAL_SIZE / 3;
  doc.text(valueText, textX, textY);
  doc.setFont('helvetica', 'normal');

  if (isLeft) return;
  if (hits < 19) return;

  const cx = textX + w / 2;
  const cy = rowY + CELL_H / 2;
  const rx = w / 2 + CIRCLE_PAD_X;
  const ry = TOTAL_SIZE / 2 + CIRCLE_PAD_Y;

  doc.setLineWidth(0.75);
  doc.setDrawColor(BLACK);
  doc.ellipse(cx, cy, rx, ry);

  if (hits === 25) {
    doc.ellipse(cx, cy, rx + DOUBLE_CIRCLE_GAP, ry + DOUBLE_CIRCLE_GAP);
  }
}