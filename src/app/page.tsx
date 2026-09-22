import Link from "next/link";
import { loadCatalog, capabilitiesByGroup, claimsByRecency, getCapability, getSources, isPending, isProposed, ratchetTechniques } from "@/lib/catalog";
import { KindBadge, StrengthBadge, ContestedBadge, ReviewBadge, ProposedBadge } from "@/components/badges";
import { getTil } from "@/lib/til";
import { ModelStrip } from "@/components/model-strip";
import { buildSearchIndex } from "@/lib/search-index";
import { Search } from "@/components/search";

export default function Home() {
  const cat = loadCatalog();
  const groups = capabilitiesByGroup();
  const recent = claimsByRecency().slice(0, 6);
  const pending = cat.claims.filter(isPending).length;
  const til = getTil();
  const index = buildSearchIndex();
  const ratchetSources = getSources().filter((x) => (x.tags ?? []).includes("ratchet")).length;
  const gates = ratchetTechniques().filter((t) => t.ratchet_role === "gate").length;
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">A study of what LLMs are actually good and bad at</h1>
        <p className="max-w-2xl text-neutral-600 dark:text-neutral-400">
          Not a scoreboard &mdash; a set of directional, scoped claims, each tied to the sources that
          support or contest it.
        </p>
        {/* The site is named for a claim; a first visit should say which one. */}
        <p className="max-w-2xl text-neutral-600 dark:text-neutral-400">
          A <em>ratchet</em> is a fix that cannot slip back: placed in structure, it applies on every
          later run, while a fix given in conversation dies with the session. That is what this catalog
          is for and what it is named after.{" "}
          <Link href="/ratchet" className="underline">The ratchet</Link> collects the {ratchetSources} sources
          on systems that try to build one, and the {gates} techniques that decide what a loop keeps.
        </p>
        <ModelStrip />
        {/* A visitor should meet the caveat on arrival, not discover it later. The
            whole proposition is that you can judge an entry yourself, which only
            works if you know what you are looking at. */}
        <p className="max-w-2xl text-sm text-neutral-500">
          Every claim says who has read it: {pending} of {cat.claims.length} were reviewed by AI,
          the rest by AI and a person. A person&rsquo;s review is what lets a claim count toward a
          technique&rsquo;s standing.{" "}
          <Link href="/about" className="underline">How this is collected</Link>.
        </p>
        <div className="max-w-2xl pt-2">
          <Search index={index} />
          <p data-browse className="mt-2 text-xs text-neutral-500">
            Searches everything in the catalog. Runs in your browser.
          </p>
        </div>
      </section>

      {til && (
        <section data-browse className="space-y-3 rounded border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-lg font-semibold">Worth a look</h2>
            <span className="text-xs text-neutral-500">
              {til.picked_at} &middot; {til.why}
            </span>
          </div>
          <div>
            <a href={til.source.url ?? "#"} target="_blank" rel="noopener noreferrer"
              className="font-medium hover:underline">{til.source.title}</a>
            {til.source.authors?.length ? (
              <div className="text-xs text-neutral-500">
                {til.source.authors[0]}{til.source.authors.length > 1 ? " et al." : ""}
                {til.source.year ? `, ${til.source.year}` : ""}
              </div>
            ) : null}
          </div>
          {til.source.brief ? (
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {til.source.brief.split(/\n\s*\n/)[0]}
            </p>
          ) : til.source.summary ? (
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{til.source.summary}</p>
          ) : null}
          {til.claims.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Claims drawn from it
              </h3>
              {/* Badges are inline, at the head of the sentence, so they wrap
                  with the text they describe. A badge on its own line between
                  two paragraphs reads as belonging to either. */}
              <ul className="space-y-2 text-sm">
                {til.claims.map((c) => (
                  <li key={c.id} className="leading-relaxed">
                    {c.contested && <><ContestedBadge />{" "}</>}
                    <ReviewBadge claim={c} />{" "}
                    <Link href={`/claims/${c.id}`} className="hover:underline">{c.statement}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-neutral-500">
            <Link href={`/sources/${til.source.id}`} className="hover:underline">the source in full</Link>
            {til.hn_url && <> &middot; <a href={til.hn_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{til.hn_points} points on Hacker News</a></>}
            {" "}&middot; featured as something worth reading, not as something judged correct
          </p>
        </section>
      )}

      <section data-browse className="space-y-2">
        <h2 className="text-lg font-semibold">Most recently checked claims</h2>
        <ul className="space-y-2">
          {recent.map((c) => (
            <li key={c.id} className="rounded border border-neutral-200 dark:border-neutral-800 p-3">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <KindBadge kind={c.kind} />
                <StrengthBadge strength={c.backing_strength} />
                {c.contested && <ContestedBadge />}
                <span className="text-xs text-neutral-500">checked {c.last_checked_at}</span>
              </div>
              <Link href={`/claims/${c.id}`} className="hover:underline">{c.statement}</Link>
              <div className="text-xs text-neutral-500 mt-1">
                <Link href={`/capabilities/${c.capability}`} className="hover:underline">{getCapability(c.capability)?.label ?? c.capability}</Link>
              </div>
            </li>
          ))}
        </ul>
        <Link href="/claims" className="text-sm hover:underline">All claims &rarr;</Link>
      </section>

      {groups.map(({ group, capabilities }) => (
        <section key={group.id} data-browse className="space-y-2">
          <h2 className="text-lg font-semibold">{group.label}</h2>
          <p className="text-sm text-neutral-500">{group.description}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {capabilities.map((c) => (
              <li key={c.id} className="rounded border border-neutral-200 dark:border-neutral-800 p-3">
                <Link href={`/capabilities/${c.id}`} className="font-medium hover:underline">{c.label}</Link>
                {isProposed(c) && <> <ProposedBadge /></>}
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{c.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
