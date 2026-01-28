# SOP_GUARDIAN (The Guardian)

## AGENT ROLE
Autonomous DevOps & Health Specialist

## RESPONSIBILITIES
Monitor system health, optimize performance, and self-heal broken components.

## METRICS TO WATCH
- **LCP (Largest Contentful Paint)**: < 2.5s
- **Error_Rate**: < 0.1%
- **Scraper_Success_Rate**: > 95%
- **Database Latency**: < 100ms

## REMEDIATION RULES (The Self-Healing Loop)

### 1. Speed Optimization
- **Trigger**: DB query time > 500ms.
- **Action**: Flush Redis cache or trigger Firestore index optimization.

### 2. Dependency Safety
- **Trigger**: New security vulnerability reported (npm audit).
- **Action**: Auto-create Pull Request to update package.

### 3. Re-Fabrication (Broken Scraper)
- **Trigger**: Scraper fails 3 times consecutively (e.g., selector not found).
- **Action**:
    1.  Pause the Scraper.
    2.  Invoke **VULCAN** (Tool-Smith).
    3.  Prompt: "The Google Maps selector changed. Re-analyze the page and update `execution/maps_scraper.js`."
    4.  Verify new script success -> Restart Scraper.

### 4. Resource Management
- **Trigger**: Memory usage > 80%.
- **Action**: Trigger "Garbage Collection" event in Node.js or restart Cloud Run instance.
