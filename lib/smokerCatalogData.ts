export type SmokerCatalogSeed = {
  brand: string;
  model: string;
  series?: string;
  smokerType: string;
  fuelType: string;
  rackCount?: number | null;
  rackWidthIn?: number | null;
  rackDepthIn?: number | null;
  cookingAreaSqIn?: number | null;
  brisketCapacity?: number | null;
  porkCapacity?: number | null;
  ribCapacity?: number | null;
  chickenCapacity?: number | null;
  cookWindow?: string;
  notes?: string;
  officialCapacityText?: string;
  brisketCapacityUnit?: 'COUNT' | 'LB' | 'RANGE' | 'NOT_PUBLISHED';
  porkCapacityUnit?: 'COUNT' | 'LB' | 'RANGE' | 'NOT_PUBLISHED';
  ribCapacityUnit?: 'COUNT' | 'LB' | 'SLAB_COUNT' | 'NOT_PUBLISHED';
  chickenCapacityUnit?: 'BREAST_COUNT' | 'WHOLE_CHICKEN_COUNT' | 'HALF_CHICKEN_COUNT' | 'LB' | 'NOT_PUBLISHED';
  sourceUrl?: string;
  sourceLabel?: string;
  sourceConfidence: 'OFFICIAL' | 'OFFICIAL_PARTIAL';
};

function row(item: SmokerCatalogSeed): SmokerCatalogSeed {
  if (item.chickenCapacity == null && item.chickenCapacityUnit === 'WHOLE_CHICKEN_COUNT') {
    const match = item.officialCapacityText?.match(/(\d+(?:\.\d+)?)\s+(?:whole\s+)?chickens?/i);
    if (match) {
      return {
        ...item,
        chickenCapacity: Number(match[1]),
        chickenCapacityUnit: 'BREAST_COUNT',
        notes: [item.notes, 'Project conversion: 1 whole chicken = 1 double breast = 2.5 lb and equal smoker space.'].filter(Boolean).join(' ')
      };
    }
  }
  return item;
}

const OLE = 'https://www.olehickorypits.com/products/';
const SOUTHERN = 'https://www.southernpride.com/products/';
const JR = 'https://jrmanufacturing.com/';
const COOKSHACK = 'https://www.cookshack.com/';
const MM = 'https://mmbbqcompany.com/product/';

