import React, { useState } from "react";
import ExerciseGraphic from "../ExerciseGraphic";
import { cx } from "../ui/kit";
import { findExercise } from "../../lib/training/exercises";
import { mediaUrl } from "../../lib/training/catalog";

/**
 * An exercise's own animation (the liftmanual GIF, WebP or MP4) on a white
 * card, else the drawn ExerciseGraphic. Takes ExerciseGraphic's props, so it
 * drops in wherever that was used; the parent sizes and rounds it.
 *
 * - `thumb` (list rows) prefers the still poster and never plays video.
 * - Media is lazy-loaded; the poster, or a soft skeleton, shows until it has.
 * - A file that fails to load falls back to the drawing.
 *
 * The well stays white at night too (the GIFs are drawn on white), and
 * multiply blending melts their white edges into it.
 */
export default function ExerciseMedia({ exerciseId, name, className = "", thumb = false, exercise }) {
  const ex = exercise || findExercise(exerciseId);
  const m = ex?.media;
  const gif = mediaUrl(m?.gif);
  const webp = mediaUrl(m?.webp);
  const mp4 = mediaUrl(m?.mp4);
  const poster = mediaUrl(m?.poster);

  // Thumbnails stay still when they can; the full view moves.
  let kind = null;
  if (thumb) kind = poster ? "poster" : webp || gif ? "image" : mp4 ? "video" : null;
  else kind = mp4 ? "video" : webp || gif ? "image" : poster ? "poster" : null;

  const fallback = <ExerciseGraphic exerciseId={exerciseId} name={name} className={className} />;
  if (!kind) return fallback;
  const key = [kind, gif, webp, mp4, poster].join("|");
  return (
    <MediaWell key={key} kind={kind} gif={gif} webp={webp} mp4={mp4} poster={poster} name={name}
      thumb={thumb} className={className} fallback={fallback} />
  );
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
      <video className={fill} src={mp4} poster={poster || undefined} muted loop playsInline autoPlay={!thumb}
        preload={thumb ? "metadata" : "auto"} aria-label={alt || undefined} onLoadedData={ready} onError={failed} />
    );
  } else if (kind === "poster") {
    media = <img className={fill} src={poster} alt={alt} loading="lazy" decoding="async" onLoad={ready} onError={failed} />;
  } else {
    const img = <img className={fill} src={gif || webp} alt={alt} loading="lazy" decoding="async" onLoad={ready} onError={failed} />;
    media = webp && gif ? <picture><source srcSet={webp} type="image/webp" />{img}</picture> : img;
  }

  return (
    <div className={cx("relative w-full h-full overflow-hidden isolate bg-card [[data-theme=dark]_&]:bg-hero-fg",
      thumb && "ring-1 ring-inset ring-line", className)}>
      {state === "loading" && (poster && kind !== "poster" ? (
        <img aria-hidden="true" alt="" src={poster} className="absolute inset-0 w-full h-full object-contain mix-blend-multiply" />
      ) : (
        <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-hero-muted/20" />
      ))}
      {media}
    </div>
  );
}
