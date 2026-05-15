// src/lib/pdfGenerator.js
//
// Generates and downloads the printable scorecard for a completed (or partial)
// round. Letter landscape, black-and-white, per handoff #1's
// "The downloadable PDF itself" section.
//
// Layout (units: pt; jsPDF default):
//   - Letter landscape = 792 × 612 pt
//   - Header band at top: serif title, date/time, "Scored by X"; right-aligned
//     shooter count + "Listed by starting post". 1pt black rule below.
//   - Body fills available height. Per-shooter block = small label row (per-
//     station physical post numbers above the cells) + cell row (name, 25 cells
//     grouped 5+5+5+5+5, total, streak).
//   - Bottom legend: 0.5pt black rule above, legend text.
//   - Footer: italic centered branding below the legend.
//
// Public API:
//   generatePdf(round, rosterById)  — triggers a browser download.

import { jsPDF } from 'jspdf';
import {
  shooterShots,
  shooterScore,
  longestStreak,
  shootersByStartingPost,
  physicalPostOf,
} from './scoring.js';

// ---- Layout constants ------------------------------------------------------

const PAGE_W = 792;
const PAGE_H = 612;
const MARGIN_X = 36;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 24;

// Header band
const HEADER_TITLE_SIZE = 22;     // serif title
const HEADER_META_SIZE = 10;
const HEADER_RULE_GAP = 8;
const HEADER_RULE_WEIGHT = 1;
const HEADER_BAND_BOTTOM_GAP = 14;

// Per-shooter block geometry
const NAME_COL_W = 90;
const TOTAL_COL_W = 64;
const STREAK_COL_W = 50;
const STATION_GROUP_GAP = 12;     // gap between groups of 5 cells
const CELL_W = 25;
const CELL_H = 38;                // taller-than-wide print cells
const CELL_BORDER_W = 0.75;
const CELL_MARK_SIZE = 18;        // ✓/✗ glyph size
const STATION_LABEL_SIZE = 9;
const STATION_LABEL_GAP = 4;      // gap between label row and cell row
const SHOOTER_BLOCK_GAP = 6;      // gap between adjacent shooter blocks
const NAME_SIZE = 14;
const TOTAL_SIZE = 16;
const STREAK_SIZE = 16;

// Totals styling
const CIRCLE_PAD_X = 4;           // horizontal padding inside circle
const CIRCLE_PAD_Y = 3;           // vertical padding inside circle
const DOUBLE_CIRCLE_GAP = 2;      // gap between inner and outer ring of perfect-round double

// Legend + footer
const LEGEND_SIZE = 10;
const LEGEND_RULE_WEIGHT = 0.5;
const LEGEND_RULE_GAP = 6;
const FOOTER_SIZE = 9;
const FOOTER_GAP = 12;

// Colors
const BLACK = '#000000';
const UNSHOT_FILL = '#2C2C2A';

// ---- Public API ------------------------------------------------------------

export function generatePdf(round, rosterById) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'letter',
  });

  // Use built-in helvetica for body; jsPDF doesn't ship a serif, so the title
  // uses the 'times' built-in family (italic-roman serif). Close enough to the
  // mockup's Source Serif treatment.
  doc.setTextColor(BLACK);

  const headerEndY = drawHeader(doc, round, rosterById);
  const footerStartY = drawLegendAndFooter(doc);
  drawBody(doc, round, rosterById, headerEndY, footerStartY);

  doc.save(buildFilename(round));
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

  // Title (serif)
  doc.setFont('times', 'normal');
  doc.setFontSize(HEADER_TITLE_SIZE);
  doc.text('Trap round scorecard', MARGIN_X, y + HEADER_TITLE_SIZE);
  const titleBottom = y + HEADER_TITLE_SIZE;

  // Right-aligned meta (two lines)
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

  // Date/time + scored-by below the title
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

  // Bottom rule
  const ruleY = subY2 + HEADER_RULE_GAP;
  doc.setLineWidth(HEADER_RULE_WEIGHT);
  doc.setDrawColor(BLACK);
  doc.line(MARGIN_X, ruleY, PAGE_W - MARGIN_X, ruleY);

  return ruleY + HEADER_BAND_BOTTOM_GAP;
}

