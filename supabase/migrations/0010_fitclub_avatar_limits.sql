-- FitClub · 0010 · limits on profile photos
--
-- The fitclub-avatars bucket (0001) is public so photos load anywhere; it
-- now takes only images, 2 MB at most, so nobody can host other files
-- there. The app already uploads a 512 px JPEG well under that. Only this
-- bucket changes.
--
-- Run after 0009. Safe to run again.

update storage.buckets
set file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'fitclub-avatars';
