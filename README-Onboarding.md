A. Supabase

Create a new Supabase project for the city.

Create the three tables (or run your schema SQL):

budgets

actuals

transactions

Set the same columns you’re using now.

Set up RLS policies if you want, or leave open for now for the anon key.

Use the admin upload UI to load:

budgets CSV

actuals CSV

transactions CSV

B. Vercel (or wherever you deploy)

Create a new project from the same GitHub repo.

Set environment variables:

NEXT_PUBLIC_SUPABASE_URL – from Supabase project

NEXT_PUBLIC_SUPABASE_ANON_KEY – from Supabase project

NEXT_PUBLIC_CITY_SLUG – e.g. springfield

NEXT_PUBLIC_CITY_NAME – e.g. City of Springfield

NEXT_PUBLIC_CITY_TAGLINE – e.g. Open budget and spending transparency

Deploy.

C. DNS / URL

Point a domain or subdomain (e.g. budget.springfield.gov) to that Vercel project.

Users hit that URL and see their city’s name, tagline, and data.