// ---- Legend + footer (drawn first so body knows its bounds) ---------------

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
  const legendText =
    '✓ hit   ✗ miss   ▪ unshot   single-circled total = 19+   double-circled total = 25/25';
  const legendW = doc.getTextWidth(legendText);
  doc.text(legendText, (PAGE_W - legendW) / 2, legendY);

  // Rule above the legend
  const ruleY = legendY - LEGEND_SIZE - LEGEND_RULE_GAP;
  doc.setLineWidth(LEGEND_RULE_WEIGHT);
  doc.setDrawColor(BLACK);
  doc.line(MARGIN_X, ruleY, PAGE_W - MARGIN_X, ruleY);

  return ruleY;
}

// ---- Body (shooter blocks) -------------------------------------------------

function drawBody(doc, round, rosterById, bodyStartY, bodyEndY) {
  const sortedShooters = shootersByStartingPost(round);
  const n = sortedShooters.length;

  // Available vertical space for n blocks (label row + cell row + leave-note
  // gap) plus (n-1) inter-block gaps.
  const availableH = bodyEndY - bodyStartY;

  // Per-shooter block height: station label row + cell row + small leave-note
  // line (reserved even when unused; keeps grid aligned).
  const LEAVE_NOTE_GAP = 8;
  const LEAVE_NOTE_SIZE = 8;
  const blockH =
    STATION_LABEL_SIZE +
    STATION_LABEL_GAP +
    CELL_H +
    LEAVE_NOTE_GAP +
    LEAVE_NOTE_SIZE;

  let cursorY = bodyStartY;

  // Column-header row above the first shooter block: "Total" and "Streak"
  // labels right-aligned over their columns.
  const headerLabelSize = 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(headerLabelSize);
  doc.setTextColor('#666666');
  const cellsAreaW = computeCellsAreaWidth();
  const totalColX = MARGIN_X + NAME_COL_W + cellsAreaW + 12;
  const streakColX = totalColX + TOTAL_COL_W + 6;
  const totalLabelX = totalColX + TOTAL_COL_W - doc.getTextWidth('Total');
  const streakLabelX = streakColX + STREAK_COL_W - doc.getTextWidth('Streak');
  doc.text('Total', totalLabelX, cursorY + headerLabelSize);
  doc.text('Streak', streakLabelX, cursorY + headerLabelSize);
  doc.setTextColor(BLACK);
  cursorY += headerLabelSize + 4;

  for (let i = 0; i < n; i++) {
    const { shooter, idx } = sortedShooters[i];
    drawShooterBlock(doc, round, shooter, idx, rosterById, cursorY);
    cursorY += blockH + SHOOTER_BLOCK_GAP;
    // If we'd overflow, stop. (Shouldn't happen for typical squads; ~5 shooters
    // fit comfortably on letter-landscape with the calibrated geometry.)
    if (cursorY + blockH > bodyEndY) break;
    void availableH; // keep linter quiet
  }
}

function computeCellsAreaWidth() {
  // 5 groups of 5 cells, with 4 gaps between groups
  return 5 * (5 * CELL_W) + 4 * STATION_GROUP_GAP;
}

