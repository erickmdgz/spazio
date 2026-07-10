# Guide for AI Usage in Development

## Principle

AI can accelerate development, but it must not replace product, architecture, security, or business decisions.

## Tasks AI can support

- Generate initial code.
- Create repetitive components.
- Suggest folder structures.
- Write tests.
- Detect common errors.
- Refactor code.
- Draft initial technical documentation.
- Explain existing code.
- Propose technical alternatives.

## Tasks that must be decided by humans

- Which problem is going to be solved.
- Which features are actually necessary.
- What is out of scope.
- Which data is going to be stored.
- Which permissions each user must have.
- Which risks are acceptable.
- Which technical decisions are suitable for the project.
- What is considered done.
- What is released to production.

## Rules for AI prompts

Every technical prompt must include:

1. Project context.
2. Affected file or module.
3. Related requirement.
4. Constraints.
5. Expected result.
6. What must not be modified.
7. Acceptance criteria.

## AI prompt template

See `templates/template_ai_prompt.md`.

## Human review rules

Before accepting AI-generated code:

- [ ] I understand what the code does.
- [ ] The code corresponds to the requirement.
- [ ] It does not add unnecessary complexity.
- [ ] It does not introduce dependencies without need.
- [ ] It does not expose secrets.
- [ ] It does not break existing flows.
- [ ] It has basic error handling.
- [ ] It has tests or a clear way to be validated.
- [ ] It is documented if it changes important behavior.
