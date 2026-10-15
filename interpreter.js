// Explicit artistic rules—not a trained language model.
const Interpreter = (() => {
    // Name, structure, hue, spread, complexity, flow,
    // curvature, swirl, synonyms.
    const rows = [
        ['ocean', 'ribbons', 220, 60, 8, 7, 8, .4,
            'sea water waves'],

        ['fire', 'flames', 25, 40, 7, 7, 8, .2,
            'flame flames burning heat'],

        ['lava', 'lava', 15, 35, 7, 4, 4, .1,
            'magma molten'],

        ['forest', 'branches', 120, 60, 6, 3, 6, .1,
            'tree trees woods'],

        ['jungle', 'branches', 105, 70, 9, 5, 8, .2,
            'rainforest'],

        ['ice', 'crystals', 195, 45, 5, 3, 4, .2,
            'frozen frost snow'],

        ['glacier', 'crystals', 190, 40, 7, 3, 2, .3,
            'glacial'],

        ['planet', 'orbits', 160, 100, 7, 4, 5, .8,
            'world worlds planets'],

        ['space', 'orbits', 250, 110, 8, 6, 6, .7,
            'cosmos cosmic galaxy stars'],

        ['basketball', 'orbits', 30, 20, 8, 6, 4, 1,
            'ball'],

        ['lightning', 'lightning', 215, 40, 9, 8, 7, .2,
            'electric electricity thunder'],

        ['storm', 'lightning', 210, 65, 9, 8, 9, .5,
            'tempest stormy'],

        ['hurricane', 'orbits', 215, 60, 10, 9, 8, .9,
            'cyclone tornado'],

        ['whirlpool', 'orbits', 185, 55, 9, 8, 7, .9,
            'vortex'],

        ['waterfall', 'ribbons', 200, 40, 8, 3, 5, .2,
            'cascade'],

        ['mist', 'ribbons', 180, 25, 3, 2, 2, .1,
            'fog haze'],

        ['sunset', 'ribbons', 25, 70, 6, 4, 6, .2,
            'dusk dawn'],

        ['desert', 'ribbons', 40, 35, 5, 3, 3, .1,
            'sand dunes'],

        ['volcano', 'lava', 15, 45, 9, 6, 7, .2,
            'eruption volcanic'],

        ['music', 'ribbons', 270, 150, 8, 7, 8, .4,
            'melody rhythm song']
    ];

    function interpret(text) {
        const words = text.toLowerCase().match(/[a-z]+/g) || [];

        // Recognize up to three concepts.
        const matches = rows.filter(row => {
            const vocabulary = [row[0], ...row[8].split(' ')];
            return vocabulary.some(word => words.includes(word));
        }).slice(0, 3);

        const primary = matches[0] || [
            'abstract', 'ribbons', 230, 100, 7, 5, 7, .4
        ];

        const [
            concept, structure, baseHue, hueSpread,
            complexity, flow, curvature, swirl
        ] = primary;

        const settings = {
            concept, structure, baseHue, hueSpread,
            complexity, flow, curvature, swirl,
            saturation: 80,
            glow: 1,
            variation: .85
        };

        const has = list =>
            list.some(word => words.includes(word));

        if (has(['calm', 'quiet', 'gentle', 'peaceful'])) {
            settings.complexity = 3;
            settings.curvature = 3;
            settings.flow = 2;
            settings.glow = .6;
        }

        if (has(['wild', 'violent', 'chaotic', 'explosive'])) {
            settings.complexity = 10;
            settings.curvature = 10;
            settings.flow = 9;
            settings.glow = 1.4;
        }

        if (has(['dark', 'night', 'shadow'])) {
            settings.glow = .35;
            settings.saturation = 60;
        }

        if (has(['bright', 'luminous', 'glowing'])) {
            settings.glow = 1.8;
        }

        const colors = {
            red: 5,
            orange: 30,
            yellow: 55,
            green: 120,
            cyan: 180,
            blue: 215,
            purple: 275,
            pink: 325
        };

        const explicitColor = words.find(word =>
            Object.hasOwn(colors, word)
        );

        if (explicitColor) {
            settings.baseHue = colors[explicitColor];
        }

        // Each recognized concept contributes a drawing layer.
        const layers = matches.map((item, index) => ({
            structure: item[1],

            // Shortest signed distance around the hue circle.
            hueShift: explicitColor
                ? 0
                : ((item[2] - settings.baseHue + 540) % 360) - 180,

            opacity: index === 0 ? 1 : .65
        }));

        if (!layers.length) {
            layers.push({
                structure: 'ribbons',
                hueShift: 0,
                opacity: 1
            });
        }

        // Supporting detail for selected single-concept scenes.
        if (
            layers.length === 1 &&
            ['fire', 'forest', 'space', 'music'].includes(concept)
        ) {
            layers.push({
                structure: 'particles',
                hueShift: 15,
                opacity: .55
            });
        }

        if (has(['sparkling', 'sparkles', 'embers'])) {
            layers.push({
                structure: 'particles',
                hueShift: 15,
                opacity: .6
            });
        }

        return {
            settings,
            layers: layers.slice(0, 3),
            matched: matches.map(item => item[0]),
            note: matches.length
                ? 'Rule-based interpretation'
                : 'No known concept: using abstract fallback'
        };
    }

    return {
        interpret,
        names: rows.map(row => row[0])
    };
})();