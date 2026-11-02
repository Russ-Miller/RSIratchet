/** A reading principle, with citations to the original research. */
export function TestTheFit() {
  return (
    <aside className="application-note mb-6" aria-label="Test the fit for your model and workload">
      <h3 className="text-base font-semibold">Your model. Your workload. Test the fit.</h3>
      <p className="text-sm">
        A technique that helps one agent can add cost or reduce accuracy in another.
        Use these heuristics as starting points, then test them with your model,
        workload, and budget. Share the results, including where the advice fails.
      </p>
      <p className="mt-2 text-xs text-neutral-500">
        Research on model and workload differences:{" "}
        <a className="underline underline-offset-4" href="https://arxiv.org/abs/2609.20804">Harness Design for Coding Agents</a>
        {" · "}
        <a className="underline underline-offset-4" href="https://arxiv.org/abs/2609.01437">HarnessDev</a>.
      </p>
    </aside>
  );
}
