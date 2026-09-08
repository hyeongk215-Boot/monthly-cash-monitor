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

## 4. 배당가능금액 계산 기준 계정 확인 (중요)

`get_dividend_available` 함수는 회계관리 `acct_accounts`의 **미처분이익잉여금 계정 코드**를
하드코딩으로 참조합니다 (현재 `BS-R67` — 회계관리의 실제 COA 기준). 회계관리에서 계정과목을 다시
교체하면, 이 함수도 **새 코드에 맞게 다시 실행**해야 합니다:

```sql
-- 예: 실제 코드가 'BS-095'라면
create or replace function get_dividend_available(...) ... where ... account_code = 'BS-095'; ...
```
(`schema.sql`에서 해당 함수 전체를 복사해 코드만 바꿔서 재실행하세요.)

## 5. 캐시풀링 법인 안내

YJC 포워딩·흥아물류는 캐시풀링(매일 마감 후 은행잔고 본사 자동 송금) 적용 법인입니다. 이 목록은
DB가 아니라 `docs/js/config.js`의 `CASH_POOLED_CORPORATIONS` 배열로 관리되므로, 대상 법인이
바뀌면 코드 배포만으로 반영됩니다.
