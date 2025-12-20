-- Add RLS policies for notifications table
-- Users can only view their own notifications
CREATE POLICY "Users view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Only Admin/Faculty can create notifications for users
CREATE POLICY "Admin Faculty create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'FACULTY'::app_role));

-- Make announcements bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'announcements';

-- Update storage policy to require authentication
DROP POLICY IF EXISTS "Anyone can view announcement files" ON storage.objects;

CREATE POLICY "Authenticated users view announcement files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'announcements');