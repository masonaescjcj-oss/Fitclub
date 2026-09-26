import React, { useState } from "react";
import ExerciseGraphic from "../ExerciseGraphic";
import { cx } from "../ui/kit";
import { findExercise } from "../../lib/training/exercises";
import { mediaUrl } from "../../lib/training/catalog";

/**
 * An exercise's own animation (an animated WebP or GIF, from FitClub's media
 * bucket) on a white card, else the drawn ExerciseGraphic. Takes
 * ExerciseGraphic's props, so it drops in wherever that was used; the parent
 * sizes and rounds it.
 *
 * - The animation plays everywhere it's shown, list rows (`thumb`) included:
 *   it's an image, so no autoplay rules or codecs stand in its way.
 * - A catalog with only a video plays it in the full view; a thumbnail then
 *   shows the still, if any.
 * - Media is lazy-loaded behind a soft skeleton; a file that fails to load
 *   falls back to the drawing.
 *
 * The well stays white at night too (the animations are drawn on white), and
 * multiply blending melts their white edges into it.
 */
export default function ExerciseMedia({ exerciseId, name, className = "", thumb = false, exercise }) {
  const ex = exercise || findExercise(exerciseId);
  const m = ex?.media;
  const gif = mediaUrl(m?.gif);
  const webp = mediaUrl(m?.webp);
  const mp4 = mediaUrl(m?.mp4);
  const poster = mediaUrl(m?.poster);

  let kind = null;
  if (webp || gif) kind = "image";
  else if (mp4 && !thumb && canPlayMp4()) kind = "video";
  else if (poster) kind = "poster";

  const fallback = <ExerciseGraphic exerciseId={exerciseId} name={name} className={className} />;
  if (!kind) return fallback;
  const key = [kind, gif, webp, mp4, poster].join("|");
  return (
    <MediaWell key={key} kind={kind} gif={gif} webp={webp} mp4={mp4} poster={poster} name={name}
      thumb={thumb} className={className} fallback={fallback} />
  );
}

let mp4Support = null;
/** Whether this browser plays H.264 video (every phone does; some desktop Linux builds don't). */
function canPlayMp4() {
  if (mp4Support === null) {
    try { mp4Support = !!document.createElement("video").canPlayType('video/mp4; codecs="avc1.64001E"'); } catch { mp4Support = true; }
  }
  return mp4Support;
}

function MediaWell({ kind, gif, webp, mp4, poster, name, thumb, className, fallback }) {
  const [state, setState] = useState("loading"); // loading | ready | failed
  if (state === "failed") return fallback;
  const ready = () => setState("ready");
  const failed = () => setState("failed");
  const fill = cx("absolute inset-0 w-full h-full object-contain mix-blend-multiply transition-opacity duration-300",
    state === "ready" ? "opacity-100" : "opacity-0");
  const alt = thumb ? "" : name || "";

  let media;
  if (kind === "video") {
    media = (
      <video className={fill} src={mp4} poster={poster || undefined} muted loop playsInline autoPlay
        preload="auto" aria-label={alt || undefined} onLoadedData={ready} onError={failed} />
    );
  } else {
    // With both, the GIF is the <img> and browsers that read WebP take the lighter file.
    const src = kind === "poster" ? poster : gif || webp;
    // CORS, so the service worker can keep the file for offline use (public/sw.js).
    const img = <img className={fill} src={src} alt={alt} loading="lazy" decoding="async" crossOrigin="anonymous" onLoad={ready} onError={failed} />;
    media = kind === "image" && webp && gif ? <picture><source srcSet={webp} type="image/webp" />{img}</picture> : img;
  }

  return (
    <div className={cx("relative w-full h-full overflow-hidden isolate bg-card [[data-theme=dark]_&]:bg-hero-fg",
      thumb && "ring-1 ring-inset ring-line", className)}>
      {state === "loading" && <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-hero-muted/20" />}
      {media}
    </div>
  );
}
