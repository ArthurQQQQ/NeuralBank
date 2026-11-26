-- Run as the project's migration administrator. This does not modify Sites/D1.
-- Keep neuralbank_private OUT of the Data API's exposed schemas.
begin;

create schema if not exists neuralbank_private;
revoke all on schema neuralbank_private from public, anon, authenticated;
grant usage on schema neuralbank_private to authenticated;

-- This starts empty. Only reviewed institution domains may be imported.
create table neuralbank_private.academic_email_domains (
  domain text primary key check (domain = lower(domain) and domain ~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$' and position('.' in domain) > 0),
  institution text not null check (length(institution) between 2 and 300),
  allow_subdomains boolean not null default false,
  evidence_url text not null check (evidence_url ~ '^https://[^[:space:]]+$'),
  reviewed_by text not null check (length(reviewed_by) between 2 and 100),
  reviewed_at timestamptz not null,
  source_ref text not null,
  enabled boolean not null default true
);
create table neuralbank_private.blocked_email_domains (
  domain text primary key check (domain = lower(domain) and domain ~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$'),
  reason text not null,
  source_ref text not null
);
revoke all on neuralbank_private.academic_email_domains, neuralbank_private.blocked_email_domains from public, anon, authenticated;
alter table neuralbank_private.academic_email_domains enable row level security;
alter table neuralbank_private.blocked_email_domains enable row level security;
insert into neuralbank_private.blocked_email_domains(domain, reason, source_ref)
select domain, 'Shared consumer/tenant email provider; not an institution domain', 'NeuralBank initial safety policy'
from unnest(array['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com',
  'icloud.com', 'proton.me', 'protonmail.com', 'aol.com', 'qq.com', '163.com', '126.com',
  'mail.com', 'gmx.com', 'yandex.com', 'onmicrosoft.com']) as providers(domain);

-- Safe to call before OTP: reveals only whether a domain is approved, not users.
create function public.check_neuralbank_email_domain(email_address text)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  email_domain text;
begin
  if email_address is null or length(email_address) > 320
     or email_address !~ '^[^@[:space:]]+@[^@[:space:]]+$' then return false; end if;
  email_domain := lower(split_part(email_address, '@', 2));
  if length(email_domain) > 253 or email_domain !~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$'
     or email_domain like '%..%' then return false; end if;
  if exists (select 1 from unnest(string_to_array(email_domain, '.')) label
    where length(label) > 63 or label !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$') then return false; end if;
  if exists (
    select 1 from neuralbank_private.blocked_email_domains d
    where email_domain = d.domain or right(email_domain, length(d.domain) + 1) = '.' || d.domain
  ) then return false; end if;
  return exists (
    select 1 from neuralbank_private.academic_email_domains d
    where d.enabled and (email_domain = d.domain or
      (d.allow_subdomains and right(email_domain, length(d.domain) + 1) = '.' || d.domain))
  );
end;
$$;
revoke all on function public.check_neuralbank_email_domain(text) from public;
grant execute on function public.check_neuralbank_email_domain(text) to anon, authenticated;

-- Auth's own tables, never user_metadata or a client owner/provider argument,
-- establish identity. GitHub is an allowed login, not a university credential.
create function neuralbank_private.identity_allowed()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid()) and not coalesce(u.is_anonymous, false)
      and (
        exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'github')
        or (
          u.email_confirmed_at is not null
          and exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email')
          and public.check_neuralbank_email_domain(u.email)
        )
      )
  );
$$;
revoke all on function neuralbank_private.identity_allowed() from public, anon;
grant execute on function neuralbank_private.identity_allowed() to authenticated;

create function public.get_neuralbank_auth_status()
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return jsonb_build_object('eligible', false, 'reason', 'AUTH_REQUIRED');
  end if;
  if not neuralbank_private.identity_allowed() then
    return jsonb_build_object('eligible', false, 'reason', 'ACADEMIC_EMAIL_REQUIRED');
  end if;
  return jsonb_build_object('eligible', true, 'reason', null);
end;
$$;
revoke all on function public.get_neuralbank_auth_status() from public, anon;
grant execute on function public.get_neuralbank_auth_status() to authenticated;

-- Catalog IDs are authorization-independent, but prevent corrupt/fabricated IDs.
-- Append newly reviewed IDs here in a subsequent migration when catalog grows.
create table neuralbank_private.model_ids (id text primary key);
insert into neuralbank_private.model_ids (id) values
  ('perceptron'), ('mlp'), ('cnn'), ('rnn'), ('lstm'), ('transformer'), ('autoencoder'), ('resnet'),
  ('gru'), ('unet'), ('vit'), ('vae'), ('gan'), ('hopfield'), ('modern-hopfield'), ('ntm'), ('dnc'),
  ('log-linear-attention'), ('mamba3'), ('rae'), ('titans'), ('gated-attention'), ('canon-layer'),
  ('ahn'), ('flowstate'), ('repack-refine'), ('rbf'), ('rbm'), ('dbn'), ('kan'), ('lenet'),
  ('alexnet'), ('vgg'), ('inception'), ('densenet'), ('mobilenet-v2'), ('efficientnet'), ('convnext'),
  ('bert'), ('gpt'), ('t5'), ('swin'), ('performer'), ('retnet'), ('rwkv'), ('s4'), ('mamba'),
  ('gcn'), ('gat'), ('graphsage'), ('gin'), ('tcn'), ('wavenet'), ('nbeats'), ('tft'), ('patchtst'),
  ('itransformer'), ('vqvae'), ('ddpm'), ('latent-diffusion'), ('dit'), ('realnvp'), ('memn2n'), ('transformer-xl');
