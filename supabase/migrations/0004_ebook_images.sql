comment on column ebooks.image_ideas is '[{placement, caption, gemini_prompt, image_url}] - agent writes prompts, Kosi generates in Gemini and uploads';
insert into storage.buckets (id, name, public) values ('ebook-images', 'ebook-images', true) on conflict do nothing;
create policy "auth upload ebook images" on storage.objects for insert to authenticated with check (bucket_id = 'ebook-images');
create policy "auth update ebook images" on storage.objects for update to authenticated using (bucket_id = 'ebook-images');
create policy "auth delete ebook images" on storage.objects for delete to authenticated using (bucket_id = 'ebook-images');
