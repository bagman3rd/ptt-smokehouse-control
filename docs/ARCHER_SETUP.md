# Archer chatbot setup

Archer works in built-in help mode without an OpenAI key. To enable AI answers:

1. Create an OpenAI API project and API key.
2. Add `OPENAI_API_KEY` to the Render service environment. Never commit it to GitHub.
3. Set `ARCHER_OPENAI_MODEL` to an available low-cost text model. The default is `gpt-5-mini`.
4. Set a project budget and usage alert in the OpenAI platform.
5. Redeploy Render and test Archer while logged in as each role.

Optional controls:
- `ARCHER_MAX_OUTPUT_TOKENS=350`
- `ARCHER_REQUESTS_PER_MINUTE=12`

Archer sends the current page, role, the current question, and up to six recent messages. It does not send passwords, tokens, database IDs, or other restaurant data. OpenAI response storage is disabled in the API request.
