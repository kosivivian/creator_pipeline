-- Only signed-in users (Kosi) can read/write from the dashboard.
-- n8n uses the service-role key and the Claude agent uses SQL directly; both bypass RLS.
alter table niches enable row level security;
alter table creators enable row level security;
alter table ebooks enable row level security;
alter table actions enable row level security;
alter table agent_runs enable row level security;

create policy "auth all niches" on niches for all to authenticated using (true) with check (true);
create policy "auth all creators" on creators for all to authenticated using (true) with check (true);
create policy "auth all ebooks" on ebooks for all to authenticated using (true) with check (true);
create policy "auth all actions" on actions for all to authenticated using (true) with check (true);
create policy "auth read runs" on agent_runs for select to authenticated using (true);

revoke execute on function start_warmup(uuid, date) from anon, public;
revoke execute on function complete_action(uuid) from anon, public;
revoke execute on function skip_action(uuid) from anon, public;
revoke execute on function mark_replied(uuid, text) from anon, public;
grant execute on function start_warmup(uuid, date) to authenticated;
grant execute on function complete_action(uuid) to authenticated;
grant execute on function skip_action(uuid) to authenticated;
grant execute on function mark_replied(uuid, text) to authenticated;

-- Seed the three starting niches
insert into niches (name, hashtags, demand_keywords) values
 ('Relationships & dating',
  array['naijarelationships','lagosdating','christiandatingnigeria','relationshipcoachnigeria','nigerianmarriage','singlesinlagos'],
  array['teach me','how do i','how did you','please do a video','drop a guide','i need this','where can i learn','do you have a class','abeg teach','i wan learn','part 2','more of this']),
 ('Parenting & motherhood',
  array['naijamums','lagosmums','nigerianmoms','parentingnigeria','naijamom','momlifenigeria'],
  array['teach me','how do i','how did you','please do a video','drop a guide','i need this','where can i learn','do you have a class','abeg teach','i wan learn','part 2','more of this']),
 ('Personal finance',
  array['personalfinancenigeria','moneytipsnigeria','naijafinance','savingsnigeria','investinginnigeria','sidehustlenigeria'],
  array['teach me','how do i','how did you','please do a video','drop a guide','i need this','where can i learn','do you have a class','abeg teach','i wan learn','part 2','more of this']);
