import Link from "next/link";

export const metadata = { title: "Sign in" };

// A plain HTML form posting to the login route: no client state, works
// without JavaScript, and the browser's password manager understands it.
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/", error } = await searchParams;
  const target = next.startsWith("/") ? next : "/";
  return (
    <div className="max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-sm text-neutral-500">
        The pages past Adages are the maintainer&rsquo;s working views. Everything else on the
        site is open.
      </p>
      {error && (
        <p className="rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          That email and password did not match.
        </p>
      )}
      <form method="post" action="/api/login" className="space-y-3">
        <input type="hidden" name="next" value={target} />
        <label className="block text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">Email</span>
          <input id="email" name="email" type="email" autoComplete="username" required
            className="mt-1 w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-base dark:border-neutral-700" />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">Password</span>
          <input id="password" name="password" type="password" autoComplete="current-password" required
            className="mt-1 w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-base dark:border-neutral-700" />
        </label>
        <button type="submit" className="rounded border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900">
          Sign in
        </button>
      </form>
      <p className="text-xs text-neutral-500">
        Forgotten password: run <code className="font-mono">npm run admin:password</code> on the machine
        with the checkout to set a new one. Reset by email is not set up.{" "}
        <Link href="/" className="underline">Back to the catalog</Link>.
      </p>
    </div>
  );
}
