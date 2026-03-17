# ETF Monte Carlo Planner

Browser-only Monte Carlo simulator for an S&P 500 investing strategy. The app:

- loads a fixed historical monthly dataset committed with the repo
- shows the return distribution behind the model
- simulates long-term investing with monthly contributions
- reports percentiles, target-hit probabilities, and confidence floors
- deploys directly to GitHub Pages

## Local development

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Run tests:

```bash
npm test
```

4. Build the production bundle:

```bash
npm run build
```

## Publish to GitHub

1. Create a new empty GitHub repository.
2. Initialize Git locally if needed:

```bash
git init
git add .
git commit -m "Initial ETF Monte Carlo app"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

3. In GitHub, open `Settings -> Pages` and set the source to `GitHub Actions`.
4. Pushes to `main` will trigger `.github/workflows/deploy.yml`.
5. After the workflow finishes, the site will be available on your GitHub Pages URL.

## Data notes

- Historical data file: `public/data/sp500-shiller.csv`
- Source: [datasets/s-and-p-500](https://github.com/datasets/s-and-p-500)
- The app uses monthly price change plus a simple monthly dividend proxy to build the simulation return distribution.
