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

-- 월말 보유시재(본사 수기 확정값).
-- ⚠ 2026-09부터 이 값은 기초/기말잔액 계산에 쓰이지 않습니다. 잔액은 전부 지점이 제출한
--   BS/CF에서 뽑고, 이 테이블 값은 "본사가 다르게 확정했다"는 기록으로만 남습니다
--   (fund_reconcile_one의 manualEndingCny / manualDiffCny). 종전에는 이 값이 다음 달
--   기초잔액이었는데, 본사가 한 달이라도 저장을 건너뛰면 그 이후 모든 달의 기초가 0으로
--   떨어져 연쇄적으로 무너졌습니다. 기존 행은 이력이라 지우지 않고 그대로 둡니다.
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

-- =====================================================================
-- 계정코드 상수 + 집계 헬퍼
-- =====================================================================
-- 계정코드를 함수 본문 여기저기에 흩어두면 회계관리가 COA를 교체할 때 놓칩니다.
-- 실제로 2026-09에 그 사고가 났습니다: 배당가능금액이 'BS-R67'을 참조했는데
-- seed_accounts.sql v5가 그 코드를 active=false로 비활성화해서, 조회 결과가 NULL →
-- coalesce(...,0) → 전 법인이 조용히 0원으로 표시됐습니다. 그래서 한 군데로 모읍니다.

create or replace function fund_account_codes() returns jsonb
language sql immutable
as $$
  select jsonb_build_object(
    -- BS 현금성자산: 현금 + 은행예금 + 기타화폐성자산
    -- (단기투자자산 BS-L04는 제외했습니다. 중국 양식의 现金等价物는 3개월 이내 단기투자만
    --  해당하는데 BS-L04는 만기 구분이 없어 통째로 넣으면 과대계상됩니다. CF-59와 차이가
    --  계속 난다면 지점이 CF-59에 무엇을 담고 있는지 확인이 필요합니다.)
    'bsCash',      jsonb_build_array('BS-L01','BS-L02','BS-L03'),
    'bsRetained',  'BS-R55',   -- 미분배이익잉여금 (구 BS-R67, v5에서 변경)
    'bsNetIncome', 'BS-R54',   -- 당기순이익(本年利润)
    'bsCapital',   'BS-R48',   -- 납입자본금
    'bsSurplus',   'BS-R52',   -- 이익잉여금(잉여공적금)
    'plNetIncome', '999999',   -- PL 당기순이익(净利润)
    'cfNet',       'CF-56',    -- 현금및현금성자산 순증가액
    'cfOpening',   jsonb_build_array('CF-58','CF-60'),  -- 차감:현금 기초 + 차감:현금성자산 기초
    'cfEnding',    jsonb_build_array('CF-57','CF-59'),  -- 현금 기말 + 가산:현금성자산 기말
    'cfFx',        'CF-55',    -- 환율변동 영향
    'cfInflow',    jsonb_build_array('CF-01','CF-03','CF-08','CF-22','CF-23','CF-25',
                                     'CF-28','CF-38','CF-40','CF-43','CF-91'),
    'cfOutflow',   jsonb_build_array('CF-10','CF-12','CF-13','CF-18','CF-30','CF-31',
                                     'CF-35','CF-45','CF-46','CF-52','CF-92')
  );
$$;

create or replace function fund_codes(p_key text) returns text[]
language sql immutable
as $$
  select case jsonb_typeof(fund_account_codes()->p_key)
           when 'array' then array(
             select v from jsonb_array_elements_text(fund_account_codes()->p_key) as t(v)
           )
           else array[fund_account_codes()->>p_key]
         end;
$$;

-- "제출 안 됨"과 "제출했는데 0"을 구분하기 위해 sum()의 NULL을 그대로 돌려줍니다.
-- coalesce(...,0)로 뭉개면 미제출 지점이 잔액 0인 법인처럼 보입니다.
-- p_office가 null이면 법인 산하 전 지점 합계입니다.
create or replace function fund_line_sum(
  p_corp text, p_office text, p_yearmonth text, p_type text, p_codes text[]
) returns numeric
language sql stable security definer set search_path = public
as $$
  select sum(amount_cny) from acct_statement_lines
   where corp = p_corp
     and (p_office is null or office = p_office)
     and yearmonth = p_yearmonth
     and statement_type = p_type
     and account_code = any(p_codes);
