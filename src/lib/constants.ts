export const SMART_SCRAPER_PROMPT = `
Analyze this website content for "{businessName}" ({websiteUrl}).

Content Snippet:
{content}... 

Task:
1. Identify the Top 5 SEO Keywords they are likely targeting based on this text.
2. Write a 1-sentence "Business Summary" of what they actually do.
3. Identify 3 "Missing Content Opportunities" (e.g. "No FAQ section", "No case studies").

Output JSON format only with fields: summary, keywords (array), opportunities (array).
`;

export const HEADHUNTER_PROMPT = `
Analyze this "About Us" or "Team" page content.
Identify the Name and Job Title of the owner, founder, or principal.
Return JSON: { "name": "FullName", "title": "JobTitle" }
`;