revoke all on neuralbank_private.model_ids from public, anon, authenticated;
grant select on neuralbank_private.model_ids to authenticated;

create table neuralbank_private.learning_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  learned text[] not null default '{}',
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz,
  check (cardinality(learned) <= 256 and array_position(learned, null) is null)
);
alter table neuralbank_private.learning_progress enable row level security;
alter table neuralbank_private.learning_progress force row level security;
revoke all on neuralbank_private.learning_progress from public, anon, authenticated;
grant select, insert, update on neuralbank_private.learning_progress to authenticated;
create policy neuralbank_owner_select on neuralbank_private.learning_progress
  for select to authenticated
  using (user_id = (select auth.uid()) and (select neuralbank_private.identity_allowed()));
create policy neuralbank_owner_insert on neuralbank_private.learning_progress
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select neuralbank_private.identity_allowed()));
create policy neuralbank_owner_update on neuralbank_private.learning_progress
  for update to authenticated
  using (user_id = (select auth.uid()) and (select neuralbank_private.identity_allowed()))
  with check (user_id = (select auth.uid()) and (select neuralbank_private.identity_allowed()));

create function public.get_neuralbank_learning()
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  current_record neuralbank_private.learning_progress%rowtype;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not neuralbank_private.identity_allowed() then
    raise exception 'ACADEMIC_EMAIL_REQUIRED' using errcode = '42501';
  end if;
  select * into current_record from neuralbank_private.learning_progress p where p.user_id = owner_id;
  if not found then return jsonb_build_object('learned', '[]'::jsonb, 'revision', 0, 'updatedAt', null); end if;
  return jsonb_build_object('learned', to_jsonb(current_record.learned), 'revision', current_record.revision, 'updatedAt', current_record.updated_at);
end;
$$;
revoke all on function public.get_neuralbank_learning() from public, anon;
grant execute on function public.get_neuralbank_learning() to authenticated;

create function public.put_neuralbank_learning(expected_revision bigint, model_ids text[])
returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  current_record neuralbank_private.learning_progress%rowtype;
  clean_ids text[];
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not neuralbank_private.identity_allowed() then
    raise exception 'ACADEMIC_EMAIL_REQUIRED' using errcode = '42501';
  end if;
  if expected_revision is null or expected_revision < 0 or expected_revision > 9007199254740991
     or model_ids is null or cardinality(model_ids) > 256
     or array_ndims(model_ids) > 1 or array_position(model_ids, null) is not null then
    raise exception 'INVALID_LEARNING_RECORD' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(model_ids) m(id) where not exists (
    select 1 from neuralbank_private.model_ids known where known.id = m.id
  )) then raise exception 'UNKNOWN_MODEL_ID' using errcode = '22023'; end if;
  select coalesce(array_agg(distinct m.id order by m.id), '{}'::text[]) into clean_ids from unnest(model_ids) m(id);
  insert into neuralbank_private.learning_progress(user_id) values (owner_id) on conflict (user_id) do nothing;
  -- A row lock makes compare-and-swap atomic across tabs/devices.
  select * into current_record from neuralbank_private.learning_progress p where p.user_id = owner_id for update;
  if current_record.revision <> expected_revision then
    return jsonb_build_object('ok', false, 'code', 'REVISION_CONFLICT', 'learned', to_jsonb(current_record.learned), 'revision', current_record.revision, 'updatedAt', current_record.updated_at);
  end if;
  if current_record.revision >= 9007199254740991 then
    raise exception 'REVISION_LIMIT_REACHED' using errcode = '22023';
  end if;
  update neuralbank_private.learning_progress p set learned = clean_ids,
    revision = p.revision + 1, updated_at = clock_timestamp()
    where p.user_id = owner_id returning * into current_record;
  return jsonb_build_object('ok', true, 'learned', to_jsonb(current_record.learned), 'revision', current_record.revision, 'updatedAt', current_record.updated_at);
end;
$$;
revoke all on function public.put_neuralbank_learning(bigint, text[]) from public, anon;
grant execute on function public.put_neuralbank_learning(bigint, text[]) to authenticated;

-- Optional: enable as Before User Created Auth Hook where the project plan
-- supports it. It prevents unapproved email registrations/OTP delivery early.
-- RLS/RPC eligibility above remains mandatory even without this signup hook.
create function public.neuralbank_before_user_created(event jsonb)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if event #>> '{user,app_metadata,provider}' = 'github' then return '{}'::jsonb; end if;
  if event #>> '{user,app_metadata,provider}' = 'email'
     and public.check_neuralbank_email_domain(event #>> '{user,email}') then return '{}'::jsonb; end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'ACADEMIC_EMAIL_REQUIRED'));
end;
$$;
revoke all on function public.neuralbank_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.neuralbank_before_user_created(jsonb) to supabase_auth_admin;

commit;