$$;

-- 해당 월에 그 재무제표를 아예 낸 적이 있는지 (금액 0만 냈어도 제출로 봅니다)
create or replace function fund_has_statement(
  p_corp text, p_office text, p_yearmonth text, p_type text
) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from acct_statement_lines
     where corp = p_corp
       and (p_office is null or office = p_office)
       and yearmonth = p_yearmonth
       and statement_type = p_type
  );
$$;

-- =====================================================================
-- 자금 대사(對査) 계산 — 이 모듈의 핵심
-- =====================================================================
-- 회계 항등식 "전월말 현금 + 당월 순증감 = 당월말 현금"은 반드시 성립해야 합니다.
-- 2026-09 이전에는 좌변만 계산하고 우변(BS)과 맞춰보지 않아서, 틀려도 아무도 몰랐습니다.
-- 이제 양변을 각각 지점 제출자료에서 뽑아 차이를 보여줍니다. 차이가 0이 아니면 그 자체가
-- 이 모듈이 찾으려던 "자금 이상징후"입니다.
--
-- 입력 시간차(BS만 내고 CF는 아직)는 정상 상황이므로, 한쪽이 비면 차이를 0이 아니라
-- null로 반환해 "미제출"과 "일치"를 구분합니다.
--
-- ⚠ CF 순증감을 CF-56에서 읽는 이유:
--   2026-09 이전에는 is_subtotal=false인 CF 계정을 전부 더했습니다. 그런데 중국
--   현금흐름표 양식에서 지급현금(支付的...现金)은 양수로 적습니다 — 부호가 아니라 '减:'
--   라벨이 차감을 표현하기 때문입니다. 그래서 유입과 유출이 상계되지 않고 전부 더해져
--   "총 거래량"이 나왔습니다. 게다가 CF-57~60은 흐름이 아니라 잔액인데 is_subtotal=false라
--   같이 더해졌고, 정작 정답인 CF-56은 is_subtotal=true라서 제외되고 있었습니다.
create or replace function fund_reconcile_one(
  p_corp text, p_office text, p_yearmonth text
) returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_prev text;
  v_bs_begin numeric; v_bs_end numeric;
  v_cf_open numeric; v_cf_end numeric; v_cf_net numeric;
  v_in numeric; v_out numeric; v_fx numeric; v_calc numeric;
  v_begin numeric; v_begin_src text;
  v_net numeric; v_net_src text;
  v_bs_prev_ok boolean; v_bs_ok boolean; v_cf_ok boolean;
  v_stored record;
