-- First, clean up duplicate pending invitations, keeping only the most recent
DELETE FROM public.user_invitations
WHERE id NOT IN (
  SELECT DISTINCT ON (email) id
  FROM public.user_invitations
  WHERE status = 'pending'
  ORDER BY email, created_at DESC
);

-- Function to update invitation status when user confirms email
CREATE OR REPLACE FUNCTION public.update_invitation_on_user_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update invitation status to accepted when user confirms email
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
    UPDATE public.user_invitations
    SET 
      status = 'accepted',
      accepted_at = NEW.email_confirmed_at
    WHERE email = NEW.email
      AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users to update invitation status
DROP TRIGGER IF EXISTS on_user_email_confirmed ON auth.users;
CREATE TRIGGER on_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.update_invitation_on_user_confirm();

-- Create partial unique index to prevent duplicate pending invitations
DROP INDEX IF EXISTS idx_unique_pending_invitation_email;
CREATE UNIQUE INDEX idx_unique_pending_invitation_email 
ON public.user_invitations (email) 
WHERE status = 'pending';