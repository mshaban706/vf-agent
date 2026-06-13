/** Polar Insulation client intelligence — used when client/sheet matches. */
export const POLAR_INSULATION_PROFILE = {
  slug: 'polar-insulation',
  name: 'Polar Insulation',
  website: 'polarinsulation.us',
  industry: 'Insulation / Home Services',
  hub_location: 'Wewahitchka, FL',
  radius_miles: 150,
  services: [
    'Spray foam insulation',
    'Attic insulation',
    'Crawlspace encapsulation',
    'Blown-in insulation',
    'Commercial insulation',
    'New construction insulation',
    'Metal building / pole barn insulation',
  ],
  regions: [
    'Gulf County',
    'Panama City Metro',
    'Tallahassee Region',
    'Dothan-Wiregrass',
    'Albany-SW Georgia',
  ],
  cities: [
    'Wewahitchka',
    'Gulf County',
    'Port St. Joe',
    'Apalachicola',
    'Mexico Beach',
    'Panama City',
    'Panama City Beach',
    'Lynn Haven',
    'Tallahassee',
    'Dothan AL',
    'Albany GA',
    'Thomasville GA',
    'Marianna',
    'Destin',
    'Fort Walton Beach',
  ],
  sheet_tabs: [
    'Roadmap',
    'Master Clusters',
    'Gulf County',
    'Panama City Metro',
    'Tallahassee Region',
    'Dothan-Wiregrass',
    'Albany-SW Georgia',
    'AEO-GEO Question Bank',
    'Landing Pages',
    'Service Pages',
    'Blog Calendar',
    'On-Page & Schema',
    'KPIs',
    'Next Steps & Risks',
    'Source Notes',
  ],
  strategic_risks: [
    '150-mile radius creates weak local relevance for near-me and city-intent queries if relying on one service-area signal.',
    'Recommend phased expansion: dominate 50-mile core first, then expand with dedicated city/service pages and local proof.',
    'Source Notes tab indicates volumes/difficulty are estimates — validate before client-facing use.',
  ],
};

export function isPolarInsulationContext(clientName?: string, fileName?: string): boolean {
  const n = (clientName ?? '').toLowerCase();
  const f = (fileName ?? '').toLowerCase();
  return n.includes('polar') || f.includes('polar_insulation') || f.includes('polar insulation');
}

export function getPolarContextBlock(): string {
  const p = POLAR_INSULATION_PROFILE;
  return `POLAR INSULATION CLIENT PROFILE (apply when relevant):
Business: ${p.name} — ${p.industry}
Hub: ${p.hub_location} | Radius: ${p.radius_miles} miles | Website: ${p.website}
Services: ${p.services.join('; ')}
Target Regions: ${p.regions.join('; ')}
Target Cities: ${p.cities.join(', ')}
Expected Sheet Tabs: ${p.sheet_tabs.join(', ')}
Strategic Risks: ${p.strategic_risks.join(' ')}`;
}
