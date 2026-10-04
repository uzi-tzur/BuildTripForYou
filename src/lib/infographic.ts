/**
 * Draws the trip infographic on a canvas: the cover photo with the trip
 * name, a row of numbers, then one stop per day along a winding road, each
 * with a round photo (or the day's icons) and a short title and summary.
 * Tall rather than wide so it reads well on a phone and shares as one image.
 * Hebrew mirrors the whole layout right-to-left. Browser-only.
 *
 * Photos are loaded through the app's own image endpoint (/_next/image),
 * which makes them same-origin — a photo from another site would otherwise
 * "taint" the canvas and block saving it as an image.
 */
import type { SummaryLang } from "@/lib/tripSummary";

export interface InfographicDay {
  /** e.g. "DAY 1 · Sun, Sep 27" */
  label: string;
  title: string;
  summary: string;
  photoUrl: string | null;
  /** Shown in the circle when the day has no photo. */
  icons: string[];
}

export interface InfographicData {
  lang: SummaryLang;
  title: string;
  dateRange: string;
  tagline: string;
  heroImage: string | null;
  stats: { value: string; label: string }[];
  days: InfographicDay[];
  /** Month (1-12) the trip starts in — picks the season's decorations. */
  startMonth: number;
  brand: string;
  footer: string;
}

const W = 1080;
const MARGIN = 60;
const HEADER_H = 640;
const STATS_H = 220;
const ROW_H = 380;
const FOOTER_H = 230;
const R = 128; // day photo radius
/** Stays within every browser's canvas size limit (iPhone's is the tightest). */
const MAX_CANVAS_HEIGHT = 14000;

const HEBREW = /[֐-׿]/;

const FONT =`"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif`;

const COLORS = {
  background: "#FBF5EC",
  road: "#6B2D2D",
  roadLine: "#FBF5EC",
  badge: "#D4A017",
  label: "#B4532A",
  title: "#3B2416",
  body: "#5B4636",
  statBg: "#FFFFFF",
  statValue: "#B4532A",
  statLabel: "#7A6553",
};

const SEASON_ICONS: Record<string, string[]> = {
  winter: ["❄️", "⛄", "❄️"],
  spring: ["🌸", "🌿", "🌷"],
  summer: ["☀️", "🌴", "🌊"],
  fall: ["🍁", "🍂", "🍁"],
};

function seasonOf(month: number): keyof typeof SEASON_ICONS {
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "fall";
}

