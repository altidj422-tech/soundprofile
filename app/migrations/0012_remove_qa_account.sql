-- 0012_remove_qa_account.sql
-- One-off cleanup: remove the leftover QA account (riff_qa_test) and every row
-- it owns, before launch. Matched by username so it's id-agnostic.
DELETE FROM annotation_votes WHERE voter_id IN (SELECT id FROM users WHERE username = 'riff_qa_test');
DELETE FROM annotation_tags WHERE annotation_id IN (
  SELECT id FROM song_annotations WHERE author_id IN (SELECT id FROM users WHERE username = 'riff_qa_test')
);
DELETE FROM song_annotations WHERE author_id IN (SELECT id FROM users WHERE username = 'riff_qa_test');
DELETE FROM comments WHERE user_id IN (SELECT id FROM users WHERE username = 'riff_qa_test');
DELETE FROM friendships WHERE user_id IN (SELECT id FROM users WHERE username = 'riff_qa_test')
                            OR friend_id IN (SELECT id FROM users WHERE username = 'riff_qa_test');
DELETE FROM learning WHERE user_id IN (SELECT id FROM users WHERE username = 'riff_qa_test');
DELETE FROM song_tutorials WHERE added_by IN (SELECT id FROM users WHERE username = 'riff_qa_test');
DELETE FROM dismissed WHERE user_id IN (SELECT id FROM users WHERE username = 'riff_qa_test');
DELETE FROM user_songs WHERE user_id IN (SELECT id FROM users WHERE username = 'riff_qa_test');
DELETE FROM user_instruments WHERE user_id IN (SELECT id FROM users WHERE username = 'riff_qa_test');
DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE username = 'riff_qa_test');
DELETE FROM users WHERE username = 'riff_qa_test';
