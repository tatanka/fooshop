import open from "open";

export async function openBrowser(url: string): Promise<void> {
  try {
    await open(url);
  } catch {
    // If open fails (e.g., no display), print the URL for manual copy
    console.log(`\nOpen this URL in your browser:\n  ${url}\n`);
  }
}
