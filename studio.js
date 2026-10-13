'use strict';
const $ = id => document.getElementById(id);
const specs = [
    ['complexity', 'Complexity', 1, 10, 1, 7],
    ['flow', 'Field frequency', 1, 10, 1, 5],
    ['curvature', 'Curvature / spread', 1, 10, 1, 7],
    ['baseHue', 'Hue', 0, 360, 1, 200],
    ['hueSpread', 'Color spread', 0, 180, 1, 60],
    ['swirl', 'Orbit influence', 0, 1, .05, .35],
    ['saturation', 'Saturation', 0, 100, 1, 80],
    ['glow', 'Glow', 0, 2, .05, 1]
];
const descriptions = {
    ribbons: 'Layered noise bends dense bundles of trajectories into luminous currents.',
    flames: 'Coherent turbulence lifts tapered filaments from a source region.',
    branches: 'Recursive segments divide into smaller branches with seeded variation.',
    orbits: 'Parametric ellipses and harmonic perturbations create orbital geometry.',
    crystals: 'Sixfold symmetry organizes nested facets and angular spines.',
    lightning: 'Jagged paths fracture into smaller branching bolts.'
};
let dataset = [], matchedConcept = 'ocean', busy = false, renderTicket = 0;
for (const [id, label, min, max, step, value] of specs) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<label class="slider-label" for="${id}">${label}<output id="${id}Value">${value}</output></label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}">`;
    $('sliders').appendChild(wrapper);
    $(id).addEventListener('input', () => {
        $(id + 'Value').textContent = $(id).value;
        scheduleRender();
    });
}
function readRecipe() {
    const recipe = {structure: $('structure').value, seed: Number($('seed').value) || 0};
    for (const [id] of specs) recipe[id] = Number($(id).value);
    return recipe;
}
function applySettings(settings) {
    for (const [id, , , , , fallback] of specs) {
        $(id).value = settings[id] ?? fallback;
        $(id + 'Value').textContent = $(id).value;
    }
    const mode = {flow: 'ribbons', waves: 'ribbons', rising: 'flames'}[settings.structure] || settings.structure;
    $('structure').value = descriptions[mode] ? mode : 'ribbons';
    matchedConcept = settings.concept || 'custom';
}
function scheduleRender() {
    cancelAnimationFrame(renderTicket);
    $('renderStatus').textContent = 'DRAWING';
    renderTicket = requestAnimationFrame(() => {
        const started = performance.now();
        ArtEngine.draw($('art'), readRecipe());
        $('renderStatus').textContent = `${Math.round(performance.now() - started)} MS`;
        $('artTitle').textContent = `${matchedConcept.toUpperCase()} / ${$('structure').selectedOptions[0].text.toUpperCase()}`;
        $('structureDescription').textContent = descriptions[$('structure').value];
    });
}
async function generateFromConcept() {
    if (busy) return;
    const text = $('concept').value.trim();
    if (!text) { $('conceptStatus').textContent = 'Enter a concept first.'; return; }
    busy = true; $('draw').disabled = true; $('examples').disabled = true;
    $('conceptStatus').textContent = 'Finding a semantic interpretation…';
    try {
        const response = await fetch('/interpret', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text}), signal: AbortSignal.timeout(60000)
        });
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const result = await response.json();
        applySettings(result.settings);
        scheduleRender();
        $('conceptStatus').textContent = `“${text}” → ${result.settings.concept} · similarity ${result.similarity.toFixed(3)} · reference settings`;
    } catch (error) {
        console.error(error);
        // Exact local examples remain useful if the semantic service is down.
        const exact = dataset.find(item => item.concept === text.toLowerCase());
        if (exact) {
            applySettings(exact); scheduleRender();
            $('conceptStatus').textContent = `Local example: ${exact.concept}. Semantic API unavailable.`;
        } else $('conceptStatus').textContent = 'Could not reach the semantic API. Check the Python terminal and try again.';
    } finally { busy = false; $('draw').disabled = false; $('examples').disabled = false; }
}
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('conceptForm').addEventListener('submit', event => {event.preventDefault(); generateFromConcept();});
$('examples').addEventListener('change', () => {
    const example = dataset.find(item => item.concept === $('examples').value);
    if (!example) return;
    // An exact example already has labels; no model request is needed.
    $('concept').value = example.concept;
    applySettings(example); scheduleRender();
    $('conceptStatus').textContent = `Exploring your labeled example: ${example.concept}.`;
});
$('structure').addEventListener('change', scheduleRender);
$('seed').addEventListener('change', scheduleRender);
$('random').addEventListener('click', () => {
    const bytes = new Uint32Array(1); crypto.getRandomValues(bytes);
    $('seed').value = bytes[0]; scheduleRender();
});
$('save').addEventListener('click', () => {
    // Flush pending edits before exporting.
    cancelAnimationFrame(renderTicket); ArtEngine.draw($('art'), readRecipe());
    $('art').toBlob(blob => {if (blob) downloadBlob(blob, `synesthesia-${matchedConcept}-${readRecipe().seed}.png`);});
});
$('recipe').addEventListener('click', () => {
    const recipe = {engineVersion: ArtEngine.version, prompt: $('concept').value, ...readRecipe()};
    downloadBlob(new Blob([JSON.stringify(recipe, null, 2)], {type: 'application/json'}), `synesthesia-recipe-${recipe.seed}.json`);
});
async function init() {
    try {
        const response = await fetch('/concepts');
        if (!response.ok) throw new Error('Could not load concepts');
        dataset = await response.json();
        for (const example of dataset) {
            const option = document.createElement('option');
            option.value = example.concept; option.textContent = example.concept;
            $('examples').appendChild(option);
        }
        applySettings(dataset.find(item => item.concept === 'ocean') || dataset[0]);
        $('conceptStatus').textContent = 'Explore an example, or interpret unfamiliar text with the language model.';
    } catch (error) {
        $('conceptStatus').textContent = 'Open this studio through the Python server at http://127.0.0.1:8000/.';
    }
    scheduleRender();
}
init();
