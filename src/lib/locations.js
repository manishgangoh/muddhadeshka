import { getConfig } from "./feeds.js";

export function citySlug(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
export const stateSlug = citySlug;

// Flat list of all states: { slug, code, name_hi, name_en, cities: [name...] }
export function getStates() {
  return getConfig().states.map((s) => ({
    slug: stateSlug(s.name_en),
    code: s.code,
    name_hi: s.name_hi,
    name_en: s.name_en,
    cities: s.cities,
  }));
}

// Flat list of all cities: { slug, name, stateSlug, stateName_hi }
export function getCities() {
  const out = [];
  for (const s of getStates()) {
    for (const c of s.cities) {
      out.push({ slug: citySlug(c), name: c, stateSlug: s.slug, stateName_hi: s.name_hi });
    }
  }
  return out;
}

export function findCity(slug) {
  return getCities().find((c) => c.slug === slug) || null;
}
export function findState(slug) {
  return getStates().find((s) => s.slug === slug) || null;
}
