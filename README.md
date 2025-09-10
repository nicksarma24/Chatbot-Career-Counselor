This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Supabase Setup

1) Create a Supabase project and set env vars in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

2) Create tables in Supabase SQL editor:

```sql
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_sessions_created_at_idx on public.chat_sessions(created_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_session_id_idx on public.messages(session_id);
create index if not exists messages_created_at_idx on public.messages(created_at);
```

Open `/chat` to use the chat UI.

## AI Provider (Cohere)

Set your Cohere API key in `.env.local`:

```
COHERE_API_KEY=your_cohere_key
```

- Non‑streaming endpoint: `POST /api/messages` (persists user + assistant)
- Streaming endpoint: `POST /api/messages/stream` (returns full text in one chunk; persists assistant)
- If the key is missing or a provider error occurs, a local fallback message is used.

Restart the dev server after changing env vars.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Attachin the screenshot: 
<img width="1364" height="975" alt="image" src="https://github.com/user-attachments/assets/9515321d-4b15-48ee-a64a-8126cb0e3d98" />
