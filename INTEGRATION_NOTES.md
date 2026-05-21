# Integration Notes

## Clerk Auth (DONE)
- `@clerk/nextjs` installed and wired
- Root layout wrapped with `<ClerkProvider>`
- `use-auth.ts` uses Clerk's `useUser()` hook; wallet address from `clerkUser.web3Wallets[0]`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in env (replace placeholder values)
- Login page: `apps/web/src/app/sign-in/[[...sign-in]]/page.tsx` uses `<SignIn>`
- Register page: `apps/web/src/app/sign-up/[[...sign-up]]/page.tsx` uses `<SignUp>`
- After sign-up: `apps/web/src/app/onboarding/page.tsx` saves user to DB with role
- Wallet connect: optional, via Clerk's web3 integration (wagmi kept for on-chain txns)

## Celo Sepolia Deploy or other network (TODO)
- Add `CELO_SEPOLIA_RPC_URL` to env
- Add `DEPLOYER_PRIVATE_KEY` to env
- Run: `pnpm --filter contracts deploy:celo`
- Update `NEXT_PUBLIC_` contract addresses in env
