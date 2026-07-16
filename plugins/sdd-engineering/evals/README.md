# Evals

Manual. There is no automated gate — nothing in CI reads this directory, and no `SKILL.md`
loads it. A human runs these before a release and pastes the results in the PR, per
[docs/PLUGIN-GUIDELINES.md](../../../docs/PLUGIN-GUIDELINES.md).

## What these test

Not "does the pipeline produce a spec" — it always produces a spec. Every case here tests
a moment where the *correct* behaviour is to stop, ask, or refuse. Those are the ones that
regress silently: a pipeline that invents an answer still returns something plausible, and
you only find out at review, which is exactly the failure this plugin exists to prevent.

So each case is scored on what the run **refused to do**.

## No fixtures in this directory

Run the cases against a real repository you already have. This is deliberate: an earlier
version of `engineering-paved-path` shipped eval fixtures modelled on the product its
skills were extracted from, which handed every installer another team's domain code as
reference material. They were dropped ([its CHANGELOG](../../engineering-paved-path/CHANGELOG.md)),
and this directory does not reintroduce the pattern. A case describes the *shape* of repo
it needs; you supply one.

## Running one

1. Install the plugin and its dependencies (see [COMPATIBILITY.md](../COMPATIBILITY.md)).
2. `cd` into a repo matching the case's **Repo shape**.
3. Run the **Input** verbatim.
4. Score **Pass** only if every bullet under **Passes when** holds. Any bullet under
   **Fails when** is a fail even if the output looks good — these are the plausible wrong
   answers, and "it read well" is how they survive.
5. Record the result in the PR: case ID, pass/fail, and the quoted line that decided it.

A fail is not automatically a blocker. It is a finding: fix the agent brief, or record why
the behaviour is acceptable. What is not acceptable is not knowing.

See [cases.md](cases.md).