begin
  v_prev := fund_prev_yearmonth(p_yearmonth);

  v_bs_prev_ok := fund_has_statement(p_corp, p_office, v_prev, 'BS');
  v_bs_ok      := fund_has_statement(p_corp, p_office, p_yearmonth, 'BS');
  v_cf_ok      := fund_has_statement(p_corp, p_office, p_yearmonth, 'CF');

  v_bs_begin := fund_line_sum(p_corp, p_office, v_prev,       'BS', fund_codes('bsCash'));
  v_bs_end   := fund_line_sum(p_corp, p_office, p_yearmonth,  'BS', fund_codes('bsCash'));
  v_cf_open  := fund_line_sum(p_corp, p_office, p_yearmonth,  'CF', fund_codes('cfOpening'));
  v_cf_end   := fund_line_sum(p_corp, p_office, p_yearmonth,  'CF', fund_codes('cfEnding'));
  v_cf_net   := fund_line_sum(p_corp, p_office, p_yearmonth,  'CF', fund_codes('cfNet'));
  v_in       := fund_line_sum(p_corp, p_office, p_yearmonth,  'CF', fund_codes('cfInflow'));
  v_out      := fund_line_sum(p_corp, p_office, p_yearmonth,  'CF', fund_codes('cfOutflow'));
  v_fx       := fund_line_sum(p_corp, p_office, p_yearmonth,  'CF', fund_codes('cfFx'));

  -- 검산값: 유입 − 유출 + 환율변동. CF를 안 냈으면 계산하지 않습니다(0이 아니라 null).
  v_calc := case when v_cf_ok
                 then coalesce(v_in,0) - coalesce(v_out,0) + coalesce(v_fx,0)
            end;

  -- 기초: 전월 BS가 1순위. 전월 BS가 없으면 지점이 당월 CF에 직접 적어낸 기초를 씁니다.
  -- (사업 첫 달이나 전월 미제출일 때 0으로 떨어지지 않게 하는 안전망입니다.)
  if v_bs_prev_ok and v_bs_begin is not null then
    v_begin := v_bs_begin; v_begin_src := 'bs_prev';
  elsif v_cf_ok and v_cf_open is not null then
    v_begin := v_cf_open;  v_begin_src := 'cf_opening';
  else
    v_begin := 0;          v_begin_src := 'none';
  end if;

  -- 순증감: 지점이 적어낸 CF-56이 주값. 비어 있으면 검산값으로 대체합니다.
  if v_cf_net is not null then
    v_net := v_cf_net; v_net_src := 'cf56';
  elsif v_calc is not null then
    v_net := v_calc;   v_net_src := 'calc';
  else
    v_net := 0;        v_net_src := 'none';
  end if;

  -- 본사 수기 확정값은 fund_cash_positions의 PK가 (법인, 월)이라 법인 단위로만 존재합니다.
  -- 지점 행에 법인 값을 얹으면 지점마다 같은 숫자가 반복돼 오해를 부르므로 비워둡니다.
  if p_office is null then
    select * into v_stored from fund_cash_positions
     where corp = p_corp and yearmonth = p_yearmonth;
  end if;

  return jsonb_build_object(
    'corp', p_corp,
    'office', p_office,
    'yearmonth', p_yearmonth,

    -- ---- 기존 화면이 읽던 키 (이름·의미 유지, 값의 출처만 정확해졌습니다) ----
    'beginningCny',   v_begin,
    'cfNetChangeCny', v_net,
    'endingCny',      coalesce(v_bs_end, v_begin + v_net),
    'isManual',       coalesce(v_stored.is_manual, false),
    'note',           coalesce(v_stored.note, ''),
    'updatedBy',      v_stored.updated_by,
    'updatedAt',      v_stored.updated_at,

    -- ---- 산출근거 ----
    'beginningSource', v_begin_src,   -- bs_prev | cf_opening | none
    'netSource',       v_net_src,     -- cf56 | calc | none
    'bsBeginningCny',  v_bs_begin,    -- 전월 BS 현금성자산
    'bsEndingCny',     v_bs_end,      -- 당월 BS 현금성자산
    'cfOpeningCny',    v_cf_open,     -- CF-58+60
    'cfEndingCny',     v_cf_end,      -- CF-57+59
    'cfNetReportedCny', v_cf_net,     -- CF-56
    'cfNetCalcCny',    v_calc,        -- 유입−유출+환율
    'cfInflowCny',     v_in,
    'cfOutflowCny',    v_out,
    'cfFxCny',         v_fx,
    'computedEndingCny', v_begin + v_net,

    -- ---- 제출 현황 (0과 미제출을 구분하기 위한 플래그) ----
    'bsPrevSubmitted', v_bs_prev_ok,
    'bsSubmitted',     v_bs_ok,
    'cfSubmitted',     v_cf_ok,

    -- ---- 본사 수기 확정값: 참고 표시만, 계산에는 쓰지 않습니다 ----
    'manualEndingCny', v_stored.ending_balance_cny,
    'manualDiffCny',   case when v_stored.ending_balance_cny is not null and v_bs_end is not null
                            then v_stored.ending_balance_cny - v_bs_end end,

    -- ---- 일치성 검증 3종 + CF 자체검산 ----
    -- 전부 "0이어야 정상". 한쪽이 미제출이면 null(판정 보류)입니다.
    'diffOpening',  case when v_bs_prev_ok and v_cf_ok and v_bs_begin is not null and v_cf_open is not null
                         then v_cf_open - v_bs_begin end,
    'diffEnding',   case when v_bs_ok and v_cf_ok and v_bs_end is not null and v_cf_end is not null
                         then v_cf_end - v_bs_end end,
    'diffIdentity', case when v_bs_ok and v_cf_ok and v_bs_end is not null
                         then v_bs_end - (v_begin + v_net) end,
    'diffCfNet',    case when v_cf_net is not null and v_calc is not null
                         then v_cf_net - v_calc end
  );