// Build 6.0.0 catalog policy:
// 1) No estimated capacity numbers.
// 2) Published count fields are loaded directly.
// 3) Project rule: 1 whole chicken = 1 double breast = 2.5 lb and equal smoker space.
// 4) Published whole-chicken counts therefore load as chicken-breast planning counts; pound/range capacities remain reference text only.
export const smokerCatalogSeeds: SmokerCatalogSeed[] = [
  // Ole Hickory Pits. Manufacturer whole-chicken counts convert one-for-one to project double-breast counts.
  row({ brand:'Ole Hickory Pits', model:'EL-ED/X', series:'EL', smokerType:'Rotisserie', fuelType:'Gas + wood', rackCount:12, rackWidthIn:18, rackDepthIn:48, cookingAreaSqIn:10368, brisketCapacity:40, porkCapacity:80, ribCapacity:105, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'40 briskets; 80 Boston butts; 105 ribs; 72 whole chickens', sourceUrl:OLE+'el-edx', sourceLabel:'Ole Hickory EL-ED/X product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Ole Hickory Pits', model:'EL-ED', series:'EL', smokerType:'Rotisserie', fuelType:'Gas + wood', rackCount:18, rackWidthIn:12, rackDepthIn:48, cookingAreaSqIn:10368, brisketCapacity:40, porkCapacity:80, ribCapacity:105, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'40 briskets; 80 Boston butts; 105 ribs; 72 whole chickens', sourceUrl:OLE+'el-ed', sourceLabel:'Ole Hickory EL-ED product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Ole Hickory Pits', model:'EL-EC', series:'EL', smokerType:'Rotisserie', fuelType:'Gas + wood', brisketCapacity:12, porkCapacity:30, ribCapacity:30, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'12 briskets; 30 Boston butts; 30 ribs; 32 whole chickens', sourceUrl:OLE+'el-ec', sourceLabel:'Ole Hickory EL-EC product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Ole Hickory Pits', model:'EL', series:'EL', smokerType:'Rotisserie', fuelType:'Gas + wood', brisketCapacity:20, porkCapacity:40, ribCapacity:60, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'20 briskets; 40 Boston butts; 60 ribs; 50 whole chickens', sourceUrl:OLE+'el', sourceLabel:'Ole Hickory EL product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Ole Hickory Pits', model:'EL-IB', series:'EL', smokerType:'Rotisserie', fuelType:'Gas + wood', brisketCapacity:20, porkCapacity:40, ribCapacity:60, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'20 briskets; 40 Boston butts; 60 ribs; 60 whole chickens', sourceUrl:OLE+'el-ib', sourceLabel:'Ole Hickory EL-IB product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Ole Hickory Pits', model:'EL-EW', series:'EL', smokerType:'Rotisserie', fuelType:'Gas + wood', brisketCapacity:20, porkCapacity:50, ribCapacity:60, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'20 briskets; 50 Boston butts; 60 ribs; 70 whole chickens', sourceUrl:OLE+'el-ew', sourceLabel:'Ole Hickory EL-EW product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Ole Hickory Pits', model:'SSL', series:'SS', smokerType:'Rotisserie', fuelType:'Gas + wood', brisketCapacity:20, porkCapacity:50, ribCapacity:60, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'20 briskets; 50 Boston butts; 60 ribs; 70 whole chickens', sourceUrl:OLE+'ssl', sourceLabel:'Ole Hickory SSL product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Ole Hickory Pits', model:'SSE', series:'SS', smokerType:'Rotisserie', fuelType:'Gas + wood', brisketCapacity:30, porkCapacity:60, ribCapacity:90, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'30 briskets; 60 Boston butts; 90 ribs; 90 whole chickens', sourceUrl:OLE+'sse', sourceLabel:'Ole Hickory SSE product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Ole Hickory Pits', model:'SSJ-AE', series:'SSJ', smokerType:'Large rotisserie', fuelType:'Gas + wood', brisketCapacity:60, porkCapacity:120, ribCapacity:150, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'60 briskets; 120 Boston butts; 150 ribs; 105 whole chickens', sourceUrl:OLE+'ssj-ae', sourceLabel:'Ole Hickory SSJ-AE product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Ole Hickory Pits', model:'SSJ', series:'SSJ', smokerType:'Large rotisserie', fuelType:'Gas + wood', brisketCapacity:74, porkCapacity:150, ribCapacity:175, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'74 briskets; 150 Boston butts; 175 ribs; 120 whole chickens', sourceUrl:OLE+'ssj', sourceLabel:'Ole Hickory SSJ product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Ole Hickory Pits', model:'CTO', series:'CTO', smokerType:'Cabinet', fuelType:'Gas + wood', brisketCapacity:12, porkCapacity:24, ribCapacity:24, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'12 briskets; 24 Boston butts; 24 ribs; 48 whole chickens', sourceUrl:OLE+'cto', sourceLabel:'Ole Hickory CTO product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Ole Hickory Pits', model:'CTO-DW', series:'CTO', smokerType:'Cabinet', fuelType:'Gas + wood', cookingAreaSqIn:5760, brisketCapacity:30, porkCapacity:60, ribCapacity:48, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'30 briskets; 60 Boston butts; 48 ribs; 96 whole chickens', sourceUrl:OLE+'cto-dw', sourceLabel:'Ole Hickory CTO-DW product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Ole Hickory Pits', model:'CTO-TQ', series:'CTO', smokerType:'Cabinet', fuelType:'Gas + wood', brisketCapacity:9, porkCapacity:18, ribCapacity:18, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'9 briskets; 18 Boston butts; 18 ribs; 36 whole chickens', sourceUrl:OLE+'cto-tq', sourceLabel:'Ole Hickory CTO-TQ product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Ole Hickory Pits', model:'ACE-BP', series:'ACE', smokerType:'Cabinet', fuelType:'Gas + wood', brisketCapacity:9, porkCapacity:18, ribCapacity:18, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'9 briskets; 18 Boston butts; 18 ribs; 36 whole chickens', sourceUrl:OLE+'ace-bp', sourceLabel:'Ole Hickory ACE-BP product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Ole Hickory Pits', model:'ACE-JW', series:'ACE', smokerType:'Cabinet', fuelType:'Gas + wood', brisketCapacity:4, porkCapacity:12, ribCapacity:18, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'4 briskets; 12 Boston butts; 18 ribs; 18 whole chickens', sourceUrl:OLE+'ace-jw', sourceLabel:'Ole Hickory ACE-JW product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Ole Hickory Pits', model:'Ultra Que', series:'Small cabinet', smokerType:'Cabinet', fuelType:'Gas + wood', brisketCapacity:4, porkCapacity:12, ribCapacity:18, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'4 briskets; 12 Boston butts; 18 ribs; 18 whole chickens', sourceUrl:OLE+'ultra-que', sourceLabel:'Ole Hickory Ultra Que product page', sourceConfidence:'OFFICIAL' }),

  // Southern Pride. Manufacturer whole-chicken counts convert one-for-one to project double-breast counts.
  row({ brand:'Southern Pride', model:'SC-100', series:'SC', smokerType:'Cabinet', fuelType:'Gas + wood', brisketCapacity:4, porkCapacity:12, ribCapacity:12, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'4 briskets; 12 pork butts; 12 St. Louis ribs; 24 whole chickens', sourceUrl:SOUTHERN+'sc-100', sourceLabel:'Southern Pride SC-100 product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Southern Pride', model:'SC-300', series:'SC', smokerType:'Cabinet', fuelType:'Gas + wood', brisketCapacity:10, porkCapacity:30, ribCapacity:25, chickenCapacity:null, officialCapacityText:'10 briskets; 30 pork butts; 25 St. Louis ribs', sourceUrl:SOUTHERN+'sc-300', sourceLabel:'Southern Pride SC-300 product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Southern Pride', model:'MLR-150', series:'MLR', smokerType:'Mobile rotisserie', fuelType:'Gas + wood', rackCount:12, brisketCapacity:8, porkCapacity:24, ribCapacity:24, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'12 racks; 24 pork butts; 24 St. Louis ribs; 32 whole chickens; 8 beef briskets', sourceUrl:SOUTHERN+'mlr-150', sourceLabel:'Southern Pride MLR-150 product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Southern Pride', model:'SPX-300', series:'SPX', smokerType:'Mobile rotisserie', fuelType:'Gas + wood', rackCount:12, brisketCapacity:8, porkCapacity:32, ribCapacity:24, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'12 racks; 32 pork butts; 24 St. Louis ribs; 40 whole chickens; 8 beef briskets', sourceUrl:SOUTHERN+'spx-300', sourceLabel:'Southern Pride SPX-300 product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Southern Pride', model:'SRG-400', series:'SRG', smokerType:'Rotisserie', fuelType:'Gas + wood', brisketCapacity:18, porkCapacity:42, ribCapacity:70, chickenCapacity:null, officialCapacityText:'18 briskets; 42 pork butts; 70 St. Louis ribs', sourceUrl:SOUTHERN+'srg-400', sourceLabel:'Southern Pride SRG-400 product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Southern Pride', model:'SPK-500', series:'SPK', smokerType:'Mobile / fixed rotisserie', fuelType:'Gas + wood', rackCount:15, brisketCapacity:20, porkCapacity:60, ribCapacity:60, chickenCapacity:70, chickenCapacityUnit:'BREAST_COUNT', officialCapacityText:'15 racks; 20 briskets; 60 pork butts; 60 St. Louis ribs; 70 whole chickens', notes:'Project conversion: 70 whole chickens = 70 double breasts at 2.5 lb each and equal smoker space.', sourceUrl:SOUTHERN+'spk-500', sourceLabel:'Southern Pride SPK-500 product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Southern Pride', model:'SP-700', series:'SP', smokerType:'Rotisserie', fuelType:'Gas + wood', rackCount:18, brisketCapacity:24, porkCapacity:84, ribCapacity:72, chickenCapacity:null, officialCapacityText:'18 racks; 24 briskets; 84 pork butts; 72 St. Louis ribs', sourceUrl:SOUTHERN+'sp-700', sourceLabel:'Southern Pride SP-700 product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Southern Pride', model:'SRG-800', series:'SRG', smokerType:'Rotisserie', fuelType:'Gas + wood', brisketCapacity:24, porkCapacity:72, ribCapacity:60, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'24 briskets; 72 pork butts; 60 St. Louis ribs; 96 whole chickens', sourceUrl:SOUTHERN+'srg-800', sourceLabel:'Southern Pride SRG-800 product page', sourceConfidence:'OFFICIAL' }),
  row({ brand:'Southern Pride', model:'SPK-1400', series:'SPK', smokerType:'Large rotisserie', fuelType:'Gas + wood', brisketCapacity:36, porkCapacity:108, ribCapacity:120, chickenCapacity:null, officialCapacityText:'36 briskets; 108 pork butts; 120 St. Louis ribs', sourceUrl:SOUTHERN+'spk-1400', sourceLabel:'Southern Pride SPK-1400 product page', sourceConfidence:'OFFICIAL' }),

  // J&R. Pound/range/half-chicken capacities are not loaded as planning counts.
  row({ brand:'J&R Manufacturing', model:'Little Red Smokehouse 250 FSE', series:'250', smokerType:'Fixed rack wood-fired', fuelType:'Wood + electric assist', rackCount:10, rackWidthIn:28, rackDepthIn:20.5, brisketCapacity:null, brisketCapacityUnit:'RANGE', porkCapacity:null, ribCapacity:50, ribCapacityUnit:'SLAB_COUNT', chickenCapacity:null, chickenCapacityUnit:'HALF_CHICKEN_COUNT', officialCapacityText:'250 lb total capacity; 10-15 briskets; 90 back-rib slabs; 50 spare-rib slabs; 150 chicken halves', sourceUrl:JR+'little-red-smokehouse-250-fse/', sourceLabel:'J&R Little Red Smokehouse 250 FSE product page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'J&R Manufacturing', model:'Smoke-Master 250 RFS', series:'250', smokerType:'Fixed rack wood-fired', fuelType:'Wood', rackCount:7, brisketCapacity:null, porkCapacity:null, ribCapacity:null, chickenCapacity:null, officialCapacityText:'up to 600 lb total capacity', sourceUrl:JR+'smoke-master-250-rfs/', sourceLabel:'J&R Smoke-Master 250 RFS product page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'J&R Manufacturing', model:'Oyler 700', series:'Oyler', smokerType:'Wood-fired rotisserie', fuelType:'Wood', rackCount:18, brisketCapacity:null, porkCapacity:null, ribCapacity:null, chickenCapacity:null, officialCapacityText:'up to 1000 lb protein', sourceUrl:JR+'oyler-700-smoker/', sourceLabel:'J&R Oyler 700 product page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'J&R Manufacturing', model:'Oyler 700E', series:'Oyler', smokerType:'Wood-fired rotisserie + electric assist', fuelType:'Wood + electric', rackCount:18, brisketCapacity:null, porkCapacity:null, ribCapacity:null, chickenCapacity:null, officialCapacityText:'up to 1000 lb protein', sourceUrl:JR+'oyler-700e-smoker/', sourceLabel:'J&R Oyler 700E product page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'J&R Manufacturing', model:'Oyler 1300', series:'Oyler', smokerType:'Wood-fired rotisserie', fuelType:'Wood', rackCount:18, brisketCapacity:null, porkCapacity:null, ribCapacity:null, chickenCapacity:null, officialCapacityText:'up to 2000 lb protein', sourceUrl:JR+'oyler-1300-smoker/', sourceLabel:'J&R Oyler 1300 product page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'J&R Manufacturing', model:'Oyler 1300E', series:'Oyler', smokerType:'Wood-fired rotisserie + electric assist', fuelType:'Wood + electric', rackCount:18, brisketCapacity:null, porkCapacity:null, ribCapacity:null, chickenCapacity:null, officialCapacityText:'up to 2000 lb protein', sourceUrl:JR+'oyler-1300e-smoker/', sourceLabel:'J&R Oyler 1300E product page', sourceConfidence:'OFFICIAL_PARTIAL' }),

  // Cookshack. Pound capacities remain reference-only; whole-chicken counts convert one-for-one to project double-breast counts.
  row({ brand:'Cookshack', model:'SM160', series:'SmartSmoker', smokerType:'Electric cabinet', fuelType:'Electric + wood chunks', rackCount:5, rackWidthIn:18, rackDepthIn:18, cookingAreaSqIn:1620, brisketCapacity:null, brisketCapacityUnit:'LB', porkCapacity:null, porkCapacityUnit:'LB', ribCapacity:null, ribCapacityUnit:'LB', chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'120 lb pork butts; 100 lb brisket; 50 lb ribs; 20 whole chickens', sourceUrl:COOKSHACK+'smoker-oven-model-160-stainless-steel.html', sourceLabel:'Cookshack SM160 product page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'Cookshack', model:'SM260', series:'SmartSmoker', smokerType:'Electric cabinet', fuelType:'Electric + wood chunks', rackCount:6, brisketCapacity:null, brisketCapacityUnit:'LB', porkCapacity:null, porkCapacityUnit:'LB', ribCapacity:null, ribCapacityUnit:'LB', chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'240 lb pork butts; 200 lb brisket; 100 lb ribs; 40 whole chickens', sourceUrl:COOKSHACK+'smoker-oven-model-260-stainless-steel.html', sourceLabel:'Cookshack SM260 product page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'Cookshack', model:'SM360', series:'SmartSmoker', smokerType:'Electric cabinet', fuelType:'Electric + wood chunks', rackCount:28, brisketCapacity:null, brisketCapacityUnit:'LB', porkCapacity:null, porkCapacityUnit:'LB', ribCapacity:null, ribCapacityUnit:'LB', chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'550 lb pork butts; 500 lb brisket; 270 lb ribs; 100 whole chickens', sourceUrl:COOKSHACK+'smoker-oven-model-360-stainless-steel.html', sourceLabel:'Cookshack SM360 product page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'Cookshack', model:'FEC100', series:'Fast Eddy', smokerType:'Pellet fixed shelf', fuelType:'Pellet', rackCount:4, brisketCapacity:null, brisketCapacityUnit:'LB', porkCapacity:null, porkCapacityUnit:'LB', ribCapacity:null, ribCapacityUnit:'LB', chickenCapacity:null, officialCapacityText:'manufacturer publishes capacity in pounds/load', sourceUrl:COOKSHACK+'fast-eddys-by-cookshack-model-fec100.html', sourceLabel:'Cookshack FEC100 product page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'Cookshack', model:'FEC120', series:'Fast Eddy', smokerType:'Pellet fixed shelf', fuelType:'Pellet', rackCount:5, brisketCapacity:null, brisketCapacityUnit:'LB', porkCapacity:null, porkCapacityUnit:'LB', ribCapacity:null, ribCapacityUnit:'LB', chickenCapacity:null, officialCapacityText:'manufacturer publishes capacity in pounds/load', sourceUrl:COOKSHACK+'fast-eddys-by-cookshack-model-fec120.html', sourceLabel:'Cookshack FEC120 product page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'Cookshack', model:'FEC240', series:'Fast Eddy', smokerType:'Pellet fixed shelf', fuelType:'Pellet', rackCount:8, brisketCapacity:null, brisketCapacityUnit:'LB', porkCapacity:null, porkCapacityUnit:'LB', ribCapacity:null, ribCapacityUnit:'LB', chickenCapacity:null, officialCapacityText:'manufacturer publishes capacity in pounds/load', sourceUrl:COOKSHACK+'fast-eddys-model-fec240.html', sourceLabel:'Cookshack FEC240 product page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'Cookshack', model:'FEC300-18', series:'Fast Eddy', smokerType:'Pellet rotisserie', fuelType:'Pellet', rackCount:12, brisketCapacity:null, brisketCapacityUnit:'LB', porkCapacity:null, porkCapacityUnit:'LB', ribCapacity:null, ribCapacityUnit:'LB', chickenCapacity:null, officialCapacityText:'manufacturer publishes capacity in pounds/load', sourceUrl:COOKSHACK+'fast-eddys-by-cookshack-model-300-18.html', sourceLabel:'Cookshack FEC300-18 product page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'Cookshack', model:'FEC500', series:'Fast Eddy', smokerType:'Pellet rotisserie', fuelType:'Pellet', rackCount:15, brisketCapacity:null, brisketCapacityUnit:'LB', porkCapacity:null, porkCapacityUnit:'LB', ribCapacity:null, ribCapacityUnit:'LB', chickenCapacity:null, officialCapacityText:'manufacturer publishes capacity in pounds/load', sourceUrl:COOKSHACK+'fast-eddy-model-fec500-stainless-steel.html', sourceLabel:'Cookshack FEC500 product page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'Cookshack', model:'FEC750', series:'Fast Eddy', smokerType:'Pellet rotisserie', fuelType:'Pellet', rackCount:15, brisketCapacity:null, brisketCapacityUnit:'LB', porkCapacity:null, porkCapacityUnit:'LB', ribCapacity:null, ribCapacityUnit:'LB', chickenCapacity:null, officialCapacityText:'manufacturer publishes capacity in pounds/load', sourceUrl:COOKSHACK+'fast-eddy-model-750-stainless-steel.html', sourceLabel:'Cookshack FEC750 product page', sourceConfidence:'OFFICIAL_PARTIAL' }),

  // M&M. Only direct manufacturer-published counts remain in unit count fields.
  row({ brand:'M&M BBQ Company', model:'MM1000', series:'Commercial Grade', smokerType:'Rotisserie', fuelType:'Wood-fired', rackCount:18, rackWidthIn:47, rackDepthIn:17, brisketCapacity:null, porkCapacity:null, ribCapacity:null, chickenCapacity:null, officialCapacityText:'18 racks; 47 x 17 in.; 12 racks included', sourceUrl:MM+'mm1000/', sourceLabel:'M&M MM1000 product page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'M&M BBQ Company', model:'OS500', series:'Offset Series', smokerType:'Offset', fuelType:'Wood-fired', rackCount:3, brisketCapacity:null, porkCapacity:null, ribCapacity:null, chickenCapacity:null, officialCapacityText:'3 stainless steel racks', sourceUrl:MM+'os500/', sourceLabel:'M&M OS500 product page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'M&M BBQ Company', model:'OS1000', series:'Offset Series', smokerType:'Offset', fuelType:'Wood-fired', rackCount:4, brisketCapacity:null, porkCapacity:null, ribCapacity:null, chickenCapacity:null, officialCapacityText:'4 stainless steel racks', sourceUrl:MM+'os1000/', sourceLabel:'M&M OS1000 product page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'M&M BBQ Company', model:'Texas Smoke King Series', series:'Texas Smoke King', smokerType:'Offset', fuelType:'Wood-fired', brisketCapacity:7, porkCapacity:null, ribCapacity:null, chickenCapacity:null, officialCapacityText:'up to 7 full briskets', sourceUrl:MM+'texas-smoke-king/', sourceLabel:'M&M Texas Smoke King product page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'M&M BBQ Company', model:"Goldee's Backyard Offset", series:"Goldee's", smokerType:'Offset', fuelType:'Wood-fired', brisketCapacity:6, porkCapacity:null, ribCapacity:9, chickenCapacity:null, chickenCapacityUnit:'WHOLE_CHICKEN_COUNT', officialCapacityText:'6 briskets; 9 ribs; 15 chickens; 15 turkey breasts; 40 sausages', sourceUrl:MM+'goldees-backyard-offset/', sourceLabel:"M&M Goldee's Backyard Offset product page", sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'M&M BBQ Company', model:'El Rey Woodfire Grill', series:'Live Fire', smokerType:'Woodfire grill', fuelType:'Wood-fired', brisketCapacity:null, porkCapacity:null, ribCapacity:null, chickenCapacity:null, officialCapacityText:'live-fire grill; smoker production capacities not published', sourceUrl:'https://mmbbqcompany.com/our-products/', sourceLabel:'M&M product family page', sourceConfidence:'OFFICIAL_PARTIAL' }),
  row({ brand:'M&M BBQ Company', model:'The War Chest Direct Heat Cooker', series:'Live Fire', smokerType:'Direct heat cooker', fuelType:'Wood/charcoal', brisketCapacity:null, porkCapacity:null, ribCapacity:null, chickenCapacity:null, officialCapacityText:'direct heat cooker; smoker production capacities not published', sourceUrl:'https://mmbbqcompany.com/our-products/', sourceLabel:'M&M product family page', sourceConfidence:'OFFICIAL_PARTIAL' })
];

export async function ensureSmokerCatalog(prisma: any) {
  const verifiedKeys = smokerCatalogSeeds.map((item) => `${item.brand}|||${item.model}`);
  const existing = await prisma.smokerCatalog.findMany({ select: { id: true, brand: true, model: true } });
  const obsoleteIds = existing.filter((item: any) => !verifiedKeys.includes(`${item.brand}|||${item.model}`)).map((item: any) => item.id);
  if (obsoleteIds.length) {
    await prisma.smokerCatalog.updateMany({ where: { id: { in: obsoleteIds } }, data: { active: false, sourceConfidence: 'RETIRED_UNVERIFIED', notes: 'Retired: prior row was not manufacturer-verified.' } });
  }

  for (const item of smokerCatalogSeeds) {
    const data = {
      series: item.series || null,
      smokerType: item.smokerType,
      fuelType: item.fuelType,
      rackCount: item.rackCount ?? null,
      rackWidthIn: item.rackWidthIn ?? null,
      rackDepthIn: item.rackDepthIn ?? null,
      cookingAreaSqIn: item.cookingAreaSqIn ?? null,
      brisketCapacity: item.brisketCapacity ?? null,
      porkCapacity: item.porkCapacity ?? null,
      ribCapacity: item.ribCapacity ?? null,
      chickenCapacity: item.chickenCapacity ?? null,
      cookWindow: item.cookWindow || null,
      notes: item.notes || null,
      officialCapacityText: item.officialCapacityText || null,
      brisketCapacityUnit: item.brisketCapacityUnit || (item.brisketCapacity != null ? 'COUNT' : null),
      porkCapacityUnit: item.porkCapacityUnit || (item.porkCapacity != null ? 'COUNT' : null),
      ribCapacityUnit: item.ribCapacityUnit || (item.ribCapacity != null ? 'SLAB_COUNT' : null),
      chickenCapacityUnit: item.chickenCapacityUnit || (item.chickenCapacity != null ? 'BREAST_COUNT' : null),
      sourceUrl: item.sourceUrl || null,
      sourceLabel: item.sourceLabel || null,
      sourceConfidence: item.sourceConfidence,
      active: true
    };
    await prisma.smokerCatalog.upsert({
      where: { brand_model: { brand: item.brand, model: item.model } },
      update: data,
      create: { brand: item.brand, model: item.model, ...data }
    });
  }
}