/** Through the app's image optimizer, so the photo is same-origin. `width` must be one of Next's configured sizes. */
function sameOriginImageUrl(url: string, width: 640 | 1200): string {
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=80`;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Draws `img` filling the box, cropped to keep its proportions (like CSS object-fit: cover). */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

/** Splits text into at most `maxLines` lines that fit `maxWidth`, ending with "…" if it was cut. */
export function wrapText(measure: (s: string) => number, text: string, maxWidth: number, maxLines: number): string[] {
  // Plain spaces only — a no-break space keeps its neighbors on one line.
  const words = text.split(/[ \t\r\n]+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth || !line) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) {
      line = "";
      // Out of room — mark the last line as cut.
      let last = `${lines[maxLines - 1]}…`;
      while (measure(last) > maxWidth && last.length > 1) last = `${last.slice(0, -2)}…`;
      lines[maxLines - 1] = last;
      return lines;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function infographicHeight(dayCount: number): number {
  return HEADER_H + STATS_H + Math.max(dayCount, 1) * ROW_H + FOOTER_H;
}

export async function drawInfographic(canvas: HTMLCanvasElement, data: InfographicData): Promise<void> {
  const rtl = data.lang === "he";
  /** Layout is written left-to-right; Hebrew mirrors it. */
  const X = (x: number) => (rtl ? W - x : x);

  const [hero, logo, ...dayPhotos] = await Promise.all([
    data.heroImage ? loadImage(sameOriginImageUrl(data.heroImage, 1200)) : Promise.resolve(null),
    loadImage("/logo.png"),
    ...data.days.map((d) => (d.photoUrl ? loadImage(sameOriginImageUrl(d.photoUrl, 640)) : Promise.resolve(null))),
  ]);

  const H = infographicHeight(data.days.length);
  const scale = Math.min(1, MAX_CANVAS_HEIGHT / H);
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textBaseline = "alphabetic";

  const font = (weight: number, size: number) => `${weight} ${size}px ${FONT}`;
  /**
   * Text anchored at the start edge of a left-to-right box [left, …] — the
   * right edge in Hebrew. Each line takes its own direction: an English place
   * name in the Hebrew layout stays right-aligned but reads left-to-right,
   * so its "·" separators and arrows don't get flipped around.
   */
  const text = (s: string, left: number, y: number) => {
    ctx.direction = HEBREW.test(s) ? "rtl" : "ltr";
    ctx.textAlign = rtl ? "right" : "left";
    ctx.fillText(s, X(left), y);
  };
  const lines = (s: string, maxWidth: number, maxLines: number) => wrapText((t) => ctx.measureText(t).width, s, maxWidth, maxLines);

  // Background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);

  // Header: cover photo (or the app's gradient), darkened toward the bottom for the white text.
  if (hero) {
    drawCover(ctx, hero, 0, 0, W, HEADER_H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, HEADER_H);
    g.addColorStop(0, "#1D4ED8");
    g.addColorStop(0.55, "#3B82F6");
    g.addColorStop(1, "#22C55E");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HEADER_H);
  }
  const shade = ctx.createLinearGradient(0, HEADER_H * 0.25, 0, HEADER_H);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, HEADER_H);

  if (logo) {
    const size = 132;
    const lx = rtl ? MARGIN : W - MARGIN - size;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.roundRect(lx, MARGIN - 20, size, size, 26);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(lx + 4, MARGIN - 16, size - 8, size - 8, 22);
    ctx.clip();
    ctx.drawImage(logo, lx + 4, MARGIN - 16, size - 8, size - 8);
    ctx.restore();
  }

  // Stacked from the bottom up, so a two-line name grows upward into the photo.
  let baseline = HEADER_H - 54;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  if (data.tagline) {
    ctx.font = font(500, 32);
    text(lines(data.tagline, W - MARGIN * 2, 1)[0] ?? "", MARGIN, baseline);
    baseline -= 56;
  }
  ctx.font = font(600, 36);
  text(data.dateRange, MARGIN, baseline);
  baseline -= 70;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = font(800, 78);
  for (const line of lines(data.title, W - MARGIN * 2, 2).reverse()) {
    text(line, MARGIN, baseline);
    baseline -= 88;
  }

  // Numbers row
  const gap = 20;
  const statW = (W - MARGIN * 2 - gap * (data.stats.length - 1)) / Math.max(data.stats.length, 1);
  data.stats.forEach((stat, i) => {
    const left = MARGIN + i * (statW + gap);
    const top = HEADER_H + 50;
    ctx.save();
    ctx.shadowColor = "rgba(91,70,54,0.15)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.roundRect(rtl ? W - left - statW : left, top, statW, 128, 28);
    ctx.fillStyle = COLORS.statBg;
    ctx.fill();
    ctx.restore();
    ctx.textAlign = "center";
    const cx = rtl ? W - left - statW / 2 : left + statW / 2;
    ctx.fillStyle = COLORS.statValue;
    ctx.font = font(800, 50);
    ctx.fillText(stat.value, cx, top + 62);
    ctx.fillStyle = COLORS.statLabel;
    ctx.font = font(600, 24);
    ctx.fillText(stat.label, cx, top + 100);
  });

  // Season decorations along the edges, behind everything else below.
  const deco = SEASON_ICONS[seasonOf(data.startMonth)]!;
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.textAlign = "center";
  for (let i = 0; i < data.days.length; i++) {
    const cy = HEADER_H + STATS_H + i * ROW_H + ROW_H / 2;
    ctx.font = font(400, 46);
    ctx.fillText(deco[i % deco.length]!, i % 2 === 0 ? W - 38 : 38, cy + ROW_H / 2 - 10);
  }
  ctx.restore();

  // Day positions: photos alternate sides, the road winds between them.
  const centers = data.days.map((_, i) => ({
    x: X(i % 2 === 0 ? MARGIN + R + 30 : W - MARGIN - R - 30),
    y: HEADER_H + STATS_H + i * ROW_H + ROW_H / 2 - 10,
  }));

  if (centers.length > 0) {
    ctx.beginPath();
    const first = centers[0]!;
    ctx.moveTo(first.x, HEADER_H + STATS_H - 10);
    ctx.lineTo(first.x, first.y);
    for (let i = 1; i < centers.length; i++) {
      const a = centers[i - 1]!;
      const b = centers[i]!;
      ctx.bezierCurveTo(a.x, a.y + ROW_H * 0.62, b.x, b.y - ROW_H * 0.62, b.x, b.y);
    }
    const last = centers[centers.length - 1]!;
    ctx.bezierCurveTo(last.x, last.y + ROW_H * 0.5, W / 2, last.y + ROW_H * 0.3, W / 2, last.y + ROW_H * 0.62);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = COLORS.road;
    ctx.lineWidth = 56;
    ctx.stroke();
    ctx.setLineDash([28, 24]);
    ctx.strokeStyle = COLORS.roadLine;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  data.days.forEach((day, i) => {
    const c = centers[i]!;
    const photo = dayPhotos[i] ?? null;

    // Round photo with a white ring
    ctx.save();
    ctx.shadowColor = "rgba(59,36,22,0.28)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    ctx.beginPath();
    ctx.arc(c.x, c.y, R + 12, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(c.x, c.y, R, 0, Math.PI * 2);
    ctx.clip();
    if (photo) {
      drawCover(ctx, photo, c.x - R, c.y - R, R * 2, R * 2);
    } else {
      const g = ctx.createLinearGradient(c.x - R, c.y - R, c.x + R, c.y + R);
      g.addColorStop(0, "#FDE7C8");
      g.addColorStop(1, "#F6C18B");
      ctx.fillStyle = g;
      ctx.fillRect(c.x - R, c.y - R, R * 2, R * 2);
      const icons = day.icons.slice(0, 3);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#000000";
      if (icons.length === 0) {
        ctx.font = font(400, 92);
        ctx.fillText("🗺️", c.x, c.y + 4);
      } else if (icons.length === 1) {
        ctx.font = font(400, 100);
        ctx.fillText(icons[0]!, c.x, c.y + 4);
      } else {
        ctx.font = font(400, icons.length === 2 ? 76 : 64);
        const spots =
          icons.length === 2
            ? [
                [-46, -6],
                [46, 6],
              ]
            : [
                [0, -50],
                [-52, 34],
                [52, 34],
              ];
        icons.forEach((icon, k) => ctx.fillText(icon, c.x + spots[k]![0]!, c.y + spots[k]![1]!));
      }
      ctx.textBaseline = "alphabetic";
    }
    ctx.restore();

    // Day number badge, on the photo's outer top corner
    const onLeft = i % 2 === 0;
    const bx = X(onLeft ? MARGIN + R + 30 - R * 0.74 : W - MARGIN - R - 30 + R * 0.74);
    const by = c.y - R * 0.74;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(bx, by, 40, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.badge;
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(bx, by, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = font(800, 40);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i + 1), bx, by + 2);
    ctx.textBaseline = "alphabetic";

    // Text beside the photo (left-to-right box; mirrored for Hebrew)
    const boxLeft = onLeft ? MARGIN + R * 2 + 90 : MARGIN + 20;
    const boxWidth = W - MARGIN * 2 - R * 2 - 110;
    ctx.font = font(800, 42);
    const titleLines = lines(day.title, boxWidth, 2);
    ctx.font = font(400, 30);
    const summaryLines = lines(day.summary, boxWidth, 4);
    const blockH = 36 + titleLines.length * 52 + 14 + summaryLines.length * 41;
    let ty = c.y - blockH / 2 + 26;

    ctx.fillStyle = COLORS.label;
    ctx.font = font(700, 26);
    text(day.label, boxLeft, ty);
    ty += 54;
    ctx.fillStyle = COLORS.title;
    ctx.font = font(800, 42);
    for (const line of titleLines) {
      text(line, boxLeft, ty);
      ty += 52;
    }
    ty += 2;
    ctx.fillStyle = COLORS.body;
    ctx.font = font(400, 30);
    for (const line of summaryLines) {
      text(line, boxLeft, ty);
      ty += 41;
    }
  });

  // Footer
  const footerTop = H - FOOTER_H;
  ctx.textAlign = "center";
  if (logo) ctx.drawImage(logo, W / 2 - 50, footerTop + 30, 100, 100);
  ctx.fillStyle = COLORS.title;
  ctx.font = font(800, 34);
  ctx.fillText(data.brand, W / 2, footerTop + 170);
  ctx.fillStyle = COLORS.statLabel;
  ctx.font = font(500, 24);
  ctx.fillText(data.footer, W / 2, footerTop + 205);
}
