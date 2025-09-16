import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
  "https://nxrrvrkwhjttdnedjwnj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cnJ2cmt3aGp0dGRuZWRqd25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzc5OTgsImV4cCI6MjA3MzYxMzk5OH0.GrfNdrGuFjJJV1haBbr93VEDY0Van0O75tkcZYlqG8s"
);