end;
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
begin
  select role, branch_scope into v_role, v_branch_scope from verify_access_key(p_access_key);
  v_corp := coalesce(v_branch_scope, p_corp);

  -- 자금 현황은 법인 단위 개념이라 지점(office)을 나누지 않고 합산합니다.
  -- 지점별 내역은 관리자 화면의 get_fund_reconciliation에서 봅니다.
  return fund_reconcile_one(v_corp, null, p_yearmonth);
end;
$$;

-- 관리자용 산출근거 표: 전 법인 + 지점별 내역 + 검증결과를 한 번에.
-- 종전 관리자 화면은 법인별로 get_cash_position + get_dividend_available를 각각 호출해서
-- 법인 수 × 2회를 왕복했고, 정작 "이 숫자가 어떻게 나왔는지"는 보여주지 않았습니다.
--
-- p_corps: 화면의 config.js CORPORATIONS 목록을 그대로 넘깁니다. DB에 법인 목록을 중복
--          정의하지 않으려는 것이고, 아직 한 건도 제출하지 않은 법인도 표에 "미제출"로
--          나오게 하기 위해서입니다. null이면 데이터에 있는 법인만 잡습니다.
create or replace function get_fund_reconciliation(
  p_access_key text,
  p_yearmonth text,
  p_corps text[] default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_corps text[];
  v_corp text;
  v_office text;
  v_corp_rows jsonb := '[]'::jsonb;
  v_office_rows jsonb := '[]'::jsonb;
begin
  select role into v_role from verify_access_key(p_access_key);
  if v_role not in ('system_admin', 'finance') then
    raise exception 'unauthorized';
  end if;

  if p_corps is null or array_length(p_corps, 1) is null then
    select array_agg(distinct corp order by corp) into v_corps
      from acct_statement_lines
     where yearmonth in (p_yearmonth, fund_prev_yearmonth(p_yearmonth));
  else
    v_corps := p_corps;
  end if;
  v_corps := coalesce(v_corps, array[]::text[]);

  foreach v_corp in array v_corps loop
    v_corp_rows := v_corp_rows || jsonb_build_array(fund_reconcile_one(v_corp, null, p_yearmonth));

    -- 지점별 내역: 당월 또는 전월에 뭔가 제출한 지점만 (빈 행으로 표를 채우지 않습니다)
    for v_office in
      select distinct office from acct_statement_lines
       where corp = v_corp
         and yearmonth in (p_yearmonth, fund_prev_yearmonth(p_yearmonth))
         and statement_type in ('BS','CF')
       order by office
    loop
      v_office_rows := v_office_rows || jsonb_build_array(fund_reconcile_one(v_corp, v_office, p_yearmonth));
    end loop;
  end loop;

  return jsonb_build_object(
    'yearmonth', p_yearmonth,
    'corpRows', v_corp_rows,
    'officeRows', v_office_rows
  );
end;
$$;

-- 보유시재 확정/수정 (system_admin/finance 전용).
-- 참고용 기록입니다. 다음 달 기초잔액은 이 값이 아니라 지점이 제출한 BS에서 나옵니다.
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

-- =====================================================================
-- 배당가능금액 — 기준시점 + 역산
-- =====================================================================
-- 배당 결의는 직전 사업연도말(예: 2025-12) 이익잉여금이 기준입니다. 그런데 이 시스템은
-- 2024-01부터를 담도록 만들어졌을 뿐 실제 입력은 나중에 시작됐기 때문에, 기준월 BS가
-- 아예 없는 상황이 정상입니다.
--
-- 역산식:
--   기준월말 이익잉여금 = 최초제출월 BS(미분배이익잉여금 + 당기순이익)
--                        − PL 당기순이익 누계(기준월 다음달 ~ 최초제출월)
--
-- 이 식은 결산 결전(结转) 여부와 무관하게 성립합니다.
--   · 1월에 이미 结转했다면 R55 = 전년말 확정치, R54 = 당해 누적분
--       (R55+R54) − PL누계 = R55 = 전년말  ✓
--   · 아직 结转 전이라면 R55 = 전전년말, R54 = 전년이익 + 당해 누적분
--       (R55+R54) − PL누계 = 전전년말 + 전년이익 = 전년말  ✓
-- 어느 상태인지 몰라도 답이 같으므로, 회사마다 다른 결산 관행에 영향을 받지 않습니다.
-- 판별 결과는 carryForward 필드로 같이 돌려주니 사람이 눈으로 확인할 수 있습니다.
--
-- ⚠ 법정잉여공적금(10%, 자본금 50% 도달까지) 차감은 아직 적용하지 않습니다. 판정에 필요한
--   납입자본금·잉여공적금은 참고값으로 같이 반환하니, 2단계에서 차감식을 넣을 때 씁니다.
create or replace function get_dividend_detail(
  p_access_key text,
  p_corp text,
  p_base_yearmonth text default null   -- 기준시점. null이면 직전 연도 12월
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text; v_branch_scope text; v_corp text;
  v_base text; v_src text; v_method text;
  v_retained numeric; v_net numeric; v_total numeric;
  v_pl_cum numeric; v_pl_month numeric;
  v_capital numeric; v_surplus numeric;
  v_carry text;
  v_missing boolean;
begin
  select role, branch_scope into v_role, v_branch_scope from verify_access_key(p_access_key);
  v_corp := coalesce(v_branch_scope, p_corp);

  v_base := coalesce(p_base_yearmonth, to_char(now() - interval '1 year', 'YYYY') || '-12');

  -- 참조 계정이 실제로 살아 있는지 먼저 확인합니다. BS-R67 사고처럼 COA가 교체되어 계정이
  -- 사라졌을 때, 0을 보여주는 대신 화면이 경고할 수 있게 합니다.
  select not exists (
    select 1 from acct_accounts
     where statement_type = 'BS' and active = true
       and code = fund_account_codes()->>'bsRetained'
  ) into v_missing;

  -- (A) 기준월 BS가 있으면 그대로 씁니다.
  if fund_has_statement(v_corp, null, v_base, 'BS') then
    v_src := v_base;
    v_method := 'direct';
    v_retained := fund_line_sum(v_corp, null, v_base, 'BS', fund_codes('bsRetained'));
    v_net      := fund_line_sum(v_corp, null, v_base, 'BS', fund_codes('bsNetIncome'));
    v_pl_cum   := 0;
  else
    -- (B) 없으면 기준월 이후 BS를 낸 가장 이른 달을 찾아 역산합니다.
    select min(yearmonth) into v_src
      from acct_statement_lines
     where corp = v_corp and statement_type = 'BS' and yearmonth > v_base;

    if v_src is null then
      return jsonb_build_object(
        'corp', v_corp, 'baseYearmonth', v_base, 'method', 'nodata',
        'accountMissing', v_missing, 'retainedCny', null, 'netIncomeCny', null,
        'dividendAvailableCny', null, 'sourceYearmonth', null);
    end if;

    v_method := 'backcast';
    v_retained := fund_line_sum(v_corp, null, v_src, 'BS', fund_codes('bsRetained'));
    v_net      := fund_line_sum(v_corp, null, v_src, 'BS', fund_codes('bsNetIncome'));

    -- 기준월 다음달 ~ 최초제출월 의 PL 당기순이익 누계
    select sum(amount_cny) into v_pl_cum
      from acct_statement_lines
     where corp = v_corp and statement_type = 'PL'
       and account_code = fund_account_codes()->>'plNetIncome'
       and yearmonth > v_base and yearmonth <= v_src;
    v_pl_cum := coalesce(v_pl_cum, 0);
  end if;

  -- 결전 여부 판별 (참고용). 최초제출월의 BS 당기순이익이 그 달 PL 순이익과 비슷하면
  -- 이미 결전된 것으로 봅니다.
  select sum(amount_cny) into v_pl_month
    from acct_statement_lines
   where corp = v_corp and statement_type = 'PL'
     and account_code = fund_account_codes()->>'plNetIncome'
     and yearmonth = v_src;

  if v_net is null or v_pl_month is null then
    v_carry := 'unknown';
  elsif abs(v_net - v_pl_month) <= greatest(abs(v_pl_month) * 0.01, 1) then
    v_carry := 'carried';      -- 이미 결전됨
  else
    v_carry := 'not_carried';  -- 아직 결전 전
  end if;

  -- ⚠ BS-R55(未分配利润)는 BS-R54(本年利润)를 이미 포함합니다. 예전에는 둘을 더했는데
  -- 그러면 당해 이익이 두 번 잡혀 배당가능금액이 과대계상됩니다 (흥아물류 2026-08 기준
  -- 약 236만 CNY 과대). 실측 근거 — 자본총계(BS-R56)에서 구성항목을 뺀 잔차가
  --   R54를 더한 경우 : -R54 와 거의 같음 (2026-08: -2,311,374 vs R54 2,368,460)
  --   R54를 뺀 경우   : 0 에 가까움      (2026-08: 57,086)
  -- 이므로 자본총계 항등식은 R48+R51+R52+R55 이고, R54는 R55에 흡수돼 있습니다.
  -- 역산(backcast)에서 v_pl_cum을 빼는 건 그대로 둡니다. R55가 당해 이익을 품고 있으니
  -- 기준월로 되돌리려면 그 사이 PL 순이익 누계를 걷어내야 하기 때문입니다.
  v_total := coalesce(v_retained, 0) - coalesce(v_pl_cum, 0);

  v_capital := fund_line_sum(v_corp, null, v_src, 'BS', fund_codes('bsCapital'));
  v_surplus := fund_line_sum(v_corp, null, v_src, 'BS', fund_codes('bsSurplus'));

  return jsonb_build_object(
    'corp', v_corp,
    'baseYearmonth', v_base,         -- 배당 기준시점 (예 2025-12)
    'sourceYearmonth', v_src,        -- 실제로 읽은 BS의 월
    'method', v_method,              -- direct | backcast | nodata
    'accountMissing', v_missing,     -- true면 COA가 바뀌어 계정을 못 찾은 것
    'retainedCny', v_retained,       -- 미분배이익잉여금 (BS-R55). 당기순이익을 이미 포함합니다
    'netIncomeCny', v_net,           -- 당기순이익 (BS-R54). 참고 표시용 - 합계에는 더하지 않습니다
    'plCumulativeCny', v_pl_cum,     -- 역산으로 차감한 PL 순이익 누계
    'dividendAvailableCny', v_total, -- = retained − plCumulative
    'carryForward', v_carry,         -- carried | not_carried | unknown
    'paidInCapitalCny', v_capital,   -- 납입자본금 (법정적립 한도 판정용 참고)
    'surplusReserveCny', v_surplus   -- 잉여공적금 (동일)
  );
end;
$$;

-- 구 함수는 화면 호환을 위해 남기되, 죽은 계정코드를 고치고 지점 합산(sum)을 적용합니다.
-- 종전에는 sum 없는 맨 SELECT INTO라 지점이 여러 곳이면 그중 한 곳 값만 나왔습니다.
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
begin
  select role, branch_scope into v_role, v_branch_scope from verify_access_key(p_access_key);
  v_corp := coalesce(v_branch_scope, p_corp);

  -- bsNetIncome(BS-R54)은 더하지 않습니다. bsRetained(BS-R55)가 이미 포함하고 있어서
  -- 더하면 당해 이익이 두 번 잡힙니다 (get_dividend_detail의 v_total 주석 참고).
  return coalesce(
    fund_line_sum(v_corp, null, p_yearmonth, 'BS', fund_codes('bsRetained')), 0
  );
end;
$$;

-- =====================================================================
-- 권한
-- =====================================================================
-- 헬퍼(fund_line_sum 등)는 access_key 검사를 하지 않으므로 절대 노출하지 않습니다.
-- 이미 revoke된 acct_statement_lines를 읽기 때문에, 노출하면 키 없이 재무제표를
-- 조회할 수 있게 됩니다.
revoke all on function fund_account_codes() from anon, authenticated;
revoke all on function fund_codes(text) from anon, authenticated;
revoke all on function fund_line_sum(text, text, text, text, text[]) from anon, authenticated;
revoke all on function fund_has_statement(text, text, text, text) from anon, authenticated;
revoke all on function fund_reconcile_one(text, text, text) from anon, authenticated;

grant execute on function get_cash_position(text, text, text) to anon, authenticated;
grant execute on function get_fund_reconciliation(text, text, text[]) to anon, authenticated;
grant execute on function set_cash_position(text, text, text, numeric, text) to anon, authenticated;
grant execute on function get_loans(text, text) to anon, authenticated;
grant execute on function get_loans_aggregate(text) to anon, authenticated;
grant execute on function upsert_loan(text, jsonb) to anon, authenticated;
grant execute on function delete_loan(text, bigint) to anon, authenticated;
grant execute on function get_dividend_detail(text, text, text) to anon, authenticated;
grant execute on function get_dividend_available(text, text, text) to anon, authenticated;