function drawShooterBlock(doc, round, shooter, shooterIdx, rosterById, blockTopY) {
  const firstName = rosterById[shooter.rosterId]?.firstName ?? '?';
  const shots = shooterShots(round, shooterIdx);
  const isLeft = shooter.leftAfterShot != null;
  const totalShotsTaken = isLeft ? shooter.leftAfterShot : shots.length;
  const { hits } = shooterScore(round, shooterIdx);
  const longest = longestStreak(shots);

  // Per-station physical-post path (1..5 in shooter's chronological order)
  const path = [];
  for (let n = 1; n <= 5; n++) {
    path.push(physicalPostOf(shooter.startingPost, n));
  }

  // Station-label row (small post numbers centered above each group of 5 cells)
  const cellsStartX = MARGIN_X + NAME_COL_W;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(STATION_LABEL_SIZE);
  doc.setTextColor('#666666');
  for (let g = 0; g < 5; g++) {
    const groupX = cellsStartX + g * (5 * CELL_W + STATION_GROUP_GAP);
    const groupCenterX = groupX + (5 * CELL_W) / 2;
    const label = String(path[g]);
    const labelW = doc.getTextWidth(label);
    doc.text(label, groupCenterX - labelW / 2, blockTopY + STATION_LABEL_SIZE);
  }
  doc.setTextColor(BLACK);

  const cellsRowY = blockTopY + STATION_LABEL_SIZE + STATION_LABEL_GAP;

  // Name (left column, vertically centered against the cell row)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(NAME_SIZE);
  doc.text(firstName, MARGIN_X, cellsRowY + CELL_H / 2 + NAME_SIZE / 3);
  doc.setFont('helvetica', 'normal');

  // 25 cells in 5 groups of 5
  for (let g = 0; g < 5; g++) {
    const groupX = cellsStartX + g * (5 * CELL_W + STATION_GROUP_GAP);
    for (let c = 0; c < 5; c++) {
      const cellIdx = g * 5 + c;
      const cellX = groupX + c * CELL_W;
      const cellY = cellsRowY;

      // Border
      doc.setLineWidth(CELL_BORDER_W);
      doc.setDrawColor(BLACK);
      doc.rect(cellX, cellY, CELL_W, CELL_H);

      const isUnshot = cellIdx >= totalShotsTaken;
      if (isUnshot) {
        // Solid black fill
        doc.setFillColor(UNSHOT_FILL);
        doc.rect(cellX + CELL_BORDER_W / 2, cellY + CELL_BORDER_W / 2,
                 CELL_W - CELL_BORDER_W, CELL_H - CELL_BORDER_W, 'F');
      } else {
        const shot = shots[cellIdx];
        const mark = shot.hit ? '✓' : '✗';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(CELL_MARK_SIZE);
        const markW = doc.getTextWidth(mark);
        doc.text(
          mark,
          cellX + (CELL_W - markW) / 2,
          cellY + CELL_H / 2 + CELL_MARK_SIZE / 3
        );
        doc.setFont('helvetica', 'normal');
      }
    }
  }

  // Total column
  const cellsAreaW = computeCellsAreaWidth();
  const totalColX = cellsStartX + cellsAreaW + 12;
  drawTotal(doc, hits, totalShotsTaken, isLeft, totalColX, cellsRowY);

  // Streak column
  const streakColX = totalColX + TOTAL_COL_W + 6;
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

  // Leave-the-line note row (italic, 8pt, just below the cells)
  if (isLeft) {
    const leaveText = buildLeaveNote(shooter.leftAfterShot);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor('#666666');
    doc.text(leaveText, cellsStartX, cellsRowY + CELL_H + 14);
    doc.setTextColor(BLACK);
    doc.setFont('helvetica', 'normal');
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

  // Circle treatment: only completed rounds, and only for hits >= 19.
  if (isLeft) return;
  if (hits < 19) return;

  // Compute an ellipse around the text.
  const cx = textX + w / 2;
  const cy = rowY + CELL_H / 2;
  const rx = w / 2 + CIRCLE_PAD_X;
  const ry = TOTAL_SIZE / 2 + CIRCLE_PAD_Y;

  doc.setLineWidth(0.75);
  doc.setDrawColor(BLACK);
  doc.ellipse(cx, cy, rx, ry);

  if (hits === 25) {
    // Outer ring for perfect-round double-circle
    doc.ellipse(cx, cy, rx + DOUBLE_CIRCLE_GAP, ry + DOUBLE_CIRCLE_GAP);
  }
}