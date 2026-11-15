-- Outreach cadence: day1 follow+like, day2-4 one comment/day, day5 story reply,
-- day6 DM, +3 days follow-up 1, +4 days follow-up 2, then close.

-- Start warm-up for a 'ready' creator. Copies the outreach agent's drafts
-- (creators.outreach_drafts) onto the scheduled actions.
create or replace function start_warmup(p_creator uuid, p_start date default current_date)
returns void language plpgsql security invoker set search_path = public as $$
declare posts jsonb; d jsonb; purl text;
begin
  select recent_posts, outreach_drafts, profile_url into posts, d, purl from creators where id = p_creator;
  if exists (select 1 from actions where creator_id = p_creator) then
    raise exception 'Warm-up already started for this creator';
  end if;
  insert into actions (creator_id, type, seq, due_date, target_url, draft, guidance) values
    (p_creator, 'follow_like', 1, p_start,     purl, null, 'Follow the account and like 2 recent posts'),
    (p_creator, 'comment',     1, p_start + 1, posts->0->>'url', d->'comments'->>0, null),
    (p_creator, 'comment',     2, p_start + 2, posts->1->>'url', d->'comments'->>1, null),
    (p_creator, 'comment',     3, p_start + 3, posts->2->>'url', d->'comments'->>2, null),
    (p_creator, 'story_reply', 1, p_start + 4, purl, null, d->>'story_angle'),
    (p_creator, 'dm',          1, p_start + 5, purl, d->>'dm', 'Hook, observation, opportunity, easy yes. Offer to send the e-book outline.');
  update creators set stage = 'warming' where id = p_creator;
end $$;

-- Tick an action done; advances the creator to the next step.
create or replace function complete_action(p_action uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare a actions%rowtype;
begin
  update actions set status = 'done', done_at = now()
   where id = p_action and status = 'pending' returning * into a;
  if not found then return; end if;

  if a.type = 'dm' then
    update creators set stage = 'dm_sent' where id = a.creator_id;
    insert into actions (creator_id, type, due_date, target_url, draft)
      select a.creator_id, 'followup_1', current_date + 3, a.target_url, outreach_drafts->>'followup_1'
        from creators where id = a.creator_id;
  elsif a.type = 'followup_1' then
    update creators set stage = 'followup_1' where id = a.creator_id;
    insert into actions (creator_id, type, due_date, target_url, draft)
      select a.creator_id, 'followup_2', current_date + 4, a.target_url, outreach_drafts->>'followup_2'
        from creators where id = a.creator_id;
  elsif a.type = 'followup_2' then
    update creators set stage = 'closed_no_reply' where id = a.creator_id;
  end if;
end $$;

-- Skip an action. Comments/follow are dropped; story reply, DM and follow-ups
-- are postponed one day (they're needed for the sequence to continue).
create or replace function skip_action(p_action uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  update actions
     set due_date = case when type in ('story_reply','dm','followup_1','followup_2') then current_date + 1 else due_date end,
         status   = case when type in ('story_reply','dm','followup_1','followup_2') then 'pending'::action_status else 'skipped'::action_status end
   where id = p_action and status = 'pending';
end $$;

-- Creator replied: stop the sequence and hand off to Kosi.
create or replace function mark_replied(p_creator uuid, p_notes text default null)
returns void language plpgsql security invoker set search_path = public as $$
begin
  update actions set status = 'skipped' where creator_id = p_creator and status = 'pending';
  update creators set stage = 'replied', reply_notes = coalesce(p_notes, reply_notes) where id = p_creator;
end $$;

-- Pipeline summary for the overview page
create or replace view pipeline_counts with (security_invoker = true) as
  select stage, count(*)::int as n from creators group by stage;
