# Limitations

- Heuristic analysis can miss domain-specific language.
- Side-effect prohibitions and approval scope are recognized with clause-level
  text heuristics, not a full natural-language parser. The `post` action and its
  `posts`, `posted`, and `posting` forms are detected, while hyphenated compounds
  such as `post-processing` are treated as non-action vocabulary. A forward "approval is
  required before" phrase governs actions after the phrase; it does not suppress
  findings for earlier actions in the same clause.
- Absolute-path checks inspect prose and exclude URLs and inline/fenced code;
  paths under uncommon POSIX roots can still require manual review.
- Symbolic links are not audited; place Markdown files directly in the skill tree to include them.
- Outputs are review aids, not authorization to act.
- Fixtures cover common cases and should grow with real use.
