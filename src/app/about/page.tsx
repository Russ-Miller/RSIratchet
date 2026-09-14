import Link from "next/link";
import { getCapabilities, getClaims, getSources, getTechniques, isPending } from "@/lib/catalog";

export const metadata = { title: "About" };

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{n}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}

export default function HowThisWorksPage() {
  const claims = getClaims();
  const pending = claims.filter(isPending);
  const sources = getSources();
  const byKind = sources.reduce<Record<string, number>>((m, s) => ({ ...m, [s.kind]: (m[s.kind] ?? 0) + 1 }), {});

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">About</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          This is an index of what language models are good and bad at, organised by capability
          rather than by what is new. Every claim links to the sources it came from, and where
          the evidence disagrees, both sides are kept.
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Every entry records who has read it &mdash; a model, or a model and a person &mdash; so
          you can judge any entry for yourself, because how it got here is written on it.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 rounded border border-neutral-200 p-4 sm:grid-cols-4 dark:border-neutral-800">
        <Stat n={getCapabilities().length} label="capabilities" />
        <Stat n={claims.length} label="claims" />
        <Stat n={sources.length} label="sources" />
        <Stat n={getTechniques().length} label="techniques" />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Where entries come from</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          A nightly job queries OpenAlex for new arXiv papers, filters them to work that is
          plausibly about a capability tracked here, and asks a model to judge whether each paper
          is genuinely about that capability and whether it supports or cuts against something
          already filed. Papers that survive get read in full, and a model drafts a proposed
          claim from them.
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Those claims enter the catalog marked{" "}
          <strong className="font-medium text-neutral-800 dark:text-neutral-200">Reviewed by AI</strong>.
          They appear in lists, counts, search and the contested view like anything else, because
          an index is useful as soon as it exists. The one thing a person&rsquo;s review adds is
          weight: only claims marked{" "}
          <strong className="font-medium text-neutral-800 dark:text-neutral-200">Reviewed by AI and a person</strong>{" "}
          decide whether a technique is judged to work, or count in the internal scorecard that
          tracks whether this catalog is getting things right.
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Other entries were filed by hand, usually from well-known papers, when the structure of
          the catalog was being worked out.
        </p>
        <p className="text-xs text-neutral-500">
          Right now: {pending.length} of {claims.length} claims are reviewed by AI, and{" "}
          {claims.length - pending.length} by AI and a person. Many will stay AI-reviewed. There
          is more worth indexing than one person can read, so that is a normal permanent state
          here, not a queue waiting to be cleared.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">What a claim carries</h2>
        <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
          <li>
            <strong className="font-medium text-neutral-800 dark:text-neutral-200">Its scope, inside the sentence.</strong>{" "}
            Which models, which tasks, which setup. A claim without its scope condition gets
            misapplied, so the condition is written into the statement rather than appended.
          </li>
          <li>
            <strong className="font-medium text-neutral-800 dark:text-neutral-200">Whether it is durable or perishable.</strong>{" "}
            A <em>mechanism</em> claim explains why something happens and tends to outlive a model
            generation. An <em>observation</em> describes how some model or era behaves and is
            expected to go stale.
          </li>
          <li>
            <strong className="font-medium text-neutral-800 dark:text-neutral-200">How well it is backed</strong>{" "}
            &mdash; one paper, replicated across independent work, argued from how something works
            without anyone measuring it, or someone&rsquo;s own observation. This is a category, not
            a score, and nothing here is ranked.
          </li>
          <li>
            <strong className="font-medium text-neutral-800 dark:text-neutral-200">Its sources, and their side.</strong>{" "}
            Each source is marked as supporting or contesting. A{" "}
            <Link href="/claims?filter=contested" className="underline">contested</Link> claim keeps both, plus a
            written guess at why the evidence disagrees.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">What sources are, and what they are worth</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr><th className="py-1 pr-6">Kind</th><th className="py-1 pr-6">Count</th><th className="py-1">Treated as</th></tr>
            </thead>
            <tbody className="text-neutral-600 dark:text-neutral-400">
              <tr className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="py-2 pr-6">paper</td><td className="py-2 pr-6">{byKind.paper ?? 0}</td>
                <td className="py-2">Published or preprint work. Titles are checked against arXiv.</td>
              </tr>
              <tr className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="py-2 pr-6">vendor-doc</td><td className="py-2 pr-6">{byKind["vendor-doc"] ?? 0}</td>
                <td className="py-2">
                  Guidance from whoever builds the model. Privileged about its own product, weak on
                  efficacy (the evaluations are not visible), and interested. Never counted as
                  replication.
                </td>
              </tr>
              <tr className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="py-2 pr-6">post</td><td className="py-2 pr-6">{byKind.post ?? 0}</td>
                <td className="py-2">
                  Informal writing. Good for what practitioners believe and for negative results
                  nobody publishes. Can raise a claim; cannot strongly back one.
                </td>
              </tr>
              <tr className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="py-2 pr-6">observation</td><td className="py-2 pr-6">{byKind.observation ?? 0}</td>
                <td className="py-2">Something noticed directly rather than read.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Anything that can be edited or deleted after the fact &mdash; a post, a vendor page, a
          PDF served from a repository &mdash; is archived here verbatim, and a nightly check
          re-reads the original and reports when it stops matching. A citation should not be able
          to quietly stop meaning what it meant.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">What this gets wrong</h2>
        <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
          <li>
            <strong className="font-medium text-neutral-800 dark:text-neutral-200">Coverage is uneven.</strong>{" "}
            Some capabilities have several claims and some have none. A thin page means nobody has
            filed here yet, never that there is nothing to know.
          </li>
          <li>
            <strong className="font-medium text-neutral-800 dark:text-neutral-200">Machine-drafted claims can be wrong in confident-sounding ways.</strong>{" "}
            Numbers in a draft are checked against the source text automatically, and anything that
            fails is flagged on the claim &mdash; but a fluent, plausible, mistaken summary passes
            that check.
          </li>
          <li>
            <strong className="font-medium text-neutral-800 dark:text-neutral-200">Almost nothing here has been contested by anyone outside.</strong>{" "}
            Both sides of a contested claim were assembled by the same reader. That is the weakest
            part of the whole thing.
          </li>
          <li>
            <strong className="font-medium text-neutral-800 dark:text-neutral-200">The index is one person&rsquo;s reading.</strong>{" "}
            What gets filed reflects what one person went looking for, which is a bias no amount of
            structure removes.
          </li>
        </ul>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          None of that is a reason to present the contents with more confidence than they have. It
          is the reason every entry shows its sources, its backing, and how it arrived &mdash; so
          you can decide, rather than being asked to trust.
        </p>
      </section>

      <section className="space-y-2 border-t border-neutral-200 pt-6 text-sm dark:border-neutral-800">
        <p className="text-neutral-600 dark:text-neutral-400">
          Everything is plain YAML in a public git repository, so the history of any entry &mdash;
          when it was filed, what changed, and why &mdash; is readable.{" "}
          <a href="https://github.com/Russ-Miller/RSIratchet" target="_blank" rel="noopener noreferrer" className="underline">See the repository</a>.
        </p>
      </section>
    </div>
  );
}
