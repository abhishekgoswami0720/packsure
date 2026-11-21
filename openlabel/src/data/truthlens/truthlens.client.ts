/**
 * TruthLens Mobile Backend Client
 * Connects the mobile frontend to the Python FastAPI TruthLens intelligence backend.
 */

export const TRUTHLENS_API_BASE = process.env.EXPO_PUBLIC_TRUTHLENS_API_URL || 'http://localhost:8000';

export interface TruthScoreResult {
  score: number;
  grade: string;
  rationale: string[];
}

export interface NovaResult {
  group: 1 | 2 | 3 | 4;
  title: string;
  reasons: string[];
}

export interface TrafficLightItem {
  value: number;
  unit: string;
  status: 'green' | 'amber' | 'red';
  threshold_rule: string;
}

export interface ClaimVerdict {
  claim: string;
  status: 'verified_authentic' | 'verified_inconsistency' | 'potential_inconsistency';
  explanation: string;
  evidence: string;
}

export interface TruthLensProduct {
  id: string;
  barcode?: string;
  name: string;
  brand: string;
  category: string;
  image_url?: string;
  ingredients_text: string;
  nutrition_per_100g: Record<string, number>;
  truth_score: TruthScoreResult;
  nova: NovaResult;
  traffic_lights: Record<string, TrafficLightItem>;
  additives: Array<{
    ins: string;
    name: string;
    class: string;
    safety_rating: string;
    description: string;
    abroad_status?: Record<string, any>;
  }>;
  hidden_sugars: Array<{
    name: string;
    gi: number;
    type: string;
  }>;
  industrial_fats: Array<{
    name: string;
    type: string;
    trans_fat_risk: boolean;
  }>;
  claim_verdicts: ClaimVerdict[];
  compliance: {
    verdict: string;
    score: number;
    mandatory_fields_present: string[];
    violations: Array<{ rule: string; issue: string; penalty: string }>;
  };
}

export async function lookupBarcode(barcode: string): Promise<TruthLensProduct | null> {
  const code = barcode.trim();
  if (!code) return null;
  try {
    const res = await fetch(`${TRUTHLENS_API_BASE}/api/truth/barcode/${encodeURIComponent(code)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[TruthLens] Barcode lookup failed:', err);
    return null;
  }
}

export async function searchCatalogue(q: string = '', category: string = ''): Promise<TruthLensProduct[]> {
  try {
    const url = new URL(`${TRUTHLENS_API_BASE}/api/truth/search`);
    if (q) url.searchParams.set('q', q);
    if (category) url.searchParams.set('category', category);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[TruthLens] Search failed:', err);
    return [];
  }
}

export async function getCleanAlternatives(productId: string, category: string = '') {
  try {
    const res = await fetch(`${TRUTHLENS_API_BASE}/api/truth/alternatives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, category }),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[TruthLens] Alternatives lookup failed:', err);
    return { recommendations: [] };
  }
}

export async function askVoiceAssistant(query: string, productContext?: any): Promise<string> {
  try {
    const res = await fetch(`${TRUTHLENS_API_BASE}/api/truth/voice-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, product_context: productContext }),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data.answer || 'No response generated.';
  } catch (err) {
    console.warn('[TruthLens] Voice Assistant failed:', err);
    return 'Could not connect to TruthLens Voice Assistant.';
  }
}
