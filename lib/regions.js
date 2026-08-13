const fs = require("fs");
const path = require("path");

const REGIONS = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/uk_town_region.json"), "utf8")
);

function normaliseTownName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\./g, " ")
    .replace(/['’]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function regionForTown(town) {
  return REGIONS[normaliseTownName(town)] || null;
}

module.exports = {
  regionForTown,
};
