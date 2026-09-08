-- Supabase 마이그레이션: 자금집행 (중국법인 자금 이상징후 모니터링)
-- 사용법: Supabase 대시보드 > SQL Editor > New query 에 이 파일 전체를 붙여넣고 실행하세요.
--
-- ⚠ 전제조건: 회계관리(E:\Claude Code\관리 ERP 시스템\회계관리\supabase\schema.sql)가 이미
-- 같은 Supabase 프로젝트에 적용되어 있어야 합니다. 이 파일은 회계관리가 만든 공용/참조 객체를
-- 재사용합니다 (다시 만들지 않음): access_keys, verify_access_key(), acct_accounts, acct_statement_lines.
-- 이 모듈의 목적은 "자금 집행 계획"이 아니라 "자금 이상징후 감지"입니다 — 고정 임계치로 자동
-- 경고하지 않고, 추이 데이터만 제공해서 사람이 판단하도록 설계했습니다.
-- 자금집행 전용 테이블/함수는 전부 fund_ 접두사를 씁니다.

-- =====================================================================
-- 자금집행 전용 테이블
-- =====================================================================

-- 월말 보유시재. 기초잔액은 별도 저장하지 않고 매번 전월의 ending_balance_cny로 계산합니다.
create table if not exists fund_cash_positions (
  corp text not null,
  yearmonth text not null,
  ending_balance_cny numeric not null default 0,
  is_manual boolean not null default false,
  note text default '',
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (corp, yearmonth)
);
alter table fund_cash_positions enable row level security;
revoke all on fund_cash_positions from anon, authenticated;

-- 차입금 (본사 담당자가 관리, 지점은 조회만)
create table if not exists fund_loans (
  id bigint generated always as identity primary key,
  corp text not null,
  principal_cny numeric not null default 0,
  balance_cny numeric not null default 0,
  interest_rate numeric,
  start_date text,
  maturity_date text,
  note text default '',
  active boolean not null default true,
  updated_by text,
  updated_at timestamptz not null default now()
);
create index if not exists idx_fund_loans_corp on fund_loans(corp);
alter table fund_loans enable row level security;
revoke all on fund_loans from anon, authenticated;

-- =====================================================================
-- RPC 함수
-- =====================================================================

-- 전월(YYYY-MM) 문자열 계산 헬퍼
create or replace function fund_prev_yearmonth(p_yearmonth text) returns text
language sql immutable
as $$
  select to_char((to_date(p_yearmonth || '-01', 'YYYY-MM-DD') - interval '1 month'), 'YYYY-MM');
$$;

-- 법인 1곳의 보유시재 현황 조회 (지점은 자기 법인만, 본사는 지정 법인)
create or replace function get_cash_position(
  p_access_key text,
  p_corp text,
  p_yearmonth text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_branch_scope text;
  v_corp text;
  v_beginning numeric;
  v_cf_change numeric;
  v_stored record;
begin
  select role, branch_scope into v_role, v_branch_scope from verify_access_key(p_access_key);
  v_corp := coalesce(v_branch_scope, p_corp);

  select coalesce(ending_balance_cny, 0) into v_beginning
  from fund_cash_positions
  where corp = v_corp and yearmonth = fund_prev_yearmonth(p_yearmonth);
  v_beginning := coalesce(v_beginning, 0);

  select coalesce(sum(l.amount_cny), 0) into v_cf_change
  from acct_statement_lines l
  join acct_accounts a on a.code = l.account_code
  where l.corp = v_corp and l.yearmonth = p_yearmonth
    and l.statement_type = 'CF' and a.is_subtotal = false;

  select * into v_stored from fund_cash_positions where corp = v_corp and yearmonth = p_yearmonth;

  return jsonb_build_object(
    'corp', v_corp,
    'beginningCny', v_beginning,
    'cfNetChangeCny', v_cf_change,
    'autoEndingCny', v_beginning + v_cf_change,
    'endingCny', coalesce(v_stored.ending_balance_cny, v_beginning + v_cf_change),
    'isManual', coalesce(v_stored.is_manual, false),
    'note', coalesce(v_stored.note, ''),
    'updatedBy', v_stored.updated_by,
    'updatedAt', v_stored.updated_at
  );
end;
$$;

-- 보유시재 확정/수정 (system_admin/finance 전용) - 이 값이 다음 달 기초잔액이 됨
create or replace function set_cash_position(
  p_access_key text,
  p_corp text,
  p_yearmonth text,
  p_ending_balance_cny numeric,
  p_note text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from verify_access_key(p_access_key);
  if v_role not in ('system_admin', 'finance') then
    raise exception 'unauthorized';
  end if;
  if p_corp is null or p_yearmonth is null or p_ending_balance_cny is null then
    raise exception 'invalid_payload';
  end if;

  insert into fund_cash_positions (corp, yearmonth, ending_balance_cny, is_manual, note, updated_by, updated_at)
  values (p_corp, p_yearmonth, p_ending_balance_cny, true, coalesce(p_note, ''), v_role, now())
  on conflict (corp, yearmonth) do update
    set ending_balance_cny = excluded.ending_balance_cny, is_manual = true,
        note = excluded.note, updated_by = excluded.updated_by, updated_at = now();
end;
$$;

-- 차입금 조회 (지점은 자기 법인만, 본사는 지정 법인)
create or replace function get_loans(
  p_access_key text,
  p_corp text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_branch_scope text;
  v_corp text;
begin
  select role, branch_scope into v_role, v_branch_scope from verify_access_key(p_access_key);
  v_corp := coalesce(v_branch_scope, p_corp);

  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x."maturityDate" nulls last)
    from (
      select id, corp, principal_cny as "principalCny", balance_cny as "balanceCny",
             interest_rate as "interestRate", start_date as "startDate", maturity_date as "maturityDate", note
      from fund_loans where corp = v_corp and active = true
    ) x
  ), '[]'::jsonb);
