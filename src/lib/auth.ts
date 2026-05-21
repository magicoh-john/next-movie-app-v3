import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { loginSchema } from "@/schemas/auth.schema";
import { checkRateLimit, recordFailure, resetFailure } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

// DB에서 조회한 users 행의 타입
interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const { blocked } = checkRateLimit(email);
        if (blocked) {
          logger.warn(`[auth] 로그인 차단됨 (Rate Limit 초과): ${email}`);
          return null;
        }

        // DB에서 이메일로 사용자 조회
        // $1은 플레이스홀더 — SQL Injection 방지
        const { rows } = await pool.query<DbUser>(
          "SELECT id, email, name, password_hash FROM users WHERE email = $1",
          [email],
        );
        const user = rows[0];

        if (!user) {
          recordFailure(email);
          logger.warn(`[auth] 로그인 실패 (없는 이메일): ${email}`);
          return null;
        }

        // ⚠️ 평문 비교 — 임시 방법입니다
        // step-08에서 bcrypt.compare() 로 교체합니다
        // 수정 후
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
          recordFailure(email);
          logger.warn(`[auth] 로그인 실패: ${email}`);
          return null;
        }

        resetFailure(email);
        logger.log(`[auth] 로그인 성공: ${email}`);

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
});
