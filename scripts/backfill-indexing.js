require("dotenv").config();

const { notifyGoogle } = require("../lib/indexing");

const COBURG_JOBS_BASE_URL = "https://www.coburgbanks.co.uk/job-opportunities";
const PAGE_SIZE = 100;
const PAUSE_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildCoburgJobUrl(slug) {
  return `${COBURG_JOBS_BASE_URL}/${slug}`;
}

function getItemSlug(item) {
  return item?.fieldData?.slug || item?.slug || null;
}

function isLiveJob(item) {
  const archived = item?.isArchived ?? item?._archived ?? item?.fieldData?._archived;
  const draft = item?.isDraft ?? item?._draft ?? item?.fieldData?._draft;
  return !archived && !draft;
}

async function fetchAllWebflowItems() {
  const allItems = [];
  let offset = 0;

  while (true) {
    const response = await fetch(
      `https://api.webflow.com/v2/collections/${process.env.WEBFLOW_CB_COLLECTION_ID}/items?limit=${PAGE_SIZE}&offset=${offset}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${process.env.WEBFLOW_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Webflow list items failed (${response.status}): ${await response.text()}`
      );
    }

    const json = await response.json();
    const pageItems = Array.isArray(json.items) ? json.items : [];
    allItems.push(...pageItems);

    if (pageItems.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return allItems;
}

async function runBackfill() {
  if (!process.env.WEBFLOW_CB_COLLECTION_ID || !process.env.WEBFLOW_TOKEN) {
    throw new Error(
      "Missing WEBFLOW_CB_COLLECTION_ID or WEBFLOW_TOKEN environment variables"
    );
  }

  const items = await fetchAllWebflowItems();
  const urls = items
    .filter(isLiveJob)
    .map(getItemSlug)
    .filter(Boolean)
    .map(buildCoburgJobUrl);

  console.log(`Found ${urls.length} URLs to notify`);

  for (const url of urls) {
    try {
      await notifyGoogle(url, "URL_UPDATED");
      console.log("pinged", url);
    } catch (error) {
      console.error("failed", url, error.message);
    }
    await sleep(PAUSE_MS);
  }
}

runBackfill().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
