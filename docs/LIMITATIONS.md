# Limitations

- Heuristic analysis can miss domain-specific language.
- Side-effect prohibitions and approval scope are recognized with clause-level
  text heuristics, not a full natural-language parser.
- Absolute-path checks inspect prose and exclude URLs and inline/fenced code;
  paths under uncommon POSIX roots can still require manual review.
- Symbolic links are not audited; place Markdown files directly in the skill tree to include them.
- Outputs are review aids, not authorization to act.
- Fixtures cover common cases and should grow with real use.
