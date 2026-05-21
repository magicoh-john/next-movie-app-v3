/**
 * [전체 앱에서의 역할]
 * 이 파일은 PostgreSQL 데이터베이스와의 연결을 관리하는 핵심 유틸리티입니다.
 * 'pg' 라이브러리의 Pool 객체를 생성하여 내보내며, 앱 전체에서 DB 쿼리가 필요할 때 이 Pool을 사용합니다.
 *
 * 특히, Next.js 개발 환경(Hot Reload)에서 코드가 변경될 때마다 DB 연결 객체가
 * 무한히 새로 생성되어 커넥션 제한을 초과하는 문제(Connection Leak)를 방지하기 위해,
 * globalThis(전역 객체)를 활용한 '싱글톤(Singleton)' 패턴으로 구현되어 있습니다.
 */

import { Pool } from "pg";

// 개발 중 Hot Reload 시 Pool이 중복 생성되는 것을 방지합니다.
// process.env.NODE_ENV가 'production'이 아니면(= 개발 환경이면)
// 처음 만든 Pool을 전역 변수에 저장해 재사용합니다.
const globalForDb = globalThis as unknown as { pool: Pool | undefined };

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export default pool;
