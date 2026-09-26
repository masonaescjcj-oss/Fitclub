-- FitClub · 0014 · exercise media is the animations themselves
--
-- Each exercise now has one file in fitclub-exercises: its animation, an
-- animated WebP (or a GIF) under animations/<slug>.webp, shown as is in
-- the app. The videos and stills 0013 allowed are gone, so the bucket
-- takes animated images only. Only this bucket changes.
--
-- Run after 0013. Safe to run again.

update storage.buckets
set allowed_mime_types = array['image/webp', 'image/gif']
where id = 'fitclub-exercises';
