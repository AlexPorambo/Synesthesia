'use strict';
const $ = id => document.getElementById(id);
let activeLayers = [];
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
    lightning: 'Jagged paths fracture into smaller branching bolts.',
    lava: 'Cooled plates divided by luminous molten channels.',
    particles: 'Fine luminous particles.'
};
let dataset = [], matchedConcept = 'ocean', busy = false, renderTicket = 0;
for (const [id, label, min, max, step, value] of specs) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<label class="slider-label" for="${id}">${label}<output id="${id}Value">${value}</output></label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}">`;
    $('sliders').appendChild(wrapper);
    $(id).addEventListener('input', () => {
        $(id + 'Value').textContent = $(id).value;
        activeLayers = Array.isArray(recipe.layers)
        ? recipe.layers.slice(0, 3)
        : [];
        scheduleRender();
    });
}
function readRecipe() {
    const recipe = {structure: $('structure').value, seed: Number($('seed').value) || 0};
    for (const [id] of specs) recipe[id] = Number($(id).value);
    recipe.layers = activeLayers;
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
function freshSeed() {
    const bytes = new Uint32Array(1);

    // Avoid immediately repeating the current seed.
    do {
        crypto.getRandomValues(bytes);
    } while (bytes[0] === Number($('seed').value));

    $('seed').value = bytes[0];
}
function generateFromConcept() {
    const text = $('concept').value.trim();

    if (!text) {
        $('conceptStatus').textContent = 'Enter a concept first.';
        return;
    }

    const plan = Interpreter.interpret(text);

    applySettings(plan.settings);
    activeLayers = plan.layers;

    // Works whether or not you added the seed-lock checkbox.
    if (!$('lockSeed')?.checked) {
        freshSeed();
    }

    scheduleRender();

    $('conceptStatus').textContent =
        `${plan.note} · ` +
        `${plan.matched.join(' + ') || 'abstract'} · ` +
        activeLayers.map(layer => layer.structure).join(' + ');
}
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('conceptForm').addEventListener('submit', event => {event.preventDefault(); generateFromConcept();});
$('examples').addEventListener('change', () => {
    if (!$('examples').value) return;

    $('concept').value = $('examples').value;
    generateFromConcept();
});
$('structure').addEventListener('change', () => {
    // Manual structure selection switches to one drawing system.
    activeLayers = [];
    scheduleRender();
});
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
function init() {
    dataset = Interpreter.names.map(name =>
        Interpreter.interpret(name).settings
    );

    for (const name of Interpreter.names) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        $('examples').appendChild(option);
    }

    const plan = Interpreter.interpret('ocean');

    applySettings(plan.settings);
    activeLayers = plan.layers;
    scheduleRender();

    $('conceptStatus').textContent =
        'Try calm ocean, blue fire, lava, or fire and ice.';
}
init();