end;
$$;

-- 전체 법인 차입금 조회 (system_admin/finance 전용)
create or replace function get_loans_aggregate(p_access_key text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from verify_access_key(p_access_key);
  if v_role not in ('system_admin', 'finance') then
    raise exception 'unauthorized';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.corp, x."maturityDate" nulls last)
    from (
      select id, corp, principal_cny as "principalCny", balance_cny as "balanceCny",
             interest_rate as "interestRate", start_date as "startDate", maturity_date as "maturityDate", note
      from fund_loans where active = true
    ) x
  ), '[]'::jsonb);
end;
$$;

-- 차입금 등록/수정 (system_admin/finance 전용). p_loan.id가 있으면 수정, 없으면 신규.
create or replace function upsert_loan(
  p_access_key text,
  p_loan jsonb
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_id bigint;
begin
  select role into v_role from verify_access_key(p_access_key);
  if v_role not in ('system_admin', 'finance') then
    raise exception 'unauthorized';
  end if;

  v_id := nullif(p_loan->>'id', '')::bigint;

  if v_id is null then
    insert into fund_loans (corp, principal_cny, balance_cny, interest_rate, start_date, maturity_date, note, updated_by, updated_at)
    values (
      p_loan->>'corp',
      coalesce(nullif(p_loan->>'principalCny', '')::numeric, 0),
      coalesce(nullif(p_loan->>'balanceCny', '')::numeric, 0),
      nullif(p_loan->>'interestRate', '')::numeric,
      p_loan->>'startDate', p_loan->>'maturityDate', coalesce(p_loan->>'note', ''),
      v_role, now()
    )
    returning id into v_id;
  else
    update fund_loans set
      corp = p_loan->>'corp',
      principal_cny = coalesce(nullif(p_loan->>'principalCny', '')::numeric, 0),
      balance_cny = coalesce(nullif(p_loan->>'balanceCny', '')::numeric, 0),
      interest_rate = nullif(p_loan->>'interestRate', '')::numeric,
      start_date = p_loan->>'startDate',
      maturity_date = p_loan->>'maturityDate',
      note = coalesce(p_loan->>'note', ''),
      updated_by = v_role, updated_at = now()
    where id = v_id;
  end if;

  return v_id;
end;
$$;

create or replace function delete_loan(
  p_access_key text,
  p_id bigint
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from verify_access_key(p_access_key);
  if v_role not in ('system_admin', 'finance') then
    raise exception 'unauthorized';
  end if;
  update fund_loans set active = false, updated_by = v_role, updated_at = now() where id = p_id;
end;
$$;

-- 배당가능금액: 회계관리 B/S의 미처분이익잉여금 계정 값을 그대로 반환.
-- ⚠ 'BS-R67'(미처분이익잉여금)은 회계관리 supabase/seed_accounts.sql의 실제 계정코드입니다.
-- 회계관리에서 계정과목을 다시 교체(replace_accounts)하면 이 함수의 'BS-R67'을 새 이익잉여금
-- 코드로 바꿔서 다시 실행(create or replace)하세요.
create or replace function get_dividend_available(
  p_access_key text,
  p_corp text,
  p_yearmonth text
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_branch_scope text;
  v_corp text;
  v_amount numeric;
begin
  select role, branch_scope into v_role, v_branch_scope from verify_access_key(p_access_key);
  v_corp := coalesce(v_branch_scope, p_corp);

  select amount_cny into v_amount
  from acct_statement_lines
  where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-R67';

  return coalesce(v_amount, 0);
end;
$$;

grant execute on function get_cash_position(text, text, text) to anon, authenticated;
grant execute on function set_cash_position(text, text, text, numeric, text) to anon, authenticated;
grant execute on function get_loans(text, text) to anon, authenticated;
grant execute on function get_loans_aggregate(text) to anon, authenticated;
grant execute on function upsert_loan(text, jsonb) to anon, authenticated;
grant execute on function delete_loan(text, bigint) to anon, authenticated;
grant execute on function get_dividend_available(text, text, text) to anon, authenticated;
