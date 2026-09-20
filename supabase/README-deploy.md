# Supabase 배포 방법 (자금집행)

회계관리, 예산관리와 **동일한 관리부 ERP 전용 Supabase 프로젝트를 그대로 공유**합니다 (접대비는 별개 프로젝트).

## 0. 전제조건

이 모듈의 `schema.sql`은 회계관리가 만든 `access_keys`/`verify_access_key()`/`acct_accounts`/
`acct_statement_lines`를 그대로 참조합니다. **회계관리의 `schema.sql`을 먼저 실행**해두어야
정상 동작합니다.

## 1. 테이블/함수 생성

1. Supabase 대시보드 → **SQL Editor → New query**
2. `schema.sql` 전체를 붙여넣고 **Run**.

## 2. 프론트엔드에 연결

`docs/js/config.js`에 다른 모듈과 동일한 값을 넣습니다.

```js
SUPABASE_URL: "https://xxxxxxxx.supabase.co",
SUPABASE_ANON_KEY: "eyJ...",
```

## 3. 접근키

회계관리와 같은 `access_keys` 테이블을 씁니다. `finance`/`system_admin` 키는 보유시재 확정·차입금
관리 권한도 함께 가집니다.

## 4. 계정코드 확인 (중요)

이 모듈은 회계관리 `acct_accounts`의 계정코드를 참조합니다. 코드는 전부
**`fund_account_codes()` 함수 한 곳**에 모여 있습니다.

| 키 | 코드 | 용도 |
|---|---|---|
| `bsCash` | `BS-L01`, `BS-L02`, `BS-L03` | 현금성자산 (기초·기말잔액) |
| `bsRetained` | `BS-R55` | 미분배이익잉여금 (배당가능금액) |
| `bsNetIncome` | `BS-R54` | 당기순이익(本年利润) |
| `plNetIncome` | `999999` | PL 당기순이익 (배당 역산용) |
| `cfNet` | `CF-56` | 현금및현금성자산 순증가액 |
| `cfOpening` / `cfEnding` | `CF-58`+`CF-60` / `CF-57`+`CF-59` | CF가 적어낸 기초·기말 (검증용) |

회계관리에서 계정과목을 교체(`replace_accounts`)하면 **`fund_account_codes()` 하나만**
고쳐서 재실행하면 됩니다.

> **⚠ 2026-09에 실제로 사고가 났던 지점입니다.** 종전에는 `get_dividend_available` 본문에
> `BS-R67`이 하드코딩돼 있었는데, 회계관리 `seed_accounts.sql` v5가 그 코드를
> `active = false`로 비활성화했습니다. 존재하지 않는 계정이라 조회 결과가 NULL이 되고
> `coalesce(..., 0)`이 이를 0으로 바꿔서, **전 법인의 배당가능금액이 조용히 0원으로**
> 표시됐습니다. 에러도 로그도 남지 않았습니다.
>
> 그래서 지금은 `get_dividend_detail`이 계정 존재 여부를 먼저 확인하고,
> 없으면 0 대신 `accountMissing: true`를 돌려줘 화면이 경고를 띄웁니다.

### 마이그레이션 실행

2026-09 변경분은 `migration_2026-09_bs_cf_link.sql`에 함수만 따로 모아두었습니다.
`schema.sql` 전체를 다시 실행해도 되지만, 바뀐 부분만 올리려면 이 파일을 쓰세요.

**SQL Editor에서 반드시 New query로 여세요.** 저장해둔 예전 스니펫을 재실행하면 옛 함수
본문이 그대로 올라갑니다.

배포 확인:

```sql
select
  (select prosrc like '%CF-56%'  from pg_proc where proname = 'fund_account_codes') as cf56_ok,
  (select prosrc like '%BS-R55%' from pg_proc where proname = 'fund_account_codes') as bsr55_ok,
  (select prosrc not like '%BS-R67%' from pg_proc where proname = 'get_dividend_available') as r67_removed,
  (select count(*) from pg_proc where proname = 'get_fund_reconciliation') as recon_added;
```

⚠ `r67_removed`는 "없어야 정상"이라 **true가 기대값**입니다. 조건 방향에 주의하세요.

## 4-1. 잔액 계산 방식 (2026-09 변경)

기초·기말잔액은 **지점이 제출한 BS/CF에서만** 나옵니다. 본사 수기 확정값
(`set_cash_position`)은 계산에 쓰이지 않고 "본사가 다르게 확정했다"는 기록으로만 남습니다.

| 항목 | 출처 |
|---|---|
| 기초잔액 | **전월** BS 현금성자산 (없으면 당월 `CF-58`+`CF-60`) |
| CF 순증감 | 당월 `CF-56` (없으면 유입−유출+환율 검산값) |
| 기말잔액 | **당월** BS 현금성자산 |

회계 항등식 `기초 + 순증감 = 기말`이 성립해야 하며, 관리자 화면의 대사 표가 이 차이를
법인·지점 단위로 보여줍니다. 차이가 0이 아닌 행이 곧 확인 대상입니다.
한쪽이 아직 미제출이면 0이 아니라 **판정보류**로 표시합니다.

## 5. 캐시풀링 법인 안내

YJC 포워딩·흥아물류는 캐시풀링(매일 마감 후 은행잔고 본사 자동 송금) 적용 법인입니다. 이 목록은
DB가 아니라 `docs/js/config.js`의 `CASH_POOLED_CORPORATIONS` 배열로 관리되므로, 대상 법인이
바뀌면 코드 배포만으로 반영됩니다.
