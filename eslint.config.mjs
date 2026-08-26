import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // The service-role Supabase client (src/lib/supabase/service.ts) bypasses RLS
    // entirely — it must never end up in a browser bundle. .tsx files are where
    // 'use client' components live in this codebase; service.ts itself also
    // guards with a runtime `typeof window !== 'undefined'` throw and a
    // `server-only` import, per specs/002-auth-tenancy-billing/plan.md.
    files: ["**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/service",
              message:
                "The service-role Supabase client bypasses RLS and must never be imported into a client component.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
