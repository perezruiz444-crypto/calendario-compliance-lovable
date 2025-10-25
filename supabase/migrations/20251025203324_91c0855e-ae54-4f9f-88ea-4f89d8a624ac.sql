-- Update existing invitations to accepted status for users who already confirmed email
UPDATE public.user_invitations ui
SET 
  status = 'accepted', 
  accepted_at = au.email_confirmed_at
FROM auth.users au
WHERE ui.email = au.email 
  AND au.email_confirmed_at IS NOT NULL 
  AND ui.status = 'pending';